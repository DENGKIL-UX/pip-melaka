"use client";

/**
 * AnimatedCounter — premium SaaS number count-up.
 *
 * Adapted from the uploaded premium-design StatCard pattern but rebranded
 * to the MLK amber accent (not cyan). Uses IntersectionObserver so the
 * count-up only fires when the number scrolls into view, and respects
 * prefers-reduced-motion by snapping to the final value instantly.
 *
 * Usage:
 *   <AnimatedCounter value={71415} />
 *   <AnimatedCounter value={28} suffix=" DUN" />
 *   <AnimatedCounter value={0.268} decimals={1} suffix="%" />
 */

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number; // ms, default 1800
  delay?: number; // ms, default 0
  decimals?: number; // default 0
  prefix?: string;
  suffix?: string;
  className?: string;
  // When true, formats with toLocaleString (thousand separators). Default true.
  groupSeparator?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1800,
  delay = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  groupSeparator = true,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // Snap to final value without animation — use rAF to defer setState
      // out of the effect body per react-hooks/set-state-in-effect rule.
      const raf = requestAnimationFrame(() => {
        setDisplay(value);
        hasAnimated.current = true;
      });
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now() + delay;

          const tick = (now: number) => {
            const elapsed = now - startTime;
            if (elapsed < 0) {
              requestAnimationFrame(tick);
              return;
            }
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(eased * value);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration, delay]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : groupSeparator
        ? Math.round(display).toLocaleString()
        : String(Math.round(display));

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className ?? ""}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
