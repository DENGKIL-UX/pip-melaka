"use client";

// ponytail: MLK — Bookmark button. A star icon that toggles bookmark state.
// Used in the SelectedDunDrawer + parliament cards.

import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useBookmarksStore, type Bookmark } from "@/stores/bookmarks-store";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  bookmark: Omit<Bookmark, "ts">;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "ghost" | "outline" | "default";
  showLabel?: boolean;
}

export function BookmarkButton({
  bookmark,
  className,
  size = "icon",
  variant = "ghost",
  showLabel = false,
}: BookmarkButtonProps) {
  const isBookmarked = useBookmarksStore((s) => s.bookmarks.some((x) => x.id === bookmark.id));
  const toggleBookmark = useBookmarksStore((s) => s.toggleBookmark);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleBookmark({ ...bookmark, ts: new Date().toISOString() });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "transition-colors",
        isBookmarked ? "text-mlk hover:text-mlk-amber-dark" : "text-muted-foreground hover:text-mlk",
        className
      )}
      aria-label={isBookmarked ? `Remove bookmark for ${bookmark.label}` : `Bookmark ${bookmark.label}`}
      aria-pressed={isBookmarked}
      title={isBookmarked ? "Bookmarked (click to remove)" : "Click to bookmark"}
    >
      <Star
        className={cn("h-4 w-4", isBookmarked && "fill-current")}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="ms-1 text-xs">{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
      )}
    </Button>
  );
}
