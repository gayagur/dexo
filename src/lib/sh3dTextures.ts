// ─── SweetHome3D Texture Catalog ─────────────────────────
// 194 textures from eTeksScopia pack (CC-BY 4.0)
// Color maps only (no PBR normal/roughness/AO)
// Organized by category for the material picker

export interface SH3DTexture {
  id: string;
  name: string;
  category: "wood" | "stone" | "tile" | "fabric" | "wall" | "floor" | "misc";
  file: string; // relative path under /textures/sh3d/
  /** Default roughness to use since these are color-only textures */
  roughness: number;
}

const BASE = "/textures/sh3d/";

/** Map category to reasonable default roughness */
const DEFAULT_ROUGHNESS: Record<string, number> = {
  wood: 0.7,
  stone: 0.4,
  tile: 0.3,
  fabric: 0.9,
  wall: 0.8,
  floor: 0.6,
  misc: 0.7,
};

// This will be populated from catalog.json at runtime
let _catalog: SH3DTexture[] | null = null;
let _loading: Promise<SH3DTexture[]> | null = null;

/**
 * Load the SH3D texture catalog (lazy, cached).
 * Returns empty array if fetch fails.
 */
export async function loadSH3DCatalog(): Promise<SH3DTexture[]> {
  if (_catalog) return _catalog;
  if (_loading) return _loading;

  _loading = fetch(`${BASE}catalog.json`)
    .then((r) => r.json())
    .then((data: Array<{ id: string; name: string; category: string; file: string }>) => {
      _catalog = data.map((t) => ({
        ...t,
        category: t.category as SH3DTexture["category"],
        roughness: DEFAULT_ROUGHNESS[t.category] ?? 0.7,
      }));
      return _catalog;
    })
    .catch(() => {
      _catalog = [];
      return _catalog;
    });

  return _loading;
}

/** Get texture URL for a SH3D texture */
export function getSH3DTextureUrl(file: string): string {
  return `${BASE}${file}`;
}

/** SH3D texture categories for the material picker */
export const SH3D_CATEGORIES = [
  { id: "fabric", label: "Fabric & Carpet", icon: "🧵", count: 42 },
  { id: "floor", label: "Floor & Tile", icon: "🪨", count: 73 },
  { id: "wall", label: "Wall & Brick", icon: "🧱", count: 62 },
  { id: "wood", label: "Wood Grain", icon: "🪵", count: 4 },
  { id: "misc", label: "Stone & Other", icon: "🔧", count: 13 },
] as const;
