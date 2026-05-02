import type { MaterialFinish } from "./types";

/**
 * NEUTRAL_BASE is the color used for procedural texture generation
 * when a color tint is applied. The texture provides surface detail (weave, grain, brushing)
 * while material.color provides the actual color via multiplication.
 */
const NEUTRAL_BASE = "#E0E0E0";

export const MATERIAL_FINISHES: MaterialFinish[] = [
  // ─── WOOD — tintable (acts like paint/stain over grain) ─
  { id: "wood_oak", family: "wood", displayName: "Natural Oak", baseMaterialId: "oak", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#C4A265", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_walnut", family: "wood", displayName: "Walnut", baseMaterialId: "walnut", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#5C4033", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_pine", family: "wood", displayName: "Pine", baseMaterialId: "pine", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#DEB887", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_maple", family: "wood", displayName: "Maple", baseMaterialId: "maple", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#E8D5B7", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_cherry", family: "wood", displayName: "Cherry", baseMaterialId: "cherry", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#9B4722", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_birch", family: "wood", displayName: "Birch", baseMaterialId: "birch", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#F5E6CC", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_teak", family: "wood", displayName: "Teak", baseMaterialId: "teak", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#8B6914", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_mahogany", family: "wood", displayName: "Mahogany", baseMaterialId: "mahogany", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#6B3A2A", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_ash", family: "wood", displayName: "Ash", baseMaterialId: "ash", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#D6C6A5", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_bamboo", family: "wood", displayName: "Bamboo", baseMaterialId: "bamboo", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#C9B76C", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_ebony", family: "wood", displayName: "Ebony", baseMaterialId: "ebony", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#3C2415", defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_painted", family: "wood", displayName: "Painted Wood", baseMaterialId: "oak", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#FAFAFA", defaultRoughness: 0.5, defaultMetalness: 0 },

  // ─── ENGINEERED ────────────────────────────────────────
  { id: "eng_mdf", family: "engineered", displayName: "MDF", baseMaterialId: "mdf", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#C8B89A", defaultRoughness: 0.7, defaultMetalness: 0 },
  { id: "eng_plywood", family: "engineered", displayName: "Plywood", baseMaterialId: "plywood", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#D4B896", defaultRoughness: 0.75, defaultMetalness: 0 },
  { id: "eng_melamine", family: "engineered", displayName: "Melamine", baseMaterialId: "melamine_white", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#F5F5F5", defaultRoughness: 0.4, defaultMetalness: 0.05 },
  { id: "eng_laminate", family: "engineered", displayName: "Laminate", baseMaterialId: "laminate_oak", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#C9A96E", defaultRoughness: 0.5, defaultMetalness: 0 },

  // ─── FABRIC — tintable ─────────────────────────────────
  { id: "fabric_linen", family: "fabric", displayName: "Linen", baseMaterialId: "fabric_cream", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#F5E6D3", defaultRoughness: 0.95, defaultMetalness: 0, sheenAmount: 0.054 },
  { id: "fabric_velvet", family: "fabric", displayName: "Velvet", baseMaterialId: "velvet_navy", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#1B3A5C", defaultRoughness: 0.95, defaultMetalness: 0, sheenAmount: 0.125 },
  { id: "fabric_cotton", family: "fabric", displayName: "Cotton", baseMaterialId: "fabric_cream", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#F5EFE0", defaultRoughness: 0.95, defaultMetalness: 0, sheenAmount: 0.04 },
  { id: "fabric_plaid", family: "fabric", displayName: "Plaid", baseMaterialId: "fabric_plaid_blue", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#5A6B88", defaultRoughness: 0.94, defaultMetalness: 0, sheenAmount: 0.048 },
  { id: "fabric_cane", family: "fabric", displayName: "Cane Weave", baseMaterialId: "cane_natural", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#D4C4A0", defaultRoughness: 0.92, defaultMetalness: 0, sheenAmount: 0.028 },

  // ─── LEATHER — tintable ────────────────────────────────
  { id: "leather_natural", family: "leather", displayName: "Leather", baseMaterialId: "leather_brown", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#8B5E3C", defaultRoughness: 0.85, defaultMetalness: 0, sheenAmount: 0.05 },

  // ─── METAL — tintable (acts like powder-coat/paint) ────
  { id: "metal_steel", family: "metal", displayName: "Brushed Steel", baseMaterialId: "steel", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#71797E", defaultRoughness: 0.2, defaultMetalness: 0.9, anisotropyAmount: 0.7 },
  { id: "metal_chrome", family: "metal", displayName: "Chrome", baseMaterialId: "chrome", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#C0C0C0", defaultRoughness: 0.1, defaultMetalness: 0.95 },
  { id: "metal_brass", family: "metal", displayName: "Brass", baseMaterialId: "brass", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#B5A642", defaultRoughness: 0.25, defaultMetalness: 0.9 },
  { id: "metal_gold", family: "metal", displayName: "Gold", baseMaterialId: "gold", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#D4AF37", defaultRoughness: 0.2, defaultMetalness: 0.9 },
  { id: "metal_copper", family: "metal", displayName: "Copper", baseMaterialId: "copper", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#B87333", defaultRoughness: 0.25, defaultMetalness: 0.9 },
  { id: "metal_bronze", family: "metal", displayName: "Bronze", baseMaterialId: "bronze", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#8C7853", defaultRoughness: 0.3, defaultMetalness: 0.85 },
  { id: "metal_rose_gold", family: "metal", displayName: "Rose Gold", baseMaterialId: "rose_gold", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#B76E79", defaultRoughness: 0.2, defaultMetalness: 0.9 },
  { id: "metal_painted", family: "metal", displayName: "Painted Metal", baseMaterialId: "black_metal", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#333333", defaultRoughness: 0.5, defaultMetalness: 0.7 },

  // ─── GLASS — NOT tintable (transmission, not surface color) ──
  { id: "glass_clear", family: "glass", displayName: "Clear Glass", baseMaterialId: "glass", textureBaseColor: "#E0F0FF", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.1, defaultMetalness: 0.1 },
  { id: "glass_frosted", family: "glass", displayName: "Frosted Glass", baseMaterialId: "frosted_glass", textureBaseColor: "#E8EEF2", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.4, defaultMetalness: 0.1 },
  { id: "glass_tinted", family: "glass", displayName: "Tinted Glass", baseMaterialId: "tinted_glass", textureBaseColor: "#A8C4D8", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.1, defaultMetalness: 0.1 },
  { id: "glass_mirror", family: "glass", displayName: "Mirror", baseMaterialId: "mirror", textureBaseColor: "#D8E8F0", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.05, defaultMetalness: 0.9 },

  // ─── STONE — tintable (acts like paint/epoxy coat) ─────
  { id: "stone_marble_white", family: "stone", displayName: "White Marble", baseMaterialId: "marble_white", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#F0EDE8", defaultRoughness: 0.6, defaultMetalness: 0.1 },
  { id: "stone_marble_black", family: "stone", displayName: "Black Marble", baseMaterialId: "marble_black", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#2D2D2D", defaultRoughness: 0.6, defaultMetalness: 0.1 },
  { id: "stone_granite", family: "stone", displayName: "Granite", baseMaterialId: "granite", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#808080", defaultRoughness: 0.65, defaultMetalness: 0.1 },
  { id: "stone_concrete", family: "stone", displayName: "Concrete", baseMaterialId: "concrete", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#B0B0B0", defaultRoughness: 0.75, defaultMetalness: 0.05 },
  { id: "stone_terrazzo", family: "stone", displayName: "Terrazzo", baseMaterialId: "terrazzo", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#E8DDD0", defaultRoughness: 0.6, defaultMetalness: 0.1 },

  // ─── PLASTIC — tintable ────────────────────────────────
  { id: "plastic_matte", family: "plastic", displayName: "Matte Plastic", baseMaterialId: "acrylic_clear", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#FAFAFA", defaultRoughness: 0.6, defaultMetalness: 0.05 },
];

/** Look up a finish by id */
export function getFinish(finishId: string): MaterialFinish | undefined {
  return MATERIAL_FINISHES.find((f) => f.id === finishId);
}

/** Get tintable finishes for the picker */
export function getTintableFinishes(): MaterialFinish[] {
  return MATERIAL_FINISHES.filter((f) => f.acceptsColorTint);
}
