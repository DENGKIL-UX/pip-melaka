"use client";

// ponytail: MLK — Loading skeleton component.
// New feature (round 4): animated loading skeletons for the Overview + Demographics tabs.
// Uses a shimmer animation (respects prefers-reduced-motion).

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/60 animate-pulse",
        "motion-reduce:animate-none",
        className
      )}
      aria-hidden="true"
    />
  );
}

// KPI card skeleton (4 cards in the overview KPI strip)
export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-md border border-mlk/20 p-4 space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-16" />
        </div>
      ))}
    </div>
  );
}

// Card skeleton (for election summary, DPT summary, etc.)
export function CardSkeleton() {
  return (
    <div className="rounded-md border border-mlk/20 p-4 space-y-3">
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

// Parliament card skeleton (6 cards)
export function ParliamentGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-md border border-mlk/10 p-3 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

// Chart skeleton (for Demographics module)
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="rounded-md border border-mlk/20 p-4 space-y-3" style={{ height }}>
      <Skeleton className="h-4 w-24" />
      <div className="flex-1 flex items-end gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.sin(i) * 30 + 40}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Elections skeleton — mimics the 3-tab + table layout
export function ElectionsSkeleton() {
  return (
    <div className="rounded-md border border-mlk/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      {/* Tab strip */}
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-md" />
        ))}
      </div>
      {/* Summary banner */}
      <Skeleton className="h-16 w-full rounded-md" />
      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compare skeleton — mimics the two-column side-by-side layout
export function CompareSkeleton() {
  return (
    <div className="rounded-md border border-mlk/20 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-40" />
      </div>
      {/* Selectors */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <Skeleton className="h-4 w-4" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
      {/* Headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        <div className="text-end space-y-1">
          <Skeleton className="h-3 w-10 ms-auto" />
          <Skeleton className="h-4 w-24 ms-auto" />
          <Skeleton className="h-2 w-20 ms-auto" />
        </div>
        <Skeleton className="h-3 w-6" />
        <div className="text-start space-y-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-20" />
        </div>
      </div>
      {/* Stat rows */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <Skeleton className="h-4 w-16 ms-auto" />
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// DPT Analysis skeleton — mimics the 6-tab + chart layout
export function AnalysisSkeleton() {
  return (
    <div className="rounded-md border border-mlk/20 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Tab strip */}
      <div className="flex gap-1 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md flex-shrink-0" />
        ))}
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border p-2 space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      {/* Chart */}
      <Skeleton className="h-48 w-full rounded-md" />
      {/* Table */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
