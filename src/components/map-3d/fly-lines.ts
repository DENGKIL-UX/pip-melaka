// ponytail: MLK — Fly lines (arced lines + moving particles from source to targets).
// Inspired by three-scope-map-skill: "fly lines" layer.
//
// Creates arced flight paths from a source point (e.g. state capital) to
// multiple target points (e.g. parliament centroids). Each path is:
//   1. A faint static Line showing the full arc
//   2. A bright moving "comet" particle that travels along the arc
//
// The arc is a quadratic Bezier curve: source → midpoint(elevated) → target.
// The comet uses a small SphereGeometry + emissive material + additive blending
// for a glowing trail effect against the dark HUD background.
//
// Attribution: three-scope-map-skill by 宋夏天Dazzle (公众号: 送你整个夏天)
// SPDX-License-Identifier: GPL-3.0-or-later

import type * as THREE from "three";

export interface FlyLineTarget {
  x: number;
  z: number;
  label?: string;
}

export interface BuiltFlyLines {
  group: THREE.Group;
  /** Advance comet positions by `dt` seconds if `enabled` is true. */
  update: (dt: number, enabled: boolean) => void;
  /** Rebuild fly lines with new source/targets (e.g. on drilldown). */
  rebuild: (source: [number, number], targets: FlyLineTarget[]) => void;
}

export interface FlyLineOptions {
  source: [number, number];
  targets: FlyLineTarget[];
  /** Arc height (peak elevation above the floor). */
  arcHeight?: number;
  /** Comet travel speed (0→1 fraction per second). */
  speed?: number;
  /** Line color (hex, faint). */
  lineColor?: number;
  /** Comet color (hex, bright). */
  cometColor?: number;
  /** Stagger comets so they don't all arrive at once. */
  stagger?: boolean;
}

/**
 * Builds fly lines — arced paths with traveling comet particles.
 */
export function buildFlyLines(
  THREE: typeof import("three"),
  opts: FlyLineOptions,
): BuiltFlyLines {
  const {
    source,
    targets,
    arcHeight = 30,
    speed = 0.4,
    lineColor = 0xc77b2c,
    cometColor = 0xe8ff4f,
    stagger = true,
  } = opts;

  const group = new THREE.Group();
  group.userData = { kind: "fly-lines" };

  interface Path {
    curve: THREE.QuadraticBezierCurve3;
    comet: THREE.Mesh;
    halo: THREE.Mesh;
    progress: number;
    line: THREE.Line;
  }

  const paths: Path[] = [];

  const buildPath = (target: FlyLineTarget, index: number): Path => {
    const sx = source[0];
    const sz = source[1];
    const tx = target.x;
    const tz = target.z;
    // Midpoint elevated to create an arc
    const mx = (sx + tx) / 2;
    const mz = (sz + tz) / 2;
    const dist = Math.hypot(tx - sx, tz - sz);
    const peakY = Math.max(arcHeight, dist * 0.3);

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(sx, 0.2, sz),
      new THREE.Vector3(mx, peakY, mz),
      new THREE.Vector3(tx, 0.2, tz),
    );

    // Faint static line showing the full arc
    const points = curve.getPoints(50);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);

    // Bright comet particle
    const cometGeo = new THREE.SphereGeometry(1.5, 12, 12);
    const cometMat = new THREE.MeshBasicMaterial({
      color: cometColor,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const comet = new THREE.Mesh(cometGeo, cometMat);
    group.add(comet);

    // Glow halo around comet (larger, more transparent sphere)
    const haloGeo = new THREE.SphereGeometry(3, 12, 12);
    const haloMat = new THREE.MeshBasicMaterial({
      color: cometColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    group.add(halo);

    return {
      curve,
      comet,
      halo,
      line,
      progress: stagger ? (index / Math.max(targets.length, 1)) : 0,
    };
  };

  // Initial build
  targets.forEach((t, i) => paths.push(buildPath(t, i)));

  const update = (dt: number, enabled: boolean) => {
    if (!enabled) return;
    for (const p of paths) {
      p.progress += dt * speed;
      if (p.progress > 1) p.progress -= 1;
      const pos = p.curve.getPoint(p.progress);
      p.comet.position.copy(pos);
      p.halo.position.copy(pos);
      // Fade comet at start/end of arc
      const fade = Math.sin(p.progress * Math.PI);
      (p.comet.material as THREE.MeshBasicMaterial).opacity = 0.5 + fade * 0.5;
      (p.halo.material as THREE.MeshBasicMaterial).opacity = 0.15 + fade * 0.3;
    }
  };

  const rebuild = (newSource: [number, number], newTargets: FlyLineTarget[]) => {
    // Dispose old
    for (const p of paths) {
      group.remove(p.comet);
      group.remove(p.halo);
      group.remove(p.line);
      p.comet.geometry.dispose();
      (p.comet.material as THREE.Material).dispose();
      p.halo.geometry.dispose();
      (p.halo.material as THREE.Material).dispose();
      p.line.geometry.dispose();
      (p.line.material as THREE.Material).dispose();
    }
    paths.length = 0;
    // Update source + rebuild
    (opts as any).source = newSource;
    newTargets.forEach((t, i) => paths.push(buildPath(t, i)));
  };

  return { group, update, rebuild };
}
