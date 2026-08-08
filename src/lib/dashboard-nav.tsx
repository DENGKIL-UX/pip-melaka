"use client";

/**
 * Shared dashboard navigation config.
 *
 * Centralises the tab list + grouping so the shell (dashboard.tsx) and the
 * sidebar navigation (dashboard/sidebar-nav.tsx) always stay in sync.
 * UI-UX: grouped, labelled sections + progressive disclosure (award-winning IA).
 */
import { LayoutDashboard, Map as MapIcon, Box, Vote, Users, TrendingUp, ShieldAlert, ArrowLeftRight, Activity, Brain, Radar, MessageSquare, AlertTriangle, Layers3, Sparkle, FileText, Bell, ShieldCheck } from "lucide-react";
import type { DashboardTab } from "@/stores/dashboard-store";

export interface NavTab {
  id: DashboardTab;
  label: string;
  i18nKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Light "progressive-disclosure": a tab can be collapsed under its group by default. */
  featured?: boolean;
}

export const TABS: NavTab[] = [
  { id: "overview", label: "Overview", i18nKey: "tab.overview", icon: LayoutDashboard, featured: true },
  { id: "map-2d", label: "2D Map", i18nKey: "tab.map2d", icon: MapIcon, featured: true },
  { id: "map-3d", label: "3D Map", i18nKey: "tab.map3d", icon: Box },
  { id: "elections", label: "Elections", i18nKey: "tab.elections", icon: Vote, featured: true },
  { id: "demographics", label: "Demographics", i18nKey: "tab.demographics", icon: Users },
  { id: "analysis", label: "DPT Analysis", i18nKey: "tab.analysis", icon: TrendingUp },
  { id: "risk", label: "Risk + Socio", i18nKey: "tab.risk", icon: ShieldAlert },
  { id: "compare", label: "Compare", i18nKey: "tab.compare", icon: ArrowLeftRight },
  { id: "s2d", label: "S2D Console (Legacy)", i18nKey: "tab.s2d", icon: Activity },
  { id: "s2d-360", label: "S2D 360 (Legacy)", i18nKey: "tab.s2d360", icon: Brain },
  { id: "s2d-modern", label: "S2D 360 Modern", i18nKey: "tab.s2dModern", icon: Brain, featured: true },
  { id: "scraper", label: "Scraper", i18nKey: "tab.scraper", icon: Radar },
  { id: "public-comm", label: "Public Comm", i18nKey: "tab.publicComm", icon: MessageSquare },
  { id: "incidents", label: "Incidents", i18nKey: "tab.incidents", icon: AlertTriangle },
  { id: "scenarios", label: "Scenarios", i18nKey: "tab.scenarios", icon: Layers3 },
  { id: "predictive", label: "Predictive", i18nKey: "tab.predictive", icon: Sparkle },
  { id: "insights", label: "Insights", i18nKey: "tab.insights", icon: FileText },
  { id: "alerts", label: "Alerts", i18nKey: "tab.alerts", icon: Bell },
  { id: "dual-layer", label: "Dual-Layer", i18nKey: "tab.dualLayer", icon: Layers3 },
  { id: "governance", label: "Governance", i18nKey: "tab.governance", icon: ShieldCheck },
];

export interface NavGroup {
  label: string;
  /** i18n key for the group label, falls back to label. */
  i18nKey: string;
  ids: DashboardTab[];
}

export const TAB_GROUPS: NavGroup[] = [
  { label: "Overview", i18nKey: "group.overview", ids: ["overview"] },
  { label: "Maps", i18nKey: "group.maps", ids: ["map-2d", "map-3d"] },
  { label: "Elections", i18nKey: "group.elections", ids: ["elections", "demographics", "analysis", "compare"] },
  { label: "Intelligence", i18nKey: "group.intelligence", ids: ["s2d-modern", "s2d", "s2d-360", "scraper", "insights", "predictive"] },
  { label: "Operations", i18nKey: "group.operations", ids: ["public-comm", "incidents", "scenarios", "alerts", "dual-layer"] },
  { label: "Governance", i18nKey: "group.governance", ids: ["risk", "governance"] },
];

export function findTab(id: DashboardTab): NavTab | undefined {
  return TABS.find((t) => t.id === id);
}
