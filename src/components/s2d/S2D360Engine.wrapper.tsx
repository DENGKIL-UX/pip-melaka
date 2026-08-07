"use client";

import { useState } from "react";
import { Loader2, ExternalLink, ShieldCheck } from "lucide-react";

// The upstream Vite application is built with base=/s2d-360/ and served as
// same-origin static assets. Loading it in a sandboxed iframe isolates its
// IndexedDB/runtime globals from PIP while mounting the complete current
// 5,185-line engine rather than the former Next.js placeholder component.
interface Props {
  fallbackToIframe?: boolean; // retained for call-site compatibility
  deepLink?: string;
}

function engineUrl(deepLink?: string): string {
  if (!deepLink) return "/s2d-360/";
  return `/s2d-360/#${encodeURIComponent(deepLink)}`;
}

export function S2D360Engine({ deepLink }: Props) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div className="relative">
      {!iframeLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/80">
          <Loader2 className="h-6 w-6 animate-spin text-mlk" />
          <span className="ml-2 text-sm text-muted-foreground">Loading the current S2D-360 engine…</span>
        </div>
      )}
      <iframe
        src={engineUrl(deepLink)}
        className="h-[720px] w-full rounded-lg border"
        onLoad={() => setIframeLoaded(true)}
        title="S2D-360 Intelligence Engine"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        Current upstream Vite build · 63 workspaces · same-origin sandbox
        <a href={engineUrl(deepLink)} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-mlk hover:underline">
          Open full engine <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export default S2D360Engine;
