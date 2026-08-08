"use client";

/**
 * SidebarNav — grouped, collapsible dashboard navigation.
 *
 * Award-winning IA (UI-UX audit §4-P0): replaces the 20-flat-tab top bar with a
 * labelled, progressively-disclosed sidebar. Groups auto-expand to reveal the
 * active tab; the rest collapse to keep the rail calm. Keyboard accessible
 * (role="tree" semantics via buttons) and fully responsive (desktop rail in the
 * shell, drawer variant for mobile in the header).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useDashboardStore, type DashboardTab } from "@/stores/dashboard-store";
import { useI18n } from "@/lib/i18n";
import { TABS, TAB_GROUPS, findTab, type NavGroup } from "@/lib/dashboard-nav";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { activeTab, setActiveTab } = useDashboardStore();
  const { t } = useI18n();

  // All navigation groups start collapsed by default so the sidebar remains compact.
  // The user can click a section header to toggle its open/collapsed state.
  const [opened, setOpened] = useState<Set<string>>(() => new Set());

  const isOpen = (label: string) => opened.has(label);

  const toggle = (label: string) => {
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <nav aria-label="Dashboard sections" className="space-y-5 py-1">
      {TAB_GROUPS.map((group) => {
        const groupOpen = isOpen(group.label);
        return (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => toggle(group.label)}
              aria-expanded={groupOpen}
              className={`group flex w-full items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                group.ids.includes(activeTab)
                  ? "text-mlk"
                  : "text-muted-foreground/70 hover:text-mlk"
              }`}
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${groupOpen ? "" : "-rotate-90"}`}
                aria-hidden="true"
              />
              <span className="truncate">{t(group.i18nKey, group.label)}</span>
            </button>
            <AnimatePresence initial={false}>
              {groupOpen && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden space-y-0.5 mt-0.5"
                >
                  {group.ids.map((tabId) => {
                    const tab = findTab(tabId);
                    if (!tab) return null;
                    const Icon = tab.icon;
                    const isActive = activeTab === tabId;
                    return (
                      <li key={tabId}>
                        <button
                          type="button"
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => {
                            setActiveTab(tabId);
                            onNavigate?.();
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-mlk text-white shadow-md shadow-mlk/25"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          }`}
                        >
                          <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "" : "text-mlk/70"}`} aria-hidden="true" />
                          <span className="truncate text-left">{t(tab.i18nKey, tab.label)}</span>
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Compact horizontal scrollable pill strip for very narrow / in-content use.
 * Not used in the shell by default — retained for flexibility.
 */
export function PillStripNav({ onNavigate }: { onNavigate?: () => void }) {
  const { activeTab, setActiveTab } = useDashboardStore();
  const { t } = useI18n();
  const active = findTab(activeTab);
  void active;
  return (
    <div className="flex flex-wrap gap-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as DashboardTab);
              onNavigate?.();
            }}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all ${
              isActive ? "bg-mlk text-white shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t(tab.i18nKey, tab.label)}</span>
          </button>
        );
      })}
    </div>
  );
}

// Re-export type helper for callers
export type { NavGroup };
