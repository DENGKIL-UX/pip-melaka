"use client";

import { useEffect } from "react";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard";
import { useDashboardStore } from "@/stores/dashboard-store";

export default function Home() {
  const landed = useDashboardStore((s) => s.landed);
  const setLanded = useDashboardStore((s) => s.setLanded);

  // Persist landed state across page reloads
  useEffect(() => {
    const saved = localStorage.getItem("pip-mlk-landed");
    if (saved === "true") setLanded(true);
  }, [setLanded]);

  if (!landed) {
    return <LandingPage onEnter={() => {
      setLanded(true);
      localStorage.setItem("pip-mlk-landed", "true");
    }} />;
  }

  return <Dashboard onExit={() => {
    setLanded(false);
    localStorage.removeItem("pip-mlk-landed");
  }} />;
}
