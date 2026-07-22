// ponytail: MLK — Chase light (animated border chase light traveling around the perimeter).
// Inspired by three-scope-map-skill: "outer-contour chase light" layer.
//
// Per three-scope-map-skill SKILL.md:
//   "The outer-contour chase light must be rendered as short animated
//    THREE.Line segments. Do not use a transparent filled ribbon mesh or
//    indexed triangle strip for chase light, because self-intersections and
//    alpha sorting can flash large white triangles."
//
// This module creates a ring of short line segments around the map perimeter.
// A "chase" bright segment travels around the ring, leaving a fading trail
// behind it. Uses LineBasicMaterial + additive blending for a glow effect.
//
// Attribution: three-scope-map-skill by 宋夏天Dazzle (公众号: 送你整个夏天)
// SPDX-License-Identifier: GPL-3.0-or-later

import type * as THREE from "three";

export interface BuiltChaseLight {
  group: THREE.Group;
  /** Advance the chase animation by `dt` seconds if `enabled` is true. */
  update: (dt: number, enabled: boolean) => void;
}

export interface ChaseLightOptions {
  /** Radius of the perimeter ring. */
  radius?: number;
  /** Number of segments around the ring. */
  segmentCount?: number;
  /** Number of segments in the bright "chase" head (the rest is the trail). */
  headCount?: number;
  /** Rotation speed (revolutions per second). */
  speed?: number;
  /** Bright color (hex) for the chase head. */
  color?: number;
  /** Y position (slightly above floor). */
  y?: number;
}

/**
 * Builds the outer-contour chase light — short animated line segments
 * traveling around the perimeter ring. The bright "head" leads, with a
 * fading trail behind it.
 */
export function buildChaseLight(
  THREE: typeof import("three"),
  opts: ChaseLightOptions = {},
): BuiltChaseLight {
  const {
    radius = 135,
    segmentCount = 120,
    headCount = 8,
    speed = 0.15, // 0.15 rev/sec = full loop in ~6.7s
    color = 0xd4f56a, // light amber-green accent (per three-scope-map-skill)
    y = 0.2,
  } = opts;

  const group = new THREE.Group();
  group.userData = { kind: "chase-light" };

  // Pre-compute all segment positions around the ring
  const segments: THREE.Line[] = [];
  const segmentAngle = (Math.PI * 2) / segmentCount;

  for (let i = 0; i < segmentCount; i++) {
    const angle = i * segmentAngle;
    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;
    const x2 = Math.cos(angle + segmentAngle) * radius;
    const z2 = Math.sin(angle + segmentAngle) * radius;

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y, z1),
      new THREE.Vector3(x2, y, z2),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    group.add(line);
    segments.push(line);
  }

  let headPos = 0; // 0..1 around the ring

  const update = (dt: number, enabled: boolean) => {
    if (!enabled) return;
    headPos = (headPos + dt * speed) % 1;
    const headIdx = headPos * segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      // Distance behind the head (0 = at head, increases going backwards)
      let dist = headIdx - i;
      if (dist < 0) dist += segmentCount;

      let opacity = 0;
      if (dist < headCount) {
        // Bright head
        opacity = 1 - (dist / headCount);
        opacity = Math.pow(opacity, 1.5); // sharper falloff
      } else if (dist < headCount * 4) {
        // Fading trail
        const trailT = (dist - headCount) / (headCount * 3);
        opacity = (1 - trailT) * 0.25;
      }

      (segments[i].material as THREE.LineBasicMaterial).opacity = opacity;
    }
  };

  return { group, update };
}
