"use client";

/**
 * Compatibility export for historical imports.
 *
 * The current upstream S2D source (5,185 lines / 276,640 bytes) is preserved at
 * vendor/s2d-360/S2D360Engine.clean.jsx and public/s2d-360/S2D360Engine.clean.jsx.
 * Its rebuilt Vite bundle is the runtime mounted by
 * components/s2d/S2D360Engine.wrapper.tsx. Keeping the Vite application in a
 * sandboxed iframe avoids mixing its global styles, IndexedDB stores, and
 * browser-only modules into the Next.js React tree.
 */
export default function S2D360EngineCompatibilityNotice() {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        S2D-360 runtime is served from /s2d-360/
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Use <code>S2D360Engine.wrapper.tsx</code> to mount the current 63-workspace Vite build.
      </p>
    </div>
  );
}

export const S2D360Engine = S2D360EngineCompatibilityNotice;
