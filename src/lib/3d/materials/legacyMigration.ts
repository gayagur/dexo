import type { PanelMaterial } from "./types";

/**
 * Maps every legacy materialId to new { finishId, colorHex }.
 * For natural materials (wood, stone, metal): colorHex is null (use texture as-is).
 * For colored materials (fabric_blue): colorHex is the baked-in color.
 */
const LEGACY_MAP: Record<string, PanelMaterial> = {
  // Wood — natural
  oak:        { finishId: "wood_oak", colorHex: null },
  walnut:     { finishId: "wood_walnut", colorHex: null },
  pine:       { finishId: "wood_pine", colorHex: null },
  maple:      { finishId: "wood_maple", colorHex: null },
  cherry:     { finishId: "wood_cherry", colorHex: null },
  birch:      { finishId: "wood_birch", colorHex: null },
  teak:       { finishId: "wood_teak", colorHex: null },
  mahogany:   { finishId: "wood_mahogany", colorHex: null },
  ash:        { finishId: "wood_ash", colorHex: null },
  bamboo:     { finishId: "wood_bamboo", colorHex: null },
  ebony:      { finishId: "wood_ebony", colorHex: null },

  // Engineered
  mdf:             { finishId: "eng_mdf", colorHex: null },
  plywood:         { finishId: "eng_plywood", colorHex: null },
  melamine_white:  { finishId: "eng_melamine", colorHex: "#F5F5F5" },
  melamine_black:  { finishId: "eng_melamine", colorHex: "#2C2C2C" },
  melamine_gray:   { finishId: "eng_melamine", colorHex: "#9E9E9E" },
  melamine_cream:  { finishId: "eng_melamine", colorHex: "#F5F0E1" },
  laminate_walnut: { finishId: "eng_laminate", colorHex: null },
  laminate_oak:    { finishId: "eng_laminate", colorHex: null },

  // Metal — natural
  steel:             { finishId: "metal_steel", colorHex: null },
  brass:             { finishId: "metal_brass", colorHex: null },
  chrome:            { finishId: "metal_chrome", colorHex: null },
  gold:              { finishId: "metal_gold", colorHex: null },
  copper:            { finishId: "metal_copper", colorHex: null },
  bronze:            { finishId: "metal_bronze", colorHex: null },
  rose_gold:         { finishId: "metal_rose_gold", colorHex: null },
  // Painted metal
  black_metal:       { finishId: "metal_painted", colorHex: "#333333" },
  paint_slate_blue:  { finishId: "metal_painted", colorHex: "#4A5568" },
  paint_olive_metal: { finishId: "metal_painted", colorHex: "#5A6240" },

  // Fabric — linen base with baked-in color
  fabric_gray:       { finishId: "fabric_linen", colorHex: "#9B9B9B" },
  fabric_cream:      { finishId: "fabric_linen", colorHex: "#F5E6D3" },
  fabric_beige:      { finishId: "fabric_linen", colorHex: "#D4C4A8" },
  fabric_ivory:      { finishId: "fabric_linen", colorHex: "#FFFFF0" },
  fabric_taupe:      { finishId: "fabric_linen", colorHex: "#B8A99A" },
  fabric_charcoal:   { finishId: "fabric_linen", colorHex: "#4A4A4A" },
  fabric_brown:      { finishId: "fabric_linen", colorHex: "#8B7355" },
  fabric_blue:       { finishId: "fabric_linen", colorHex: "#4A6FA5" },
  fabric_green:      { finishId: "fabric_linen", colorHex: "#5B7B5E" },
  fabric_sage:       { finishId: "fabric_linen", colorHex: "#A8B88C" },
  fabric_mustard:    { finishId: "fabric_linen", colorHex: "#C4A43C" },
  fabric_blush:      { finishId: "fabric_linen", colorHex: "#D4A0A0" },
  fabric_terracotta: { finishId: "fabric_linen", colorHex: "#C67B5C" },
  fabric_bamboo:     { finishId: "fabric_linen", colorHex: "#B8A878" },
  // Specialty fabrics
  cane_natural:        { finishId: "fabric_cane", colorHex: null },
  fabric_plaid_blue:   { finishId: "fabric_plaid", colorHex: null },
  fabric_plaid_olive:  { finishId: "fabric_plaid", colorHex: null },
  velvet_navy:         { finishId: "fabric_velvet", colorHex: "#1B3A5C" },

  // Leather
  leather_brown: { finishId: "leather_natural", colorHex: "#8B5E3C" },
  leather_black: { finishId: "leather_natural", colorHex: "#303030" },
  leather_tan:   { finishId: "leather_natural", colorHex: "#C19A6B" },

  // Glass
  glass:         { finishId: "glass_clear", colorHex: null },
  frosted_glass: { finishId: "glass_frosted", colorHex: null },
  tinted_glass:  { finishId: "glass_tinted", colorHex: null },
  mirror:        { finishId: "glass_mirror", colorHex: null },
  acrylic_clear: { finishId: "glass_clear", colorHex: null },
  acrylic_black: { finishId: "plastic_matte", colorHex: "#0D0D0D" },

  // Stone
  marble_white:  { finishId: "stone_marble_white", colorHex: null },
  marble_black:  { finishId: "stone_marble_black", colorHex: null },
  granite:       { finishId: "stone_granite", colorHex: null },
  terrazzo:      { finishId: "stone_terrazzo", colorHex: null },
  concrete:      { finishId: "stone_concrete", colorHex: null },
  ceramic_white: { finishId: "stone_marble_white", colorHex: null },
};

/** Convert a legacy materialId (+ optional customColor) to the new PanelMaterial format */
export function migrateLegacyMaterial(
  materialId: string,
  customColor?: string
): PanelMaterial {
  const mapped = LEGACY_MAP[materialId];
  if (mapped) {
    // If there was an explicit customColor override, use it
    if (customColor) {
      return { finishId: mapped.finishId, colorHex: customColor };
    }
    return { ...mapped };
  }
  // Unknown legacy type — fall back to fabric linen with the material's color
  console.warn(`[migrateLegacyMaterial] Unknown legacy type: ${materialId}`);
  return { finishId: "fabric_linen", colorHex: customColor ?? "#A89B86" };
}
