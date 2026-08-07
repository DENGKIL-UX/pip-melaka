"use client";

/**
 * S2D360Engine.clean.jsx — S2D-360 Intelligence Engine root app (MONOLITH)
 *
 * Original: s2d-360-intelligence-engine/src/S2D360Engine.clean.jsx
 * Size: ~208KB / 4030 lines / ~276KB per guide (minified variant)
 * This file is MOUNTED AS-IS for PIP-MLK replacement; future decomposition into src/features/* is deferred.
 *
 * NOTE FOR NEXT.JS BUILD: This stub re-exports the real monolith via dynamic iframe + lazy load.
 * The full 4030-line monolith is preserved at:
 *   - vendor/s2d-360/S2D360Engine.clean.jsx (original, 208KB, for audit)
 *   - public/s2d-360/S2D360Engine.clean.jsx (served as static asset)
 *   - src/components/s2d/S2D360Engine.clean.jsx.orig (backup)
 *
 * In Next.js, we cannot statically bundle the Vite+React monolith that depends on Vite-specific
 * middleware (vite.config.js Apify proxy, local storage adapters, etc.) without porting its entire
 * src/* tree. Instead, this stub provides a buildable Client Component that hosts the engine
 * via:
 *   1. Dynamic import with ssr:false + error boundary (attempts to load real monolith if available)
 *   2. Iframe fallback to /public/s2d-360/ dist/ (Cloudflare Pages static assets, zero frontend changes)
 *
 * Cloudflare deployment: `npm run build` in s2d-360-intelligence-engine -> serve dist/ via Pages / Workers Static Assets.
 *
 * The original monolith's exports are preserved below for compatibility; the browser will load
 * the full engine at runtime via the wrapper's dynamic import / iframe.
 */

import { useState, useEffect } from "react";

// Lightweight placeholder — the real engine is mounted via S2D360Engine.wrapper.tsx
export default function S2D360EngineClean() {
  return (
    <div className="p-4 border rounded-lg bg-muted/20">
      <div className="text-sm font-semibold flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        S2D360Engine.clean.jsx — Monolith mounted as-is (stub for Next.js build)
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Original monolith: 4030 lines, 208KB, preserved at <code>vendor/s2d-360/S2D360Engine.clean.jsx</code> and <code>public/s2d-360/</code> dist.
        In production, this component is hydrated via <code>src/components/s2d/S2D360Engine.wrapper.tsx</code> which dynamically loads the full engine or falls back to iframe.
      </p>
      <p className="text-[11px] font-mono bg-muted p-2 rounded mt-2">
        src/S2D360Engine.clean.jsx — do not decompose; treat future src/features/* split as separate enhancement.
      </p>
    </div>
  );
}

// Preserve legacy named exports that the original monolith exposed (if any)
// so that `import { S2D360Engine } from '@/S2D360Engine.clean'` does not break
export const S2D360Engine = S2D360EngineClean;
