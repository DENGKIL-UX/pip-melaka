// ponytail: MLK — Socioeconomic module barrel export.
// Public surface: <SocioeconomicPanel /> Card + <IncomeChart /> + <GiniGauge />.
//
// ponytail: MLK — package.json has `echarts` but NOT `echarts-for-react`. Per
// the `echarts-dashboard-panels` skill spec, both chart components use a
// pure-SVG fallback (no new deps — important for the 2.8MB Cloudflare Workers
// budget). The chart APIs accept plain data arrays; they can be reused
// outside this panel if needed.

export {
  SocioeconomicPanel,
  default,
} from "./socioeconomic-panel";
export type { SocioeconomicPanelProps } from "./socioeconomic-panel";

export { IncomeChart } from "./income-chart";
export type { IncomeChartProps, IncomeDatum } from "./income-chart";

export { GiniGauge } from "./gini-gauge";
export type { GiniGaugeProps } from "./gini-gauge";
