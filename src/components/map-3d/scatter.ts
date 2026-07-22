// ponytail: MLK — locality point cloud (InstancedMesh, ~360 points in 1 draw
// call). Implements 3d-map-architecture skill spec (scatter layer, 2,001
// InstancedMesh points — P134 has 360 here, scaling pattern is identical).
//
// Each locality → 1 instance positioned at the DUN centroid + small jitter
// (locality-intelligence.jsonl has no coordinates — same limitation as the
// 2D map's locality overlay; see DG_PDM_DICTIONARY gap). Color by
// voter_density_score: HIGH=red, MEDIUM=amber, LOW=green, VERY_HIGH=pink.
//
// SSR-safe — all Three.js imports happen inside the factory function.

import type * as THREE from "three";
import { projectLatLng, type DunExtrusionSpec } from "./extrusions";

export interface LocalityRow {
  level: "LOCALITY";
  id: string;
  geography: {
    state_code: string;
    parliament_code: string;
    parliament_name: string;
    dun_code: string;
    dun_name: string;
    dm_code?: string;
    dm_name?: string;
    locality_code?: string;
    locality_name?: string;
    district?: string;
    postcode?: string;
  };
  metrics: {
    total_voters: number;
    voter_density_score?: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
    [k: string]: unknown;
  };
}

export interface BuiltScatter {
  mesh: THREE.InstancedMesh;
  /** Returns the LocalityRow at a given instance index (for tooltip). */
  getLocality: (index: number) => LocalityRow | undefined;
  count: number;
}

export const SCATTER_COLORS: Record<string, number> = {
  HIGH: 0xef4444, // red-500
  MEDIUM: 0xf59e0b, // amber-500
  LOW: 0x10b981, // emerald-500
  VERY_HIGH: 0xec4899, // pink-500
};

const DEFAULT_COLOR = 0x6366f1; // indigo-500 (fallback)

/**
 * Deterministic FNV-1a hash → 2D unit vector. Same input always renders at the
 * same pixel (matches map-2d jitter pattern). Pinned to a small radius so
 * points cluster near their DUN centroid.
 */
function jitterOffset(seed: string, radius = 2.0): [number, number] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const r1 = ((h >>> 0) % 1000) / 1000;
  const r2 = (((h >>> 11) ^ (h >>> 23)) % 1000) / 1000;
  const angle = r1 * Math.PI * 2;
  const r = Math.sqrt(r2) * radius;
  return [Math.sin(angle) * r, Math.cos(angle) * r];
}

/**
 * Builds an InstancedMesh of locality points anchored at their DUN centroid +
 * deterministic jitter. Returns the mesh + a lookup closure for tooltip data.
 *
 * @param localities Locality JSONL rows (P134 = ~360 points).
 * @param dunCentroidByCode Map of `parlCode|dunCode` → [x, z] scene centroid.
 */
export function buildScatter(
  THREE: typeof import("three"),
  localities: LocalityRow[],
  dunCentroidByCode: Map<string, [number, number]>
): BuiltScatter {
  const count = localities.length;
  // ponytail: MLK — InstancedMesh with a small SphereGeometry. Sphere has
  // better depth perception than a flat Plane in a 3D scene with rotation.
  // 1 draw call regardless of count (vs Points which flickers with
  // depth-sorting and Sprite which is 1 draw call per sprite).
  const geometry = new THREE.SphereGeometry(0.45, 8, 6);
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.4,
    metalness: 0.25,
    transparent: true,
    opacity: 0.9,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.userData = { kind: "scatter" };

  // Per-instance color buffer.
  mesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(count * 3),
    3
  );

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  localities.forEach((loc, i) => {
    const key = `${loc.geography.parliament_code}|${loc.geography.dun_code}`;
    const base = dunCentroidByCode.get(key) ?? [0, 0];
    const [jx, jz] = jitterOffset(loc.id ?? `${key}|${i}`);
    const x = base[0] + jx;
    const z = base[1] + jz;
    // Y position: small elevation so points sit on top of the DUN extrusions
    // (visible from any camera angle). Scaled up by total_voters to show density.
    const y = 1 + Math.log10(Math.max(loc.metrics.total_voters, 1)) * 1.5;

    dummy.position.set(x, y, z);
    // Scale by total_voters (log) so dense localities are visually larger.
    const s = 0.6 + Math.log10(Math.max(loc.metrics.total_voters, 1)) * 0.25;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    const hex = SCATTER_COLORS[loc.metrics.voter_density_score ?? ""] ?? DEFAULT_COLOR;
    color.setHex(hex);
    mesh.setColorAt(i, color);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const lookup = new Map<number, LocalityRow>();
  localities.forEach((loc, i) => lookup.set(i, loc));

  return {
    mesh,
    getLocality: (idx: number) => lookup.get(idx),
    count,
  };
}

/**
 * Builds a quick map of `parlCode|dunCode` → centroid from the DUN specs.
 * Used by buildScatter to anchor localities.
 */
export function indexDunCentroids(specs: DunExtrusionSpec[]): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  for (const s of specs) m.set(`${s.parliamentCode}|${s.dunCode}`, s.centroid);
  return m;
}
