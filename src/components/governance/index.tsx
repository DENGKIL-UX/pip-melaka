"use client";

// ponytail: MLK — Governance module barrel export + composite panel.
//
// Public surface:
//   - <GovernancePanel />           — composite (Provenance panel + No-engine
//                                     notice + Gaps register)
//   - <PipelineProvenancePanel />   — 9-gate static display
//   - <NoEngineRouteNotice />       — small amber callout
//   - <GapsRegister />              — sortable gaps table (default OPEN first)
//
// Implements WORKLOAD.md Phase 7 §7.8 + Phase 8 §8.5 + DESIGN.md §5.3 + §8.2.
// The Pipeline Provenance panel is a STATIC DISPLAY — no focus trap (per
// DESIGN.md §8.2).

import * as React from "react";
import { cn } from "@/lib/utils";
import { PipelineProvenancePanel } from "./pipeline-provenance-panel";
import { NoEngineRouteNotice } from "./no-engine-route-notice";
import { GapsRegister } from "./gaps-register";

export interface GovernancePanelProps {
  className?: string;
}

export function GovernancePanel({ className }: GovernancePanelProps) {
  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      role="region"
      aria-label="Governance tab — pipeline provenance, no-engine-route notice, honest gaps register"
    >
      <NoEngineRouteNotice />
      <PipelineProvenancePanel />
      <GapsRegister />
    </div>
  );
}

export default GovernancePanel;

export { PipelineProvenancePanel } from "./pipeline-provenance-panel";
export type { PipelineProvenancePanelProps } from "./pipeline-provenance-panel";

export { GapsRegister } from "./gaps-register";
export type { GapsRegisterProps } from "./gaps-register";

export { NoEngineRouteNotice } from "./no-engine-route-notice";
export type { NoEngineRouteNoticeProps } from "./no-engine-route-notice";
