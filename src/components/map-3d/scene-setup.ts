// ponytail: MLK — Three.js scene/camera/renderer/lights + OrbitControls factory.
// Implements WORKLOAD.md Phase 3 §3.1 (scene setup) + DESIGN.md §3 row 2.
// Pure factory functions — no module-level Three.js symbols, no `window` access
// at import time. SSR-safe. All Three.js imports happen inside the factory
// functions, which are only called from a `use client` component via
// `next/dynamic` `ssr: false`.
//
// Camera: PerspectiveCamera at [0, 80, 120] looking at origin. OrbitControls
// lazy-loaded from `three/examples/jsm/controls/OrbitControls.js`.
// Renderer: WebGLRenderer(antialias, alpha) + pixelRatio capped at 2.
// Lighting: ambient(0x404040, 0.6) + directional(0xffffff, 0.8) from [100, 100, 50].
// See 3d-map-architecture skill spec.

import type * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three/examples/jsm/controls/OrbitControls.js";

export interface SceneBundle {
  THREE: typeof import("three");
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControlsType | null;
  ambient: THREE.AmbientLight;
  directional: THREE.DirectionalLight;
  /** Disposes the renderer DOM + controls. Idempotent. */
  dispose: () => void;
  /** Resizes the renderer + camera aspect. */
  resize: (width: number, height: number) => void;
}

export interface SceneOptions {
  width: number;
  height: number;
  prefersReducedMotion?: boolean;
}

/**
 * Builds a complete Three.js scene bundle for the 3D map.
 * Caller must call `dispose()` on unmount to free GPU resources.
 */
export async function createScene(opts: SceneOptions): Promise<SceneBundle> {
  const THREE = await import("three");
  const { width, height, prefersReducedMotion = false } = opts;

  // ── Scene ────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  // Background is transparent (alpha:true on renderer) so the dark slate-900
  // container CSS shows through. Fog adds depth for the scatter layer.
  scene.fog = new THREE.Fog(0x0f172a, 200, 600);

  // ── Camera ───────────────────────────────────────────────────────────────
  // PerspectiveCamera at [0, 80, 120] looking at origin — see DESIGN.md §3 row 2.
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
  camera.position.set(0, 80, 120);
  camera.lookAt(0, 0, 0);

  // ── Renderer ─────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  // Cap pixel ratio at 2 — retina screens otherwise render 4× the pixels.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ── Lighting ─────────────────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(100, 100, 50);
  scene.add(directional);

  // ── Controls (lazy-loaded from examples/jsm) ─────────────────────────────
  let controls: SceneBundle["controls"] = null;
  try {
    const OrbitControlsModule = await import(
      "three/examples/jsm/controls/OrbitControls.js"
    );
    const OrbitControls = OrbitControlsModule.OrbitControls;
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !prefersReducedMotion;
    controls.dampingFactor = 0.08;
    controls.minDistance = 40;
    controls.maxDistance = 400;
    controls.maxPolarAngle = Math.PI * 0.48; // don't go below the floor
    controls.target.set(0, 0, 0);
  } catch (err) {
    // Defensive — if the controls chunk fails to load, the camera is still
    // usable in its default position. Surfaced in console per AGENT.md §3
    // (errors must be surfaced, not swallowed).
    console.error("[map-3d] OrbitControls failed to load:", err);
  }

  // ── Resize + dispose helpers ─────────────────────────────────────────────
  const resize = (w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  };

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    controls?.dispose();
    renderer.dispose();
    // Drop the WebGL context (frees GPU memory on hot-reload).
    const gl = renderer.getContext() as WebGLRenderingContext | null;
    if (gl && "getExtension" in gl) {
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext?.();
    }
    // Remove the canvas from the DOM (the consumer appends it).
    const canvas = renderer.domElement;
    canvas?.parentNode?.removeChild(canvas);
  };

  return { THREE, scene, camera, renderer, controls, ambient, directional, dispose, resize };
}
