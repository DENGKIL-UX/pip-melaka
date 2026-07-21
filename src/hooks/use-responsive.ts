"use client";

/**
 * useResponsive — responsive breakpoint detection hook.
 *
 * Returns boolean flags for each Tailwind breakpoint:
 *   isMobile  (< 640px, sm breakpoint)
 *   isTablet  (640–1023px, sm to lg)
 *   isDesktop (≥ 1024px, lg)
 *   isWide    (≥ 1536px, 2xl)
 *   sidebarCollapsible (< 1280px)
 *
 * Usage:
 *   const { isMobile, isDesktop } = useResponsive();
 *   if (isMobile) return <BottomNav />;
 */
import { useState, useEffect } from "react";

export function useResponsive() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: width > 0 && width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    isWide: width >= 1536,
    sidebarCollapsible: width > 0 && width < 1280,
    width,
  };
}
