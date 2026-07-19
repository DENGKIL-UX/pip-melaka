"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const SHORTCUTS = [
  { keys: "Alt+1–9", desc: "Navigate to tabs 1-9" },
  { keys: "Alt+0", desc: "Navigate to tab 10 (S2D 360)" },
  { keys: "Alt+-", desc: "Navigate to tab 11 (Governance)" },
  { keys: "Cmd+K / Ctrl+K", desc: "Open command palette" },
  { keys: "?", desc: "Show this cheat sheet" },
  { keys: "Esc", desc: "Close overlays" },
];

export function ShortcutCheatSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-mlk">⌨️</span> Keyboard Shortcuts
            <Badge variant="outline" className="ml-auto text-[10px]">{SHORTCUTS.length} shortcuts</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{s.desc}</span>
              <kbd className="font-mono text-xs px-2 py-1 rounded border border-border bg-muted">{s.keys}</kbd>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground text-center mt-2">
          Press <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-muted">?</kbd> anytime to toggle this sheet
        </div>
      </DialogContent>
    </Dialog>
  );
}
