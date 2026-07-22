"use client";

// ponytail: MLK — Risk panel wrapper Card. Composes the RiskGrid into a
// shadcn Card with header + content area. Implements WORKLOAD.md Phase 5
// §5.1 + DESIGN.md §3 row 5.

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MLK_ACCENT, evidenceTierColor } from "@/lib/party-colors";
import { RiskGrid } from "./risk-grid";

export interface RiskPanelProps {
  className?: string;
}

export function RiskPanel({ className }: RiskPanelProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-slate-800 bg-slate-950/60",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <ShieldAlert
            className="h-4 w-4"
            aria-hidden
            style={{ color: MLK_ACCENT }}
          />
          Risk Signals · P134 (5 DUNs × 4 signals)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-slate-600 text-[10px] uppercase tracking-wide"
            style={{ color: evidenceTierColor("Proxy") }}
          >
            Evidence: Proxy
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-600 text-[10px] uppercase tracking-wide text-slate-300"
          >
            Scope: P134
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <RiskGrid />
      </CardContent>
    </Card>
  );
}

export default RiskPanel;
