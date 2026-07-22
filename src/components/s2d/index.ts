// ponytail: MLK — S2D module barrel export.
// Public surface:
//   - <ActionConsole />  — main S2D tab panel (signal queue with filters +
//     cards + Acknowledge/Act/Resolve/Dismiss buttons + suggested-actions list)
//   - <SignalPanel />    — 1-line summary panel for the dashboard overview row
//   - <HealthWidget />   — minimal footer widget (Badge + Tooltip only)
//   - <PhaseRibbon />    — top-of-dashboard 10-button ribbon with Alt+1-9/0
//   - seedSignalsIfEmpty() — programmatic seeding helper (called automatically
//     by ActionConsole on mount when the store is empty)
//
// Per WORKLOAD.md Phase 7 §7.5–7.6:
//   - Demographics are signal CONTEXT (derived from aggregate JSONLs).
//   - There is NO `/api/engine` route. The engine is build-time only.
//   - DG_ENGINE_VERSION (the 9-gate provenance gap) closes in Phase 1.7, NOT
//     in Phase 7. The Governance tab's Pipeline Provenance panel shows the
//     current 8/9 closed state.

export { ActionConsole } from "./action-console";
export type { ActionConsoleProps } from "./action-console";

export { SignalPanel } from "./signal-panel";
export type { SignalPanelProps } from "./signal-panel";

export { HealthWidget } from "./health-widget";
export type { HealthWidgetProps } from "./health-widget";

export { PhaseRibbon } from "./phase-ribbon";
export type { PhaseRibbonProps } from "./phase-ribbon";

export { seedSignalsIfEmpty } from "./signal-seeder";
