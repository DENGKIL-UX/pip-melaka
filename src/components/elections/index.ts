// ponytail: MLK — Elections module barrel export.
// Public surface: <ElectionsModule /> Card (3 sub-tabs + 2026 projection).
//
// Mounting: the dashboard shell mounts this directly — it is a "use client"
// component that fetches `/data/elections/melaka-elections.json` on mount.
// No SSR-disabled dynamic import needed (no Leaflet/Three/d3 — only React +
// recharts-free shadcn primitives).

export { ElectionsModule, default } from "./elections-tabs";
export type { ElectionsModuleProps } from "./elections-tabs";

export { ElectionSummaryBanner } from "./election-summary-banner";
export type { ElectionSummaryBannerProps } from "./election-summary-banner";

export { ElectionTable } from "./election-table";
export type { ElectionTableProps } from "./election-table";

export { Projection2026Card } from "./projection-2026";
export type { Projection2026Props } from "./projection-2026";

export type {
  ElectionsDoc,
  Election,
  ElectionDunResult,
  ElectionParlResult,
  SeatSummary,
  Projection2026,
  ProjectionScenario,
  CoalitionCode,
} from "./types";
