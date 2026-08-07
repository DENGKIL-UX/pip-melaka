"use client";

/**
 * S2D Modern Tab — REPLACES the legacy S2D React panels
 *
 * This tab mounts the modern components imported from S2D-workspace-code
 * (s2d-360-intelligence-engine):
 *   - <S2D360Engine />                (current 5,185-line upstream Vite build, isolated via sandboxed iframe)
 *   - <S2DDailyIntelligenceBriefPage />
 *   - <S2DAlertCenterPage />
 *   - <S2DNarrativePropagationGraphPage />
 *   - <S2DConstituencyIntelligenceReportPage />
 *   - <S2DCredentialSettingsModal />  (Gear Settings — dynamic Apify/WhatsApp token config)
 *   - <S2DWorkspaceToolbar />         (hosts the ⚙️ Gear Settings trigger)
 *
 * NOTE: S2D360Engine.clean.jsx is a large monolith (~276KB / 5,185 lines).
 * Its Vite production bundle is mounted by S2D360Engine.wrapper.tsx from /public/s2d-360/.
 * Future decomposition into src/features/* is a separate enhancement.
 *
 * Phase 3 — Frontend Component Replacement
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Brain, FileText, Bell, Share2, MapPin, BarChart3, Target, MapPinned, ExternalLink, ShieldCheck, Radio } from "lucide-react";
import { S2DWorkspaceToolbar } from "@/components/s2d/S2DWorkspaceToolbar";
import { S2DDailyIntelligenceBriefPage } from "@/components/s2d/S2DDailyIntelligenceBriefPage";
import { S2DAlertCenterPage } from "@/components/s2d/S2DAlertCenterPage";
import { S2DNarrativePropagationGraphPage } from "@/components/s2d/S2DNarrativePropagationGraphPage";
import { S2DConstituencyIntelligenceReportPage } from "@/components/s2d/S2DConstituencyIntelligenceReportPage";
import { S2DSentimentSnapshotsPage } from "@/components/s2d/S2DSentimentSnapshotsPage";
import { S2DLocalSignalProfilesPage } from "@/components/s2d/S2DLocalSignalProfilesPage";
import { S2DForecastingPage } from "@/components/s2d/S2DForecastingPage";
import { S2D360Engine as S2D360EngineWrapper } from "@/components/s2d/S2D360Engine.wrapper";
import { useS2DStore } from "@/stores/s2d-store";
import { useI18n } from "@/lib/i18n";

type ModernView = "engine" | "brief" | "alerts" | "narrative" | "constituency" | "sentiment" | "profiles" | "forecast";

export function S2DModernTab() {
  const { t } = useI18n();
  const signalsCount = useS2DStore((s) => s.signals.filter((sig) => sig.status !== "resolved").length);
  const loopStatus = useS2DStore((s) => s.loopStatus);
  const [view, setView] = useState<ModernView>("engine");

  return (
    <div className="space-y-4">
      {/* Header with governance badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-mlk" /> S2D 360 — Modern Engine (Replacement)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Current upstream <code className="bg-muted px-1 rounded">S2D360Engine.clean.jsx</code> (5,185 lines / 63 workspaces), rebuilt with Vite and isolated in a same-origin sandbox, plus native modern pages.
            <br />
            API: <code className="bg-muted px-1 rounded">GET /api/s2d/intelligence/signals?localityCode=MELAKA</code> ·{" "}
            <code className="bg-muted px-1 rounded">GET /api/s2d/intelligence/narratives</code> ·{" "}
            <code className="bg-muted px-1 rounded">GET /api/s2d/intelligence/recommendations</code> ·{" "}
            <code className="bg-muted px-1 rounded">GET /api/s2d/intelligence/briefs/daily</code>
          </p>
        </div>
        <Badge variant="outline" className="hidden md:flex items-center gap-1.5 border-emerald-500/30 text-emerald-700 bg-emerald-500/5">
          <ShieldCheck className="h-3 w-3" /> aggregate-only · human-review
        </Badge>
      </div>

      {/* Workspace Toolbar — hosts the ⚙️ Gear Settings trigger */}
      <S2DWorkspaceToolbar loopStatus={loopStatus} signalsCount={signalsCount} />

      {/* Governance banner */}
      <Card className="border-mlk/20 bg-mlk/5">
        <CardContent className="p-3 text-xs text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-mlk mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-foreground">Data Boundary Governance (MUST ENFORCE):</strong> PERMITTED: public social signals,
            aggregate threat scores (0-100) & posture (White/Grey/Black), narrative propagation graphs, constituency-level sentiment/DUN
            metrics. PROHIBITED (stripped by <code className="bg-muted px-1 rounded">s2d-pip-context-privacy-guard</code>): individual
            voter names, IC numbers, phone/address, individual support/preference scores, direct DB writes or raw table sharing. Do NOT
            mutate PIP data stores directly.
          </div>
        </CardContent>
      </Card>

      {/* View switcher — Intelligence (S2D-360) — inspired by S2D-workspace-code navigation workspaces */}
      <Segmented
        value={view}
        onChange={(v) => setView(v as ModernView)}
        options={[
          { value: "engine" as const, label: "Engine", icon: Brain },
          { value: "brief" as const, label: "Daily Brief", icon: FileText },
          { value: "sentiment" as const, label: "Sentiment", icon: BarChart3 },
          { value: "profiles" as const, label: "Local Profiles", icon: MapPinned },
          { value: "alerts" as const, label: "Alerts", icon: Bell },
          { value: "narrative" as const, label: "Narrative Graph", icon: Share2 },
          { value: "constituency" as const, label: "Constituency", icon: MapPin },
          { value: "forecast" as const, label: "Forecast", icon: Target },
        ]}
      />

      {/* Mounted modern components */}
      <div className="min-h-[520px]">
        {view === "engine" && (
          <div className="space-y-3">
            <Card className="border-mlk/20">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-mlk mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4" /> S2D360Engine — current upstream Vite bundle
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  The full S2D-360 Vite build is served from <code className="bg-muted px-1 rounded">/s2d-360/</code> by OpenNext static assets. PIP intelligence, credentials, and scraping use Worker APIs; advanced upstream operations that require the standalone Node service remain read-only/unavailable until an authorized proxy is connected. Nmap/TShark pages use truthful NOT_RUN fixtures and <code className="bg-muted px-1 rounded">S2D_ACTIVE_SECURITY_SCAN_ENABLED=false</code>.
                </p>
                <S2D360EngineWrapper />
              </CardContent>
            </Card>

            <Card className="border-mlk/20">
              <CardContent className="p-3 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  <strong className="text-foreground">Cloudflare Edge Deployment</strong> — OpenNext serves the Vite bundle and App Router APIs from one origin. Browser cache stays in IndexedDB; production credentials must use Wrangler secrets because dynamic vault entries are isolate-local. Active PCAP/security binaries require an external authorized service.
                </span>
                <a href="/s2d-360/" target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-mlk hover:underline flex-shrink-0">
                  Open dist/ <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          </div>
        )}
        {view === "brief" && <S2DDailyIntelligenceBriefPage />}
        {view === "sentiment" && <S2DSentimentSnapshotsPage />}
        {view === "profiles" && <S2DLocalSignalProfilesPage />}
        {view === "alerts" && <S2DAlertCenterPage />}
        {view === "narrative" && <S2DNarrativePropagationGraphPage />}
        {view === "constituency" && <S2DConstituencyIntelligenceReportPage />}
        {view === "forecast" && <S2DForecastingPage />}
      </div>

      <Card className="border-mlk/20">
        <CardContent className="p-2 text-[11px] text-muted-foreground flex items-center gap-2">
          <Radio className="h-3 w-3 text-emerald-500" />
          S2D Intelligence API client:{" "}
          <code className="bg-muted px-1 rounded">src/integration/pip360/api/s2d-intelligence-api-client.js</code> → same-origin Worker APIs · optional server-side <code className="bg-muted px-1 rounded">S2D_ENGINE_URL</code> for local Express integration · restricted CORS
        </CardContent>
      </Card>
    </div>
  );
}

export default S2DModernTab;
