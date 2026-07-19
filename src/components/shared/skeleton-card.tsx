"use client";

/**
 * SkeletonCard — premium SaaS shimmer loading state.
 *
 * Adapted from the uploaded premium-design SkeletonCard but uses the
 * MLK amber shimmer (skeleton-mlk class from globals.css) instead of
 * the cyan/zinc palette. Drop-in replacement for plain "Loading…" text
 * in data-driven tabs.
 *
 * Usage:
 *   <SkeletonCard />
 *   <SkeletonCard lines={4} showBar />
 *   <SkeletonCard className="h-40" />
 */

import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  lines?: number; // number of text lines to render, default 3
  showBar?: boolean; // show a progress-bar-shaped skeleton, default true
  showBadge?: boolean; // show a small badge-shaped skeleton, default true
}

export function SkeletonCard({
  className,
  lines = 3,
  showBar = true,
  showBadge = true,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-mlk/10 bg-card p-6 overflow-hidden",
        className
      )}
      role="status"
      aria-label="Loading content"
      aria-live="polite"
    >
      <div className="space-y-4">
        {showBadge && (
          <div className="h-4 w-24 rounded skeleton-mlk" />
        )}
        <div className="h-8 w-36 rounded skeleton-mlk" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded skeleton-mlk"
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
        {showBar && (
          <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full w-1/3 rounded-full skeleton-mlk" />
          </div>
        )}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * SkeletonGrid — renders N SkeletonCards in a responsive grid.
 * Useful as a drop-in for tab content before data loads.
 */
export function SkeletonGrid({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
