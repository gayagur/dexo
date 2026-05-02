// ─── Material Family ─────────────────────────────────────
export type MaterialFamily =
  | "wood"
  | "fabric"
  | "metal"
  | "leather"
  | "glass"
  | "stone"
  | "engineered"
  | "plastic";

// ─── Material Finish ─────────────────────────────────────
// A finish describes the physical surface: texture generation params + PBR properties.
// Color is NOT part of the finish — it's a separate tint layer.
export interface MaterialFinish {
  id: string;
  family: MaterialFamily;
  displayName: string;
  /** Which existing MATERIALS entry to use for procedural texture generation */
  baseMaterialId: string;
  /** Base color for procedural textures. For tintable finishes this is neutral/white;
   *  for natural finishes (oak, walnut) this is the material's natural color. */
  textureBaseColor: string;
  acceptsColorTint: boolean;
  defaultColor: string | null;
  defaultRoughness: number;
  defaultMetalness: number;
  sheenAmount?: number;
  anisotropyAmount?: number;
}

// ─── Panel Material (the new decoupled model) ────────────
export interface PanelMaterial {
  finishId: string;
  colorHex: string | null;
}
