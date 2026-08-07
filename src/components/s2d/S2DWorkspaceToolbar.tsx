"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, ShieldCheck, Radio, Activity, Brain } from "lucide-react";
import { S2DCredentialSettingsModal } from "./S2DCredentialSettingsModal";

interface Props {
  className?: string;
  loopStatus?: string;
  signalsCount?: number;
}

/**
 * S2DWorkspaceToolbar — hosts the ⚙️ Gear Settings trigger
 * Per Phase 3 spec: hosts the Gear Settings trigger for credential configuration.
 * This toolbar is mounted at the top of the S2D workspace (alongside the S2D 360 engine).
 */
export function S2DWorkspaceToolbar({ className, loopStatus = "sensing", signalsCount = 0 }: Props) {
  const [gearOpen, setGearOpen] = useState(false);

  return (
    <>
      <div className={`flex items-center justify-between gap-2 p-2 border rounded-lg bg-card border-mlk/20 ${className ?? ""}`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Brain className="h-4 w-4 text-mlk" />
            <span className="text-sm font-semibold">S2D 360</span>
            <Badge variant="outline" className="text-[10px] border-mlk/30">
              {loopStatus} · {signalsCount} signals
            </Badge>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            aggregate-only
            <span className="mx-1">·</span>
            <Radio className="h-3 w-3 text-blue-500" />
            LIVE
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGearOpen(true)}
            className="h-8 gap-1.5 border-mlk/30 hover:bg-mlk/10"
            aria-label="Open S2D Credential Settings"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span aria-hidden>⚙️</span>
          </Button>
        </div>
      </div>

      <S2DCredentialSettingsModal open={gearOpen} onOpenChange={setGearOpen} />
    </>
  );
}

export default S2DWorkspaceToolbar;
