"use client";

// ponytail: MLK — Fullscreen hook for map components.
// New feature (round 6): expand any container to fill the viewport.
// Uses CSS fixed positioning (not the Fullscreen API) so it works even when
// the browser doesn't permit true fullscreen (e.g. inside iframes).
// Esc key exits fullscreen. Respects prefers-reduced-motion (no transition).

import { useEffect, useState, useCallback } from "react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enter = useCallback(() => setIsFullscreen(true), []);
  const exit = useCallback(() => setIsFullscreen(false), []);
  const toggle = useCallback(() => setIsFullscreen((f) => !f), []);

  // Esc exits fullscreen.
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Lock body scroll while fullscreen (prevents background scroll on mobile).
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  return { isFullscreen, enter, exit, toggle };
}
