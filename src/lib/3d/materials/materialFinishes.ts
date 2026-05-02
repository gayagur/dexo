import type { MaterialFinish } from "./types";

/**
 * NEUTRAL_BASE is the color used for procedural texture generation
 * when a finish is tintable. The texture provides surface detail (weave, grain)
 * while material.color provides the actual color via multiplication.
 */
const NEUTRAL_BASE = "#E0E0E0";

export const MATERIAL_FINISHES: MaterialFinish[] = [
  // ─── WOOD — natural, non-tintable ──────────────────────
  { id: "wood_oak", family: "wood", displayName: "Natural Oak", baseMaterialId: "oak", textureBaseColor: "#C4A265", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_walnut", family: "wood", displayName: "Walnut", baseMaterialId: "walnut", textureBaseColor: "#5C4033", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_pine", family: "wood", displayName: "Pine", baseMaterialId: "pine", textureBaseColor: "#DEB887", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_maple", family: "wood", displayName: "Maple", baseMaterialId: "maple", textureBaseColor: "#E8D5B7", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_cherry", family: "wood", displayName: "Cherry", baseMaterialId: "cherry", textureBaseColor: "#9B4722", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_birch", family: "wood", displayName: "Birch", baseMaterialId: "birch", textureBaseColor: "#F5E6CC", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_teak", family: "wood", displayName: "Teak", baseMaterialId: "teak", textureBaseColor: "#8B6914", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_mahogany", family: "wood", displayName: "Mahogany", baseMaterialId: "mahogany", textureBaseColor: "#6B3A2A", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_ash", family: "wood", displayName: "Ash", baseMaterialId: "ash", textureBaseColor: "#D6C6A5", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_bamboo", family: "wood", displayName: "Bamboo", baseMaterialId: "bamboo", textureBaseColor: "#C9B76C", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  { id: "wood_ebony", family: "wood", displayName: "Ebony", baseMaterialId: "ebony", textureBaseColor: "#3C2415", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.8, defaultMetalness: 0 },
  // Painted wood — tintable
  { id: "wood_painted", family: "wood", displayName: "Painted Wood", baseMaterialId: "oak", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#FAFAFA", defaultRoughness: 0.5, defaultMetalness: 0 },

  // ─── ENGINEERED ────────────────────────────────────────
  { id: "eng_mdf", family: "engineered", displayName: "MDF", baseMaterialId: "mdf", textureBaseColor: "#C8B89A", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.7, defaultMetalness: 0 },
  { id: "eng_plywood", family: "engineered", displayName: "Plywood", baseMaterialId: "plywood", textureBaseColor: "#D4B896", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.75, defaultMetalness: 0 },
  { id: "eng_melamine", family: "engineered", displayName: "Melamine", baseMaterialId: "melamine_white", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#F5F5F5", defaultRoughness: 0.4, defaultMetalness: 0.05 },
  { id: "eng_laminate", family: "engineered", displayName: "Laminate", baseMaterialId: "laminate_oak", textureBaseColor: "#C9A96E", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.5, defaultMetalness: 0 },

  // ─── FABRIC — tintable ─────────────────────────────────
  { id: "fabric_linen", family: "fabric", displayName: "Linen", baseMaterialId: "fabric_cream", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#F5E6D3", defaultRoughness: 0.95, defaultMetalness: 0, sheenAmount: 0.054 },
  { id: "fabric_velvet", family: "fabric", displayName: "Velvet", baseMaterialId: "velvet_navy", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#1B3A5C", defaultRoughness: 0.95, defaultMetalness: 0, sheenAmount: 0.125 },
  { id: "fabric_cotton", family: "fabric", displayName: "Cotton", baseMaterialId: "fabric_cream", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#F5EFE0", defaultRoughness: 0.95, defaultMetalness: 0, sheenAmount: 0.04 },
  { id: "fabric_plaid", family: "fabric", displayName: "Plaid", baseMaterialId: "fabric_plaid_blue", textureBaseColor: "#5A6B88", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.94, defaultMetalness: 0, sheenAmount: 0.048 },
  { id: "fabric_cane", family: "fabric", displayName: "Cane Weave", baseMaterialId: "cane_natural", textureBaseColor: "#D4C4A0", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.92, defaultMetalness: 0, sheenAmount: 0.028 },

  // ─── LEATHER — tintable ────────────────────────────────
  { id: "leather_natural", family: "leather", displayName: "Leather", baseMaterialId: "leather_brown", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#8B5E3C", defaultRoughness: 0.85, defaultMetalness: 0, sheenAmount: 0.05 },

  // ─── METAL ─────────────────────────────────────────────
  { id: "metal_steel", family: "metal", displayName: "Brushed Steel", baseMaterialId: "steel", textureBaseColor: "#71797E", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.2, defaultMetalness: 0.9, anisotropyAmount: 0.7 },
  { id: "metal_chrome", family: "metal", displayName: "Chrome", baseMaterialId: "chrome", textureBaseColor: "#C0C0C0", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.1, defaultMetalness: 0.95 },
  { id: "metal_brass", family: "metal", displayName: "Brass", baseMaterialId: "brass", textureBaseColor: "#B5A642", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.25, defaultMetalness: 0.9 },
  { id: "metal_gold", family: "metal", displayName: "Gold", baseMaterialId: "gold", textureBaseColor: "#D4AF37", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.2, defaultMetalness: 0.9 },
  { id: "metal_copper", family: "metal", displayName: "Copper", baseMaterialId: "copper", textureBaseColor: "#B87333", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.25, defaultMetalness: 0.9 },
  { id: "metal_bronze", family: "metal", displayName: "Bronze", baseMaterialId: "bronze", textureBaseColor: "#8C7853", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.3, defaultMetalness: 0.85 },
  { id: "metal_rose_gold", family: "metal", displayName: "Rose Gold", baseMaterialId: "rose_gold", textureBaseColor: "#B76E79", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.2, defaultMetalness: 0.9 },
  // Painted metal — tintable
  { id: "metal_painted", family: "metal", displayName: "Painted Metal", baseMaterialId: "black_metal", textureBaseColor: NEUTRAL_BASE, acceptsColorTint: true, defaultColor: "#333333", defaultRoughness: 0.5, defaultMetalness: 0.7 },

  // ─── GLASS ─────────────────────────────────────────────
  { id: "glass_clear", family: "glass", displayName: "Clear Glass", baseMaterialId: "glass", textureBaseColor: "#E0F0FF", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.1, defaultMetalness: 0.1 },
  { id: "glass_frosted", family: "glass", displayName: "Frosted Glass", baseMaterialId: "frosted_glass", textureBaseColor: "#E8EEF2", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.4, defaultMetalness: 0.1 },
  { id: "glass_tinted", family: "glass", displayName: "Tinted Glass", baseMaterialId: "tinted_glass", textureBaseColor: "#A8C4D8", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.1, defaultMetalness: 0.1 },
  { id: "glass_mirror", family: "glass", displayName: "Mirror", baseMaterialId: "mirror", textureBaseColor: "#D8E8F0", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.05, defaultMetalness: 0.9 },

  // ─── STONE ─────────────────────────────────────────────
  { id: "stone_marble_white", family: "stone", displayName: "White Marble", baseMaterialId: "marble_white", textureBaseColor: "#F0EDE8", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.6, defaultMetalness: 0.1 },
  { id: "stone_marble_black", family: "stone", displayName: "Black Marble", baseMaterialId: "marble_black", textureBaseColor: "#2D2D2D", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.6, defaultMetalness: 0.1 },
  { id: "stone_granite", family: "stone", displayName: "Granite", baseMaterialId: "granite", textureBaseColor: "#808080", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.65, defaultMetalness: 0.1 },
  { id: "stone_concrete", family: "stone", displayName: "Concrete", baseMaterialId: "concrete", textureBaseColor: "#B0B0B0", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.75, defaultMetalness: 0.05 },
  { id: "stone_terrazzo", family: "stone", displayName: "Terrazzo", baseMaterialId: "terrazzo", textureBaseColor: "#E8DDD0", acceptsColorTint: false, defaultColor: null, defaultRoughness: 0.6, defaultMetalness: 0.1 },

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
