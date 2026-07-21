"use client";

/**
 * §10.2: React Query data fetching hooks for PIP-MLK.
 *
 * Centralized data fetching with:
 *   - Stale-while-revalidate caching
 *   - Background refetch on window focus
 *   - Retry with exponential backoff
 *   - TypeScript-safe return types
 *
 * Usage:
 *   const { data, isLoading, error } = useElectionsData();
 *   const { data } = useDunSummary("06");
 */

import { useQuery } from "@tanstack/react-query";
import type { DunSummary } from "@/lib/dun-summary";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ElectionDoc {
  elections: Array<{
    id: string;
    name: string;
    date: string;
    headline_fact: string;
    parliament_summary: Record<string, number> | null;
    dun_summary: Record<string, number> | null;
    parliament_results: Array<Record<string, unknown>>;
    dun_results: Array<Record<string, unknown>>;
  }>;
}

interface DashboardOverview {
  totalVoters: number;
  totalDun: number;
  totalParliaments: number;
  electionsCount: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────

/** Fetch all election data (GE14, PRN15, GE15) */
export function useElectionsData() {
  return useQuery<ElectionDoc>({
    queryKey: ["elections"],
    queryFn: async () => {
      const res = await fetch("/data/elections/melaka-elections.json");
      if (!res.ok) throw new Error("Failed to fetch election data");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes cache
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

/** Fetch DUN boundary GeoJSON */
export function useDunBoundaries() {
  return useQuery({
    queryKey: ["boundaries", "dun"],
    queryFn: async () => {
      const res = await fetch("/data/boundaries/mlk-dun-geo.json");
      if (!res.ok) throw new Error("Failed to fetch DUN boundaries");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,  // 1 hour (boundaries don't change)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/** Fetch parlimen boundary GeoJSON */
export function useParlimenBoundaries() {
  return useQuery({
    queryKey: ["boundaries", "parlimen"],
    queryFn: async () => {
      const res = await fetch("/data/boundaries/mlk-parlimen-geo.json");
      if (!res.ok) throw new Error("Failed to fetch parlimen boundaries");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/** Fetch P134 DUN intelligence (demographics) */
export function useDunIntelligence() {
  return useQuery({
    queryKey: ["dun-intelligence"],
    queryFn: async () => {
      const res = await fetch("/data/p134/dun-intelligence.jsonl");
      if (!res.ok) throw new Error("Failed to fetch DUN intelligence");
      const text = await res.text();
      return text.trim().split("\n").map((line) => JSON.parse(line));
    },
    staleTime: 10 * 60 * 1000,  // 10 minutes
    gcTime: 60 * 60 * 1000,     // 1 hour
  });
}

/** Fetch dashboard overview data */
export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    staleTime: 60 * 1000,  // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/** Fetch S2D intelligence signals */
export function useS2dSignals() {
  return useQuery({
    queryKey: ["s2d-signals"],
    queryFn: async () => {
      const res = await fetch("/api/s2d/intelligence/signals");
      if (!res.ok) throw new Error("Failed to fetch S2D signals");
      return res.json();
    },
    staleTime: 30 * 1000,  // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/** Fetch aggregate context for a specific DUN */
export function useAggregateContext(dunCode: string) {
  return useQuery({
    queryKey: ["aggregate-context", dunCode],
    queryFn: async () => {
      const res = await fetch(`/api/pip/aggregate-context?level=DUN&code=${dunCode}`);
      if (!res.ok) throw new Error("Failed to fetch aggregate context");
      return res.json();
    },
    enabled: !!dunCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}
