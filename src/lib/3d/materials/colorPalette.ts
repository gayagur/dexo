// ─── Color Palette Types ─────────────────────────────────
export type ColorFamily =
  | "neutral"
  | "warm"
  | "cool"
  | "earthy"
  | "pastel"
  | "jewel"
  | "vibrant";

export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
  family: ColorFamily;
  aliases: string[];
}

// ─── Curated Palette (~50 designer-vetted colors) ────────
export const CURATED_PALETTE: PaletteColor[] = [
  // NEUTRALS (8)
  { id: "white_pure", name: "Pure White", hex: "#FAFAFA", family: "neutral", aliases: ["white", "snow"] },
  { id: "cream_warm", name: "Warm Cream", hex: "#F5EFE0", family: "neutral", aliases: ["cream", "ivory", "off-white"] },
  { id: "beige_sand", name: "Sand Beige", hex: "#D9C9A8", family: "neutral", aliases: ["beige", "sand", "tan"] },
  { id: "taupe_classic", name: "Classic Taupe", hex: "#A89B86", family: "neutral", aliases: ["taupe", "mushroom", "greige"] },
  { id: "gray_soft", name: "Soft Gray", hex: "#C4C4C4", family: "neutral", aliases: ["light gray", "silver gray", "dove gray"] },
  { id: "gray_charcoal", name: "Charcoal", hex: "#4A4A4A", family: "neutral", aliases: ["charcoal", "dark gray", "graphite"] },
  { id: "black_soft", name: "Soft Black", hex: "#1C1C1C", family: "neutral", aliases: ["black", "jet"] },
  { id: "brown_chocolate", name: "Chocolate Brown", hex: "#5D3A1F", family: "neutral", aliases: ["brown", "chocolate", "espresso"] },

  // PASTELS (8)
  { id: "pink_blush", name: "Blush Pink", hex: "#F2C6C2", family: "pastel", aliases: ["pink", "blush", "baby pink", "light pink"] },
  { id: "pink_dusty", name: "Dusty Pink", hex: "#D4A5A0", family: "pastel", aliases: ["dusty pink", "rose"] },
  { id: "peach_soft", name: "Soft Peach", hex: "#F5C6A5", family: "pastel", aliases: ["peach", "apricot"] },
  { id: "yellow_butter", name: "Butter Yellow", hex: "#F5E6A8", family: "pastel", aliases: ["light yellow", "butter", "cream yellow"] },
  { id: "green_mint", name: "Mint Green", hex: "#B8DBC4", family: "pastel", aliases: ["mint", "light green", "sage light"] },
  { id: "blue_sky", name: "Sky Blue", hex: "#B8D4E3", family: "pastel", aliases: ["light blue", "sky", "baby blue"] },
  { id: "lavender_soft", name: "Soft Lavender", hex: "#C8B8D4", family: "pastel", aliases: ["lavender", "light purple", "lilac"] },
  { id: "gray_warm_light", name: "Warm Light Gray", hex: "#DCD5CC", family: "pastel", aliases: ["warm gray light"] },

  // WARMS (8)
  { id: "red_terracotta", name: "Terracotta", hex: "#C25E4A", family: "warm", aliases: ["terracotta", "rust", "clay"] },
  { id: "red_brick", name: "Brick Red", hex: "#9B3E2F", family: "warm", aliases: ["brick", "red brown"] },
  { id: "orange_burnt", name: "Burnt Orange", hex: "#CC6633", family: "warm", aliases: ["burnt orange", "pumpkin"] },
  { id: "orange_coral", name: "Coral", hex: "#E8826B", family: "warm", aliases: ["coral", "salmon"] },
  { id: "yellow_mustard", name: "Mustard", hex: "#C9A227", family: "warm", aliases: ["mustard", "ochre", "gold mustard"] },
  { id: "red_wine", name: "Wine Red", hex: "#722F37", family: "warm", aliases: ["wine", "burgundy", "maroon"] },
  { id: "pink_rose_dark", name: "Dark Rose", hex: "#A24359", family: "warm", aliases: ["dark rose", "mauve"] },
  { id: "red_classic", name: "Classic Red", hex: "#B73A2F", family: "warm", aliases: ["red"] },

  // COOLS (8)
  { id: "blue_navy", name: "Navy Blue", hex: "#1E3A5F", family: "cool", aliases: ["navy", "dark blue"] },
  { id: "blue_classic", name: "Classic Blue", hex: "#3C5A8A", family: "cool", aliases: ["blue", "royal blue"] },
  { id: "blue_dusty", name: "Dusty Blue", hex: "#7A8FA3", family: "cool", aliases: ["dusty blue", "denim", "slate blue"] },
  { id: "green_forest", name: "Forest Green", hex: "#2F4F36", family: "cool", aliases: ["forest", "dark green"] },
  { id: "green_sage", name: "Sage Green", hex: "#9CAA8E", family: "cool", aliases: ["sage", "olive light"] },
  { id: "green_emerald", name: "Emerald", hex: "#1F6B57", family: "cool", aliases: ["emerald", "jewel green"] },
  { id: "teal_deep", name: "Deep Teal", hex: "#205A6E", family: "cool", aliases: ["teal", "turquoise dark"] },
  { id: "gray_blue_steel", name: "Steel Blue Gray", hex: "#7A8B96", family: "cool", aliases: ["steel blue", "blue gray"] },

  // EARTHY (8)
  { id: "brown_camel", name: "Camel", hex: "#A87C4A", family: "earthy", aliases: ["camel", "tan brown"] },
  { id: "brown_cognac", name: "Cognac", hex: "#8B4F2E", family: "earthy", aliases: ["cognac", "caramel brown"] },
  { id: "brown_walnut_dark", name: "Dark Walnut", hex: "#3E2817", family: "earthy", aliases: ["dark walnut", "dark brown"] },
  { id: "green_olive", name: "Olive", hex: "#6B6638", family: "earthy", aliases: ["olive", "olive drab"] },
  { id: "green_moss", name: "Moss Green", hex: "#5C6B3F", family: "earthy", aliases: ["moss"] },
  { id: "yellow_honey", name: "Honey", hex: "#C99745", family: "earthy", aliases: ["honey", "amber"] },
  { id: "red_rust", name: "Rust", hex: "#8B4513", family: "earthy", aliases: ["rust dark", "sienna"] },
  { id: "brown_mocha", name: "Mocha", hex: "#7A5C45", family: "earthy", aliases: ["mocha", "coffee"] },

  // JEWEL (6)
  { id: "purple_royal", name: "Royal Purple", hex: "#5A3E7A", family: "jewel", aliases: ["purple", "royal purple"] },
  { id: "purple_plum", name: "Plum", hex: "#6B3E5A", family: "jewel", aliases: ["plum", "eggplant"] },
  { id: "pink_magenta", name: "Magenta", hex: "#A8327A", family: "jewel", aliases: ["magenta", "fuchsia dark"] },
  { id: "blue_cobalt", name: "Cobalt Blue", hex: "#1E4A8A", family: "jewel", aliases: ["cobalt"] },
  { id: "green_jade", name: "Jade", hex: "#2A8A7A", family: "jewel", aliases: ["jade"] },
  { id: "gold_antique", name: "Antique Gold", hex: "#A88732", family: "jewel", aliases: ["gold", "brass"] },

  // VIBRANT (4)
  { id: "pink_hot", name: "Hot Pink", hex: "#E8519E", family: "vibrant", aliases: ["hot pink", "pink bright"] },
  { id: "orange_bright", name: "Bright Orange", hex: "#F08537", family: "vibrant", aliases: ["orange", "bright orange"] },
  { id: "green_lime", name: "Lime", hex: "#A8C937", family: "vibrant", aliases: ["lime", "bright green"] },
  { id: "blue_electric", name: "Electric Blue", hex: "#3D6EDF", family: "vibrant", aliases: ["electric blue", "bright blue"] },
];

// ─── Helpers ─────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** Find a palette color by name or alias (exact case-insensitive match) */
export function findPaletteColorByName(query: string): PaletteColor | null {
  const lower = query.toLowerCase().trim();
  return (
    CURATED_PALETTE.find(
      (c) =>
        c.name.toLowerCase() === lower ||
        c.id === lower ||
        c.aliases.some((a) => a.toLowerCase() === lower)
    ) ?? null
  );
}

/** Find the closest palette color to an arbitrary hex (Euclidean RGB distance) */
export function findClosestPaletteColor(hex: string): PaletteColor {
  const target = hexToRgb(hex);
  let best = CURATED_PALETTE[0];
  let bestDist = Infinity;
  for (const c of CURATED_PALETTE) {
    const rgb = hexToRgb(c.hex);
    const d =
      (rgb.r - target.r) ** 2 +
      (rgb.g - target.g) ** 2 +
      (rgb.b - target.b) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/** Common CSS color names → hex (covers ~50 most-used names) */
const CSS_COLOR_NAMES: Record<string, string> = {
  red: "#FF0000", blue: "#0000FF", green: "#008000", yellow: "#FFFF00",
  orange: "#FFA500", purple: "#800080", pink: "#FFC0CB", brown: "#A52A2A",
  black: "#000000", white: "#FFFFFF", gray: "#808080", grey: "#808080",
  navy: "#000080", teal: "#008080", maroon: "#800000", olive: "#808000",
  coral: "#FF7F50", salmon: "#FA8072", gold: "#FFD700", silver: "#C0C0C0",
  indigo: "#4B0082", violet: "#EE82EE", crimson: "#DC143C", cyan: "#00FFFF",
  magenta: "#FF00FF", lime: "#00FF00", aqua: "#00FFFF", ivory: "#FFFFF0",
  beige: "#F5F5DC", khaki: "#F0E68C", plum: "#DDA0DD", orchid: "#DA70D6",
  lavender: "#E6E6FA", turquoise: "#40E0D0", tan: "#D2B48C", sienna: "#A0522D",
  chocolate: "#D2691E", tomato: "#FF6347", wheat: "#F5DEB3", peach: "#FFDAB9",
  mint: "#98FF98", sage: "#BCB88A", rust: "#B7410E", burgundy: "#800020",
  charcoal: "#36454F", taupe: "#483C32", cream: "#FFFDD0", blush: "#DE5D83",
  mustard: "#FFDB58", terracotta: "#E2725B", cobalt: "#0047AB", emerald: "#50C878",
  sapphire: "#0F52BA", ruby: "#E0115F", amber: "#FFBF00", champagne: "#F7E7CE",
};

/** Resolve a CSS color name to hex, or return null */
export function cssColorNameToHex(name: string): string | null {
  return CSS_COLOR_NAMES[name.toLowerCase().trim()] ?? null;
}

/** Color family groups for UI display */
export const COLOR_FAMILIES: { id: ColorFamily; label: string }[] = [
  { id: "neutral", label: "Neutrals" },
  { id: "pastel", label: "Pastels" },
  { id: "warm", label: "Warms" },
  { id: "cool", label: "Cools" },
  { id: "earthy", label: "Earthy" },
  { id: "jewel", label: "Jewel" },
  { id: "vibrant", label: "Vibrant" },
];
