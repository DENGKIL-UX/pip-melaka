// ponytail: MLK — HUD base ring (segmented ticked design).
// Enhanced from the original plain torus to a more sophisticated HUD base ring
// inspired by three-scope-map-skill: "HUD base ring" layer.
//
// The HUD base ring consists of:
//   1. A main thin torus ring (the base)
//   2. Tick marks around the perimeter (short line segments at regular intervals)
//   3. A rotating accent segment (a brighter arc that travels around)
//
// Attribution: three-scope-map-skill by 宋夏天Dazzle (公众号: 送你整个夏天)
// SPDX-License-Identifier: GPL-3.0-or-later

import type * as THREE from "three";

export interface BuiltHudRing {
  group: THREE.Group;
  /** Advance the ring rotation by `dt` seconds if `enabled` is true. */
  update: (dt: number, enabled: boolean) => void;
}

export const HUD_RING_COLOR = 0x06b6d4; // cyan-500
export const HUD_RING_ACCENT = 0xc77b2c; // MLK amber
export const HUD_RING_RADIUS = 130;
export const HUD_RING_TUBE = 0.4;
export const HUD_RING_ROTATION_SPEED = 0.12; // rad/sec

/**
 * Builds the HUD base ring — a thin torus + tick marks + rotating accent arc.
 * The `update(dt, enabled)` callback rotates the accent arc around the Y axis.
 */
export function buildHudRing(THREE: typeof import("three")): BuiltHudRing {
  const group = new THREE.Group();
  group.userData = { kind: "hud-ring" };

  // ── 1. Main thin torus base ──────────────────────────────────────────────
  const torusGeo = new THREE.TorusGeometry(HUD_RING_RADIUS, HUD_RING_TUBE, 8, 128);
  const torusMat = new THREE.MeshStandardMaterial({
    color: HUD_RING_COLOR,
    emissive: new THREE.Color(HUD_RING_COLOR),
    emissiveIntensity: 0.25,
    roughness: 0.4,
    metalness: 0.7,
    transparent: true,
    opacity: 0.6,
  });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  torus.rotation.x = Math.PI / 2; // lay flat on XZ
  torus.position.y = 0.1;
  group.add(torus);

  // ── 2. Tick marks around the perimeter ───────────────────────────────────
  const tickCount = 60;
  const tickGroup = new THREE.Group();
  for (let i = 0; i < tickCount; i++) {
    const angle = (i / tickCount) * Math.PI * 2;
    const isLong = i % 5 === 0; // every 5th tick is longer/brighter
    const tickLen = isLong ? 3 : 1.5;
    const tickOpacity = isLong ? 0.5 : 0.25;

    const x1 = Math.cos(angle) * (HUD_RING_RADIUS - tickLen);
    const z1 = Math.sin(angle) * (HUD_RING_RADIUS - tickLen);
    const x2 = Math.cos(angle) * (HUD_RING_RADIUS + tickLen);
    const z2 = Math.sin(angle) * (HUD_RING_RADIUS + tickLen);

    const tickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, 0.1, z1),
      new THREE.Vector3(x2, 0.1, z2),
    ]);
    const tickMat = new THREE.LineBasicMaterial({
      color: HUD_RING_COLOR,
      transparent: true,
      opacity: tickOpacity,
    });
    tickGroup.add(new THREE.Line(tickGeo, tickMat));
  }
  group.add(tickGroup);

  // ── 3. Rotating accent arc (brighter segment that travels around) ────────
  const accentArcPoints: THREE.Vector3[] = [];
  const arcSpan = Math.PI * 0.3; // ~54 degrees
  const arcSegments = 24;
  for (let i = 0; i <= arcSegments; i++) {
    const angle = (i / arcSegments) * arcSpan;
    const x = Math.cos(angle) * HUD_RING_RADIUS;
    const z = Math.sin(angle) * HUD_RING_RADIUS;
    accentArcPoints.push(new THREE.Vector3(x, 0.2, z));
  }
  const arcGeo = new THREE.BufferGeometry().setFromPoints(accentArcPoints);
  const arcMat = new THREE.LineBasicMaterial({
    color: HUD_RING_ACCENT,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const accentArc = new THREE.Line(arcGeo, arcMat);
  group.add(accentArc);

  let angle = 0;
  const update = (dt: number, enabled: boolean) => {
    if (!enabled) return;
    angle += HUD_RING_ROTATION_SPEED * dt;
    accentArc.rotation.y = angle;
  };

  return { group, update };
}
