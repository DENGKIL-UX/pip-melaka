// ponytail: MLK — HUD ring (rotating torus around the perimeter).
// Implements 3d-map-architecture skill spec (HUD ring layer — rotating state
// ring). Cyan #06b6d4 (per task spec; MLK amber #C77B2C used for state outline
// already so the ring is cyan to add a secondary accent).
//
// Rotation is driven by the parent RAF loop via `update(dt, enabled)`.
// prefers-reduced-motion → rotation disabled (caller passes enabled=false).

import type * as THREE from "three";

export interface BuiltHudRing {
  mesh: THREE.Mesh;
  /** Advance the ring rotation by `dt` seconds if `enabled` is true. */
  update: (dt: number, enabled: boolean) => void;
}

export const HUD_RING_COLOR = 0x06b6d4; // cyan-500
export const HUD_RING_RADIUS = 130;
export const HUD_RING_TUBE = 0.6;
export const HUD_RING_ROTATION_SPEED = 0.18; // rad/sec

/**
 * Builds the HUD ring — a thin torus around the perimeter, lying flat at y=0.
 * The `update(dt, enabled)` callback rotates the ring around the Y axis.
 */
export function buildHudRing(THREE: typeof import("three")): BuiltHudRing {
  const geometry = new THREE.TorusGeometry(HUD_RING_RADIUS, HUD_RING_TUBE, 12, 96);
  const material = new THREE.MeshStandardMaterial({
    color: HUD_RING_COLOR,
    emissive: new THREE.Color(HUD_RING_COLOR),
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.6,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // Lay flat on XZ plane (TorusGeometry is in the XY plane by default).
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = 0.1;
  mesh.userData = { kind: "hud-ring" };

  let angle = 0;
  const update = (dt: number, enabled: boolean) => {
    if (!enabled) return;
    angle += HUD_RING_ROTATION_SPEED * dt;
    mesh.rotation.z = angle;
  };

  return { mesh, update };
}
