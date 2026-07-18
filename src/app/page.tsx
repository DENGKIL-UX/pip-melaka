"use client";

import { useEffect, useState } from "react";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard";
import { useDashboardStore } from "@/stores/dashboard-store";

export default function Home() {
  const landed = useDashboardStore((s) => s.landed);
  const setLanded = useDashboardStore((s) => s.setLanded);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-mlk border-t-transparent" aria-label="Loading PIP-MLK" />
      </div>
    );
  }

  if (!landed) {
    return <LandingPage onEnter={() => setLanded(true)} />;
  }

  return <Dashboard onExit={() => setLanded(false)} />;
}
