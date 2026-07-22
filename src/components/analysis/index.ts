// ponytail: MLK — DPT Analysis module barrel export.
// Public surface: <AnalysisModule /> Card with 6 tabs (Overview / By
// Parliament / By DUN / By DM / Trend / Methodology) + Demographics overlay.
//
// Mounting: the dashboard shell mounts this directly — it is a "use client"
// component that fetches `/data/dpt/spr-dpt-pameran-summary.json` on mount
// and `/data/dpt/spr-dpt-pameran.json` lazily per tab. Recharts is imported
// statically by dpt-trend.tsx — the dashboard shell may want to lazy-load
// the Analysis tab if bundle size becomes a concern (Recharts adds ~80KB
// gzip).

export { AnalysisModule, default } from "./dpt-tabs";
export type { AnalysisModuleProps } from "./dpt-tabs";

export { DptOverview } from "./dpt-overview";
export type { DptOverviewProps } from "./dpt-overview";

export { DptByParliament } from "./dpt-by-parliament";
export type { DptByParliamentProps } from "./dpt-by-parliament";

export { DptByDun } from "./dpt-by-dun";
export type { DptByDunProps } from "./dpt-by-dun";

export { DptByDm } from "./dpt-by-dm";
export type { DptByDmProps } from "./dpt-by-dm";

export { DptTrend } from "./dpt-trend";
export type { DptTrendProps } from "./dpt-trend";

export { DptMethodology } from "./dpt-methodology";
export type { DptMethodologyProps } from "./dpt-methodology";

export { DemographicsOverlay } from "./demographics-overlay";
export type { DemographicsOverlayProps } from "./demographics-overlay";

export type {
  DptRecord,
  DptDunRow,
  DptDmRow,
  DptSummaryDoc,
  DptSummaryPerMonth,
  DptSummaryPerParliament,
  DptMethodologyInfo,
  EngineLocalityRow,
  EngineDunRow,
} from "./types";
