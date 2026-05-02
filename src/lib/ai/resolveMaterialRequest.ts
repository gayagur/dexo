import {
  CURATED_PALETTE,
  findPaletteColorByName,
  findClosestPaletteColor,
  cssColorNameToHex,
} from "@/lib/3d/materials/colorPalette";
import { MATERIAL_FINISHES } from "@/lib/3d/materials/materialFinishes";
import type { MaterialFinish } from "@/lib/3d/materials/types";

interface ResolveInput {
  materialPhrase?: string; // "fabric", "leather", "linen", "wood", "velvet"
  colorPhrase?: string;    // "pink", "navy blue", "burgundy", "#FF5733"
}

interface ResolveOutput {
  finishId: string;
  colorHex: string | null;
  legacyMaterialId: string;
  reasoning: string;
}

/** Find the best MaterialFinish for a phrase like "leather", "velvet", "wood", "metal" */
function resolveFinish(phrase?: string): MaterialFinish | null {
  if (!phrase) return null;
  const lower = phrase.toLowerCase().trim();

  // Direct match by family
  const familyMap: Record<string, string> = {
    fabric: "fabric_linen",
    linen: "fabric_linen",
    cotton: "fabric_cotton",
    velvet: "fabric_velvet",
    leather: "leather_natural",
    wood: "wood_oak",
    oak: "wood_oak",
    walnut: "wood_walnut",
    pine: "wood_pine",
    maple: "wood_maple",
    cherry: "wood_cherry",
    birch: "wood_birch",
    teak: "wood_teak",
    mahogany: "wood_mahogany",
    bamboo: "wood_bamboo",
    ebony: "wood_ebony",
    metal: "metal_steel",
    steel: "metal_steel",
    chrome: "metal_chrome",
    brass: "metal_brass",
    gold: "metal_gold",
    copper: "metal_copper",
    bronze: "metal_bronze",
    glass: "glass_clear",
    marble: "stone_marble_white",
    concrete: "stone_concrete",
    plastic: "plastic_matte",
  };

  const mapped = familyMap[lower];
  if (mapped) return MATERIAL_FINISHES.find((f) => f.id === mapped) ?? null;

  // Fuzzy: check if phrase appears in any finish displayName
  return (
    MATERIAL_FINISHES.find((f) =>
      f.displayName.toLowerCase().includes(lower)
    ) ?? null
  );
}

function defaultFinish(): MaterialFinish {
  return MATERIAL_FINISHES.find((f) => f.id === "fabric_linen")!;
}

/**
 * Resolve a material + color request into a concrete finishId + colorHex.
 * This function NEVER returns "color not found" — it always returns SOME color.
 */
export function resolveMaterialRequest(input: ResolveInput): ResolveOutput {
  // 1. Resolve the finish
  const finish = resolveFinish(input.materialPhrase) ?? defaultFinish();

  // 2. Resolve the color
  let colorHex: string | null = null;
  let colorName: string | null = null;

  if (input.colorPhrase) {
    const phrase = input.colorPhrase.trim();

    // 2a. Direct hex match
    const hexMatch = phrase.match(/^#?([0-9a-fA-F]{6})$/);
    if (hexMatch) {
      colorHex = `#${hexMatch[1].toUpperCase()}`;
      colorName = colorHex;
    } else {
      // 2b. Palette name/alias match
      const palette = findPaletteColorByName(phrase);
      if (palette) {
        colorHex = palette.hex;
        colorName = palette.name;
      } else {
        // 2c. CSS color name → hex → closest palette color
        const cssHex = cssColorNameToHex(phrase);
        if (cssHex) {
          const closest = findClosestPaletteColor(cssHex);
          colorHex = closest.hex;
          colorName = closest.name;
        } else {
          // 2d. Try splitting multi-word and finding any match
          const words = phrase.toLowerCase().split(/\s+/);
          for (const word of words) {
            const p = findPaletteColorByName(word);
            if (p) { colorHex = p.hex; colorName = p.name; break; }
            const c = cssColorNameToHex(word);
            if (c) {
              const cl = findClosestPaletteColor(c);
              colorHex = cl.hex; colorName = cl.name; break;
            }
          }
        }
      }
    }
  }

  // 3. Honor finish.acceptsColorTint
  if (!finish.acceptsColorTint) {
    colorHex = null;
    colorName = null;
  }

  // 4. If finish is tintable but no color resolved, use its default
  if (finish.acceptsColorTint && !colorHex) {
    colorHex = finish.defaultColor;
  }

  // 5. Find the closest legacy materialId for backwards compat with AI commands
  const legacyMaterialId = findLegacyMaterialId(finish, colorHex);

  // 6. Build reasoning
  const reasoning = buildReasoning(finish, colorHex, colorName, input);

  return { finishId: finish.id, colorHex, legacyMaterialId, reasoning };
}

/** Find the best legacy MATERIALS id for backward compat with existing AI command handling */
function findLegacyMaterialId(finish: MaterialFinish, colorHex: string | null): string {
  // Direct: use the baseMaterialId from the finish
  return finish.baseMaterialId;
}

function buildReasoning(
  finish: MaterialFinish,
  colorHex: string | null,
  colorName: string | null,
  input: ResolveInput
): string {
  const parts: string[] = [];
  parts.push(`Using ${finish.displayName}`);
  if (colorHex && colorName && colorName !== colorHex) {
    parts.push(`in ${colorName} (${colorHex})`);
  } else if (colorHex) {
    parts.push(`in ${colorHex}`);
  }
  if (input.colorPhrase && !colorHex && !finish.acceptsColorTint) {
    parts.push(`— this material's natural color is fixed`);
  }
  return parts.join(" ");
}
