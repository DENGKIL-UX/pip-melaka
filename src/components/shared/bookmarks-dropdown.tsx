"use client";

// ponytail: MLK — Bookmarks dropdown.
// New feature (round 5): a star icon in the dashboard header that opens a
// dropdown showing all bookmarked DUNs/parliaments. Each item has a remove
// button + click-to-navigate. Includes "Clear all" + empty state.

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, X, Trash2, MapPin } from "lucide-react";
import { useBookmarksStore } from "@/stores/bookmarks-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { cn } from "@/lib/utils";

export function BookmarksDropdown({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bookmarks = useBookmarksStore((s) => s.bookmarks);
  const removeBookmark = useBookmarksStore((s) => s.removeBookmark);
  const clearAll = useBookmarksStore((s) => s.clearAll);
  const { setSelectedParliament, setSelectedDun, setActiveTab } = useDashboardStore();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleBookmarkClick = (bookmark: typeof bookmarks[0]) => {
    if (bookmark.type === "dun" && bookmark.parliament && bookmark.dun && bookmark.dunName) {
      setSelectedParliament(bookmark.parliament);
      setSelectedDun({ parliament: bookmark.parliament, dun: bookmark.dun, name: bookmark.dunName });
      setActiveTab("demographics");
    } else if (bookmark.type === "parliament" && bookmark.parliament) {
      setSelectedParliament(bookmark.parliament);
      setActiveTab("demographics");
    }
    setOpen(false);
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeBookmark(id);
  };

  const handleClearAll = () => {
    if (confirm("Remove all bookmarks? This cannot be undone.")) {
      clearAll();
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Bookmarks: ${bookmarks.length} saved${bookmarks.length === 0 ? " (empty)" : ""}`}
        aria-expanded={open}
      >
        <Star className="h-4 w-4" />
        {bookmarks.length > 0 && (
          <span
            className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-mlk"
            aria-hidden="true"
          >
            {bookmarks.length}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute end-0 mt-2 w-72 sm:w-80 rounded-lg border border-mlk/30 bg-card shadow-2xl z-50 overflow-hidden"
          role="dialog"
          aria-label="Bookmarks panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-mlk/10 to-transparent">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-mlk" aria-hidden="true" />
              <span className="text-sm font-semibold">Bookmarks</span>
              {bookmarks.length > 0 && (
                <Badge variant="outline" className="text-[10px]">{bookmarks.length}</Badge>
              )}
            </div>
            {bookmarks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-red-500"
                onClick={handleClearAll}
                aria-label="Clear all bookmarks"
              >
                <Trash2 className="h-3 w-3 me-1" aria-hidden="true" />
                Clear all
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-mlk">
            {bookmarks.length === 0 ? (
              <div className="p-6 text-center">
                <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                <div className="text-sm font-medium">No bookmarks yet</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Click the <Star className="inline h-3 w-3" aria-hidden="true" /> star icon in the DUN drawer to save quick-access bookmarks.
                </div>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border/50">
                {bookmarks.map((b) => (
                  <li key={b.id}>
                    <div
                      className="flex items-center gap-2 p-2.5 hover:bg-mlk/5 transition-colors group cursor-pointer"
                      onClick={() => handleBookmarkClick(b)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") handleBookmarkClick(b); }}
                      aria-label={`${b.type === "dun" ? "DUN" : "Parliament"}: ${b.label}. Click to navigate.`}
                    >
                      <div className="flex-shrink-0 p-1 rounded-full bg-mlk/15 text-mlk" aria-hidden="true">
                        <MapPin className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{b.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{b.hint}</div>
                      </div>
                      <button
                        onClick={(e) => handleRemove(b.id, e)}
                        className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove bookmark for ${b.label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {bookmarks.length > 0 && (
            <div className="p-2 border-t border-border bg-muted/30 text-center">
              <span className="text-[10px] text-muted-foreground">
                Click a bookmark to navigate · Hover to remove
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
