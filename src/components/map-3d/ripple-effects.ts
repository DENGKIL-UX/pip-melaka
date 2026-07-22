// ponytail: MLK — Ripple effects (expanding rings from a source point).
// Inspired by three-scope-map-skill: "ripple effects" layer.
//
// Creates N expanding ring animations from a source point (e.g. state capital
// or parliament centroid). Each ring expands outward + fades, then respawns
// with a staggered delay. Uses RingGeometry + transparent MeshBasicMaterial
// so it's cheap to render and glows against the dark HUD background.
//
// Attribution: three-scope-map-skill by 宋夏天Dazzle (公众号: 送你整个夏天)
// SPDX-License-Identifier: GPL-3.0-or-later

import type * as THREE from "three";

export interface BuiltRipple {
  group: THREE.Group;
  /** Advance ripple animations by `dt` seconds if `enabled` is true. */
  update: (dt: number, enabled: boolean) => void;
  /** Re-position the ripple source (e.g. when drilldown changes). */
  setSource: (x: number, z: number) => void;
}

export interface RippleOptions {
  /** Source point in scene coords [x, z]. */
  source: [number, number];
  /** Number of concurrent ripple rings (staggered). */
  ringCount?: number;
  /** Max radius each ring expands to before resetting. */
  maxRadius?: number;
  /** Expansion speed (units/sec). */
  speed?: number;
  /** Ring color (hex). Defaults to MLK accent amber. */
  color?: number;
  /** Y position (slightly above floor to avoid z-fighting). */
  y?: number;
}

/**
 * Builds ripple effects — expanding translucent rings from a source point.
 * The rings lie flat on the XZ plane (rotated -PI/2 around X).
 */
export function buildRipples(
  THREE: typeof import("three"),
  opts: RippleOptions,
): BuiltRipple {
  const {
    source,
    ringCount = 4,
    maxRadius = 80,
    speed = 20,
    color = 0xc77b2c, // MLK accent amber
    y = 0.15,
  } = opts;

  const group = new THREE.Group();
  group.position.set(source[0], y, source[1]);
  group.userData = { kind: "ripples" };

  const rings: THREE.Mesh[] = [];
  const phases: number[] = [];

  for (let i = 0; i < ringCount; i++) {
    // RingGeometry(innerRadius, outerRadius, thetaSegments)
    const geo = new THREE.RingGeometry(0.5, 1.2, 48);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2; // lay flat on XZ
    group.add(mesh);
    rings.push(mesh);
    // Stagger initial phase so rings don't all expand in sync
    phases.push(i / ringCount);
  }

  const update = (dt: number, enabled: boolean) => {
    if (!enabled) return;
    for (let i = 0; i < rings.length; i++) {
      phases[i] += dt * (speed / maxRadius);
      if (phases[i] > 1) phases[i] -= 1;
      const t = phases[i];
      const radius = t * maxRadius;
      const scale = Math.max(radius, 0.1);
      rings[i].scale.set(scale, scale, scale);
      // Fade out as it expands (start visible, end invisible)
      const opacity = (1 - t) * 0.8;
      (rings[i].material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  };

  const setSource = (x: number, z: number) => {
    group.position.set(x, y, z);
  };

  return { group, update, setSource };
}
