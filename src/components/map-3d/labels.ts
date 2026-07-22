// ponytail: MLK — DUN + parlimen labels (sprite-based, canvas texture).
// Implements 3d-map-architecture skill spec (labels layer).
//   - Top-10 DUN labels (sorted by total_voters): red badge.
//   - 6 parlimen labels: amber badge.
//
// Sprites are used (vs CSS2DRenderer) to keep the bundle small — CSS2DRenderer
// adds ~10KB and a second DOM root. Sprites are GPU-rendered, scale with
// distance, and stay readable from any camera angle. They use a small canvas
// texture per label (cached by text+color key).
//
// SSR-safe — Three.js imports happen inside factory functions. The canvas
// texture cache uses the DOM `document` API lazily inside the factory.

import type * as THREE from "three";

export interface LabelSpec {
  text: string;
  /** Position in scene coords (x, y, z). */
  position: [number, number, number];
  /** Badge color hex (e.g. 0xdc2626 for red, 0xc77b2c for amber). */
  colorHex: number;
  /** Optional tooltip / aria-label text (set on userData). */
  ariaLabel?: string;
  /** Optional small caption above the badge (e.g. seat code). */
  caption?: string;
  scale?: number;
}

export interface BuiltLabel {
  sprite: THREE.Sprite;
  spec: LabelSpec;
}

// Canvas texture cache — keyed by `${text}|${colorHex}|${caption}`. Avoids
// re-allocating canvas textures on every morph (which would re-build labels).
const textureCache = new Map<string, THREE.CanvasTexture>();

const LABEL_DUN_COLOR = 0xdc2626; // red-600
const LABEL_PARL_COLOR = 0xc77b2c; // mlk-amber

/** Draws a rounded-rect badge with text onto a canvas, returns the texture. */
function makeBadgeTexture(
  THREE: typeof import("three"),
  text: string,
  colorHex: number,
  caption?: string
): THREE.CanvasTexture {
  const key = `${text}|${colorHex.toString(16)}|${caption ?? ""}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  const padding = 10;
  const captionHeight = caption ? 14 : 0;
  // Pre-measure with a 2D context.
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    // Defensive — should never happen in a browser. Return a 1×1 transparent
    // texture so the caller doesn't crash.
    canvas.width = 1;
    canvas.height = 1;
    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(key, tex);
    return tex;
  }
  const font = "bold 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const captionFont = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx2d.font = font;
  const textWidth = ctx2d.measureText(text).width;
  const captionWidth = caption ? (() => {
    ctx2d.font = captionFont;
    return ctx2d.measureText(caption).width;
  })() : 0;
  const w = Math.ceil(Math.max(textWidth, captionWidth) + padding * 2);
  const h = Math.ceil(28 + captionHeight + padding * 2);
  canvas.width = w;
  canvas.height = h;

  // Re-fetch context (resizing a canvas clears its content + state).
  const ctx = canvas.getContext("2d")!;
  const color = `#${colorHex.toString(16).padStart(6, "0")}`;

  // Background pill (rounded rect).
  const r = 8;
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Main text (white).
  ctx.fillStyle = "#ffffff";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, padding + 14);

  // Caption (lighter, below main text).
  if (caption) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.font = captionFont;
    ctx.fillText(caption, w / 2, padding + 28 + 7);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Builds a single label sprite at the given position with the given color.
 * The sprite scale is derived from the canvas aspect ratio × baseScale.
 */
export function buildLabel(
  THREE: typeof import("three"),
  spec: LabelSpec
): BuiltLabel {
  const texture = makeBadgeTexture(THREE, spec.text, spec.colorHex, spec.caption);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false, // labels always render on top of extrusions
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(spec.position[0], spec.position[1], spec.position[2]);
  // Scale: keep canvas aspect ratio; baseScale defaults to 1 (≈ 12 scene units wide).
  const baseScale = spec.scale ?? 1;
  const image = texture.image as HTMLCanvasElement | undefined;
  const aspect = image && image.width > 0 ? image.width / image.height : 3;
  const w = 12 * baseScale;
  sprite.scale.set(w, w / aspect, 1);
  sprite.userData = {
    kind: "label",
    ariaLabel: spec.ariaLabel ?? spec.text,
  };
  sprite.renderOrder = 999;
  return { sprite, spec };
}

/**
 * Builds the top-N DUN labels (red badges). N defaults to 10 per task spec.
 * `dunSpecs` should be the full 28-DUN list; this function picks the top-N
 * by total_voters and positions each label slightly above the DUN extrusion.
 */
export function buildDunLabels(
  THREE: typeof import("three"),
  builtExtrusions: Array<{
    spec: { parliamentCode: string; dunCode: string; dunName: string; totalVoters: number; centroid: [number, number]; renamed?: boolean };
    currentHeight: number;
  }>,
  topN = 10
): BuiltLabel[] {
  const top = [...builtExtrusions]
    .sort((a, b) => b.spec.totalVoters - a.spec.totalVoters)
    .slice(0, topN);
  return top.map((b) => {
    const caption = `N${b.spec.dunCode} · ${b.spec.totalVoters.toLocaleString()} voters`;
    const ariaLabel = `DUN ${b.spec.dunName} (N${b.spec.dunCode}) · ${b.spec.totalVoters.toLocaleString()} voters${
      b.spec.renamed ? " · renamed in 2023 redelineation" : ""
    }`;
    return buildLabel(THREE, {
      text: b.spec.dunName,
      colorHex: LABEL_DUN_COLOR,
      caption,
      ariaLabel,
      position: [b.spec.centroid[0], b.currentHeight + 4, b.spec.centroid[1]],
      scale: 0.85,
    });
  });
}

/**
 * Builds the 6 parlimen labels (amber badges). Each label sits at the
 * parliament's centroid, slightly above the DUN extrusions.
 */
export function buildParlimenLabels(
  THREE: typeof import("three"),
  parlimenOutlines: Array<{
    parliamentCode: string;
    parliamentName: string;
    centroid: [number, number];
    winner?: string;
  }>,
  maxDunHeight: number
): BuiltLabel[] {
  return parlimenOutlines.map((p) => {
    const caption = `P${p.parliamentCode}${p.winner ? ` · ${p.winner}` : ""}`;
    return buildLabel(THREE, {
      text: p.parliamentName,
      colorHex: LABEL_PARL_COLOR,
      caption,
      ariaLabel: `Parliament P${p.parliamentCode} ${p.parliamentName}${p.winner ? ` — ${p.winner} won` : ""}`,
      position: [p.centroid[0], maxDunHeight + 8, p.centroid[1]],
      scale: 1.1,
    });
  });
}

/** Clears the texture cache (called on component unmount to free GPU memory). */
export function clearLabelTextureCache(): void {
  for (const tex of textureCache.values()) {
    tex.dispose();
  }
  textureCache.clear();
}

export { LABEL_DUN_COLOR, LABEL_PARL_COLOR };
