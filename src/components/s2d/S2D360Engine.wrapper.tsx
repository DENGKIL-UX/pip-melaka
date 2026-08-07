"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Brain, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// The monolith is preserved as a buildable stub at src/S2D360Engine.clean.jsx
// The real 208KB / 4030-line original is at vendor/s2d-360/S2D360Engine.clean.jsx for audit.
// This wrapper provides dynamic ssr:false loading with iframe fallback to /public/s2d-360/ dist/.

const S2D360EngineClean = dynamic(
  () => import("@/S2D360Engine.clean").then((m) => ({ default: (m as any).default || (() => <div>Engine loaded</div>) })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-mlk" />
        <span className="text-sm">Loading S2D 360 Engine… (monolith 4030 lines, stub)</span>
      </div>
    ),
  }
);

interface Props {
  fallbackToIframe?: boolean;
  deepLink?: string;
}

function IframeFallback({ deepLink }: { deepLink?: string }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  return (
    <div className="relative">
      {!iframeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-6 w-6 animate-spin text-mlk" />
        </div>
      )}
      <iframe
        src={deepLink ? `/s2d-360/${deepLink}` : "/s2d-360/"}
        className="w-full h-[720px] border rounded-lg"
        onLoad={() => setIframeLoaded(true)}
        title="S2D 360 Engine — dist/ via Cloudflare Pages"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-emerald-500" /> Served via Cloudflare Pages static assets (dist/ build — zero frontend changes needed)
        <a href="/s2d-360/" target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-mlk hover:underline">
          Open full engine <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export function S2D360Engine({ fallbackToIframe = true, deepLink }: Props) {
  const [useIframe, setUseIframe] = useState(false);

  if (useIframe) {
    return <IframeFallback deepLink={deepLink} />;
  }

  return (
    <div className="s2d-engine-root">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Brain className="h-3 w-3 text-mlk" /> S2D360Engine.clean.jsx — monolith mounted as-is (stub for build, original at vendor/s2d-360/, iframe fallback to dist/)
        <span className="ml-2 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">src/S2D360Engine.clean.jsx (4030 lines)</span>
        <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setUseIframe(true)}>
          Switch to iframe (dist/)
        </Button>
      </div>
      <Card className="border-mlk/20">
        <CardContent className="p-0">
          <S2D360EngineClean />
          <div className="p-3 border-t bg-muted/20 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Also available as full dist/ iframe (Vite build → Cloudflare Pages)</span>
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setUseIframe(true)}>
              Load full engine iframe
            </Button>
          </div>
        </CardContent>
      </Card>
      {fallbackToIframe && (
        <div className="mt-3">
          <IframeFallback deepLink={deepLink} />
        </div>
      )}
    </div>
  );
}

export default S2D360Engine;
