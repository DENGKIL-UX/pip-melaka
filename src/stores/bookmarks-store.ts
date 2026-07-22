"use client";

// ponytail: MLK — Bookmarks store. Lets users star DUNs/parliaments for
// quick access. Persisted to localStorage. Safe-merged to prevent prototype
// pollution (per AGENT.md §4.1).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Bookmark {
  id: string; // e.g. "dun-134-05" or "parl-137"
  type: "dun" | "parliament";
  label: string; // e.g. "N05 Taboh Naning" or "P137 Kota Melaka"
  hint: string; // e.g. "P134 Masjid Tanah · Alor Gajah"
  parliament?: string; // parliament code
  dun?: string; // DUN code
  dunName?: string; // DUN name
  ts: string; // ISO timestamp when bookmarked
}

interface BookmarksState {
  bookmarks: Bookmark[];
  addBookmark: (b: Bookmark) => void;
  removeBookmark: (id: string) => void;
  toggleBookmark: (b: Bookmark) => void;
  isBookmarked: (id: string) => boolean;
  clearAll: () => void;
}

function safeMerge(stored: unknown, current: BookmarksState): BookmarksState {
  if (!stored || typeof stored !== "object") return current;
  const s = stored as Partial<BookmarksState>;
  return {
    ...current,
    bookmarks: Array.isArray(s.bookmarks) ? s.bookmarks : [],
  };
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      addBookmark: (b) =>
        set((st) => {
          if (st.bookmarks.some((x) => x.id === b.id)) return st;
          return { bookmarks: [b, ...st.bookmarks].slice(0, 50) }; // max 50 bookmarks
        }),
      removeBookmark: (id) =>
        set((st) => ({ bookmarks: st.bookmarks.filter((x) => x.id !== id) })),
      toggleBookmark: (b) =>
        set((st) => {
          if (st.bookmarks.some((x) => x.id === b.id)) {
            return { bookmarks: st.bookmarks.filter((x) => x.id !== b.id) };
          }
          return { bookmarks: [b, ...st.bookmarks].slice(0, 50) };
        }),
      isBookmarked: (id) => get().bookmarks.some((x) => x.id === id),
      clearAll: () => set({ bookmarks: [] }),
    }),
    {
      name: "pip-mlk-bookmarks",
      storage: createJSONStorage(() => localStorage),
      merge: (stored, current) => safeMerge(stored, current as BookmarksState),
    }
  )
);
