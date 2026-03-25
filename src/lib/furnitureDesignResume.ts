import type { EditorSceneData, FurnitureOption, GroupData, PanelData } from "./furnitureData";
import { FURNITURE_BY_SPACE } from "./furnitureData";

/** Resolve furniture type from saved `furniture_id` across all room categories. */
export function findFurnitureOptionById(id: string): FurnitureOption | null {
  for (const list of Object.values(FURNITURE_BY_SPACE)) {
    const found = list.find((f) => f.id === id);
    if (found) return found;
  }
  return null;
}

/** Parse `dimensions` JSON from `furniture_designs` (mm). */
export function parseDimensionsMm(raw: unknown): { w: number; h: number; d: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const w = Number(o.w);
  const h = Number(o.h);
  const d = Number(o.d);
  if (![w, h, d].every((n) => Number.isFinite(n))) return null;
  return { w, h, d };
}

/** Parse `panels` JSON blob (groups + ungroupedPanels + metadata). */
export function parseStoredEditorScene(raw: unknown): EditorSceneData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.groups)) return null;
  return {
    groups: o.groups as GroupData[],
    ungroupedPanels: Array.isArray(o.ungroupedPanels) ? (o.ungroupedPanels as PanelData[]) : [],
  };
}

export function extractCameraPosition(raw: unknown): [number, number, number] | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const cp = (raw as Record<string, unknown>).camera_position;
  if (!Array.isArray(cp) || cp.length < 3) return undefined;
  const x = Number(cp[0]);
  const y = Number(cp[1]);
  const z = Number(cp[2]);
  if (![x, y, z].every(Number.isFinite)) return undefined;
  return [x, y, z];
}
