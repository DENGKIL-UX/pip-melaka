// src/hooks/use-s2d-alerts.tsx
// P3.3 — real-time S2D signal alerts.
//
// Fires a toast when a NEW critical S2D signal is added to the store after
// mount. This is fully dependency-free: it subscribes to the Zustand store,
// so it works with zero networking (dev, Cloudflare Workers, anywhere).
//
// Cross-client fan-out (other analysts seeing this client's new signals and
// vice-versa) needs a WebSocket transport — `src/lib/websocket-server.ts`
// (socket.io, port 3003) already implements that and will start broadcasting
// `signal:new` once socket.io is installed and the server is started. This
// hook degrades gracefully to its store-subscription path in every case.
//
// "use client" is required because this mounts in the browser and reads the
// client-side store.

"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useS2DStore, type S2DSignal } from "@/stores/s2d-store";

export function useS2DAlerts() {
  const { toast } = useToast();
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const seen = useRef<Set<string>>(new Set());

  const fire = (signal: Partial<S2DSignal> & { id?: string }) => {
    if (!signal.id || seen.current.has(signal.id)) return;
    seen.current.add(signal.id);
    toast({
      title: signal.title || "Critical S2D signal",
      description: signal.description,
      action: (
        <ToastAction altText="Open S2D" onClick={() => setActiveTab("s2d")}>
          Open S2D
        </ToastAction>
      ),
    });
  };

  useEffect(() => {
    // Mark pre-existing signals as already-seen so the seeded N05 critical
    // signal does NOT toast on every dashboard open — only genuinely new ones.
    for (const s of useS2DStore.getState().signals) {
      if (s.id) seen.current.add(s.id);
    }

    const unsubscribe = useS2DStore.subscribe((state, prevState) => {
      for (const sig of state.signals) {
        if (sig.severity !== "critical") continue;
        const isNew = !prevState.signals.some((p) => p.id === sig.id);
        if (isNew) fire(sig);
      }
    });

    return unsubscribe;
  }, []);
}
