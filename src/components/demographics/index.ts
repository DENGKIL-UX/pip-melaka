// ponytail: MLK — Demographics module barrel export.
// Public surface: <DemographicsModule /> Card with parliament selector +
// KPI strip + 4 chart cards (age bands / ethnicity donut / gender balance /
// senior gauge) + per-DUN table.
//
// Mounting: the dashboard shell mounts this directly — it is a "use client"
// component that fetches `/data/p{N}/parliament-intelligence.jsonl` +
// `/data/p{N}/dun-intelligence.jsonl` + `/data/p{N}/dashboard-overview.json`
// on mount + on selectedParliament change. Reads `useDashboardStore.selectedParliament`
// for cross-module sync (the 3D map / Brain graph / Risk module can all
// change the selected parliament).

export { DemographicsModule, default } from "./demographics-module";
export type { DemographicsModuleProps } from "./demographics-module";

export { AgeBandsChart } from "./age-bands-chart";
export type { AgeBandsChartProps } from "./age-bands-chart";

export { EthnicityDonut } from "./ethnicity-donut";
export type { EthnicityDonutProps } from "./ethnicity-donut";

export { GenderBalance } from "./gender-balance";
export type { GenderBalanceProps } from "./gender-balance";

export { SeniorGauge } from "./senior-gauge";
export type { SeniorGaugeProps } from "./senior-gauge";

export { KpiStrip } from "./kpi-strip";
export type { KpiStripProps } from "./kpi-strip";

export type {
  AgeBandKey,
  EthnicityKey,
  EngineMetrics,
  EngineDistributions,
  ParliamentIntelligenceRow,
  DunIntelligenceRow,
} from "./types";
