// ponytail: MLK — Digital Brain module barrel export.
// Public surface: <Brain /> wrapper Card + 4-lens tabs + SVG graph + side panel.
//
// Lazy-loading: `Brain` is a `"use client"` component. The dashboard shell
// mounts it directly (no SSR-disabled dynamic import needed — d3-force is
// dynamic-imported inside the BrainGraph useEffect, so the SSR bundle stays
// clean). See DESIGN.md §2.3 row 3.

export { Brain, default } from "./brain";
export type { BrainProps } from "./brain";

export { BrainGraph } from "./brain-graph";
export type { BrainGraphProps, BrainNode, BrainEdge } from "./brain-graph";

export { BrainLensTabs } from "./brain-lens-tabs";
export type { BrainLensTabsProps } from "./brain-lens-tabs";

export { BrainSidePanel } from "./brain-side-panel";
export type { BrainSidePanelProps } from "./brain-side-panel";
