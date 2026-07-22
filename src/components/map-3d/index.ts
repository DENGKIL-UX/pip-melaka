// ponytail: MLK — 3D Map module barrel export.
// Public surface: <Map3D /> component + scene/extrusion helpers.
//
// Lazy-loading: `Map3D` is a `"use client"` component. Consumers that want
// SSR-disabled mounting should use `next/dynamic` with `ssr: false` in a
// Client Component wrapper (Three.js touches `window` / `WebGL` at import
// time). The dashboard shell does this — see DESIGN.md §2.3 row 2.

export { Map3D, default } from "./map-3d";
export type { Map3DProps } from "./map-3d";

export { TimelineControls } from "./timeline-controls";
export type { TimelineControlsProps } from "./timeline-controls";

export {
  // Scene setup
  createScene,
  type SceneBundle,
  type SceneOptions,
} from "./scene-setup";

export {
  // Extrusions + scenario morph
  buildTerrain,
  buildAllDunExtrusions,
  buildParlimenOutlines,
  computeScenarioMorphPlan,
  geometryCentroid3D,
  geometryBounds3D,
  projectLatLng,
  parseJsonl,
  HEIGHT_SCALE,
  MLK_CENTER_LAT,
  MLK_CENTER_LNG,
  PARLIMEN_OUTLINE_COLOR,
  type DunFeatureProps,
  type ParlimenFeatureProps,
  type GeoJSONFeature,
  type GeoJSONFC,
  type DunIntelligenceRow,
  type ElectionDunResult,
  type ElectionParlResult,
  type ElectionsDoc,
  type DunExtrusionSpec,
  type BuiltDunExtrusion,
  type BuiltParlimenOutline,
  type ScenarioId,
  type ProjSubScenarioId,
  type ScenarioMorphPlan,
  type DunScenarioState,
} from "./extrusions";

export {
  buildScatter,
  indexDunCentroids,
  SCATTER_COLORS,
  type LocalityRow,
  type BuiltScatter,
} from "./scatter";

export {
  buildHudRing,
  HUD_RING_COLOR,
  HUD_RING_RADIUS,
  type BuiltHudRing,
} from "./hud-ring";

export {
  buildLabel,
  buildDunLabels,
  buildParlimenLabels,
  clearLabelTextureCache,
  LABEL_DUN_COLOR,
  LABEL_PARL_COLOR,
  type LabelSpec,
  type BuiltLabel,
} from "./labels";
