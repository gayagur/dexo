/**
 * Normalize AI vision output into valid editor panels (shapes, materials, numeric arrays).
 */
import type { PanelData, PanelShape } from "./furnitureData";
import { MATERIALS } from "./furnitureData";
import type { FurnitureAnalysis } from "./ai";

const VALID_MATERIAL_IDS = new Set(MATERIALS.map((m) => m.id));

/** Every shape the 3D editor can render (keep in sync with PanelShape in furnitureData). */
export const FURNITURE_ANALYSIS_SHAPES = [
  "box",
  "cylinder",
  "sphere",
  "cone",
  "rounded_rect",
  "circle_panel",
  "oval",
  "triangle",
  "trapezoid",
  "l_shape",
  "u_shape",
  "arc",
  "hexagon",
  "half_sphere",
  "torus",
  "pyramid",
  "wedge",
  "tube",
  "tapered_leg",
  "cabriole_leg",
  "hairpin_leg",
  "x_base",
  "pedestal",
  "square_leg",
  "bun_foot",
  "bracket_foot",
  "plinth",
  "bar_handle",
  "knob",
  "cup_pull",
  "ring_pull",
  "shaker_door",
  "glass_insert_door",
  "louvered_door",
  "drawer_box",
  "open_tray",
  "crown_molding",
  "base_molding",
  "edge_trim",
  "cross_brace",
  "l_bracket",
  "rail",
  "rod",
  "caster",
  "cushion",
  "mattress",
  "books",
  "vase",
  "basket",
  "picture_frame",
  "lamp_shade",
  "potted_plant",
] as const satisfies readonly PanelShape[];

const VALID_SHAPES = new Set<string>(FURNITURE_ANALYSIS_SHAPES);

const SHAPE_PARAM_KEYS = new Set([
  "cornerRadius",
  "arcAngle",
  "topRatio",
  "tubeRadius",
  "thickness",
  "knobSign",
]);

function num3(v: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(v) || v.length < 3) return fallback;
  const a = Number(v[0]);
  const b = Number(v[1]);
  const c = Number(v[2]);
  if (![a, b, c].every((n) => Number.isFinite(n))) return fallback;
  return [a, b, c];
}

function optionalRotation(v: unknown): [number, number, number] | undefined {
  if (!Array.isArray(v) || v.length < 3) return undefined;
  const a = Number(v[0]);
  const b = Number(v[1]);
  const c = Number(v[2]);
  if (![a, b, c].every((n) => Number.isFinite(n))) return undefined;
  const clamp = (x: number) => Math.max(-12.56, Math.min(12.56, x));
  return [clamp(a), clamp(b), clamp(c)];
}

function finite(n: unknown): number | undefined {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : undefined;
}

function sanitizeShapeParams(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!SHAPE_PARAM_KEYS.has(k)) continue;
    const n = finite(val);
    if (n === undefined) continue;
    if (k === "knobSign") out[k] = n === -1 ? -1 : 1;
    else out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

export type RawAnalysisPanel = {
  label?: unknown;
  type?: unknown;
  shape?: unknown;
  position?: unknown;
  size?: unknown;
  materialId?: unknown;
  shapeParams?: unknown;
  rotation?: unknown;
  cornerRadius?: unknown;
};

function normalizeType(t: unknown): PanelData["type"] {
  if (t === "horizontal" || t === "vertical" || t === "back") return t;
  return "vertical";
}

/**
 * Map one AI panel → PanelData. Unknown shape → box; unknown material → oak.
 */
export function normalizeAnalysisPanel(raw: RawAnalysisPanel, id: string): PanelData {
  const shapeStr = typeof raw.shape === "string" ? raw.shape.trim() : "box";
  const shapeOk = VALID_SHAPES.has(shapeStr) ? (shapeStr as PanelShape) : "box";

  const mat = typeof raw.materialId === "string" ? raw.materialId.trim() : "";
  const materialId = VALID_MATERIAL_IDS.has(mat) ? mat : "oak";

  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim().slice(0, 120)
      : "Part";

  const position = num3(raw.position, [0, 0.5, 0]);
  const size = num3(raw.size, [0.2, 0.2, 0.05]).map((n) => Math.max(0.008, Math.min(n, 10))) as [
    number,
    number,
    number,
  ];

  const shapeParams = sanitizeShapeParams(raw.shapeParams);
  const rotation = optionalRotation(raw.rotation);

  const cr = finite(raw.cornerRadius);
  const cornerRadius =
    cr !== undefined && cr >= 0 && cr <= 0.25 ? cr : undefined;

  const panel: PanelData = {
    id,
    type: normalizeType(raw.type),
    label,
    position,
    size,
    materialId,
    ...(shapeOk !== "box" ? { shape: shapeOk } : {}),
    ...(shapeParams ? { shapeParams } : {}),
    ...(rotation ? { rotation } : {}),
    ...(cornerRadius !== undefined ? { cornerRadius } : {}),
  };

  return panel;
}

const SEATING_NAME_RE =
  /\b(sofa|couch|sectional|loveseat|divan|settee|chesterfield|recliner|armchair|chaise|ottoman|chair|bench|stool|rocker|glider|ספה|כורסא|כיסא)\b/i;

const UPHOLSTERY_MAT_RE = /^(fabric_|leather_|velvet_)/;

function isExcludedFromCushionLabel(label: string): boolean {
  return /\b(leg|legs|feet|foot|plinth|skirt|rail|stretcher|mechanism|spring|slat|hardware|knob|handle|caster|wheel|base\s*frame|frame\s*only|gas\s*lift|column|star\s*base|x.base)\b/i.test(
    label
  );
}

function isCushionLikeLabel(label: string): boolean {
  if (isExcludedFromCushionLabel(label)) return false;
  return /\b(cushion|seat|back|rest|headrest|head\s*rest|pillow|bolster|pad|upholster|padding|foam|loft|arm\s*rest|armrest|arm\s*pad|backrest)\b/i.test(
    label
  );
}

/** AI often labels slabs "Panel 3" — infer seat cushion from proportions */
function looksLikeSeatCushionBlock(panel: PanelData): boolean {
  if ((panel.shape ?? "box") !== "box" || panel.type !== "horizontal") return false;
  if (!UPHOLSTERY_MAT_RE.test(panel.materialId)) return false;
  if (isExcludedFromCushionLabel(panel.label)) return false;
  const [w, h, d] = panel.size;
  const plan = Math.max(w, d);
  const thick = h;
  return thick >= 0.06 && thick <= 0.28 && plan >= 0.28 && Math.min(w, d) >= 0.18;
}

function looksLikeBackCushionBlock(panel: PanelData): boolean {
  if ((panel.shape ?? "box") !== "box" || panel.type !== "vertical") return false;
  if (!UPHOLSTERY_MAT_RE.test(panel.materialId)) return false;
  if (isExcludedFromCushionLabel(panel.label)) return false;
  const [w, h, d] = panel.size;
  return h >= 0.28 && h >= w * 0.85 && d >= 0.04 && d <= 0.35 && w >= 0.12;
}

/** Turn obvious upholstery boxes into cushion meshes after AI import (sofas etc.). */
function refineSeatingImportPanels(panels: PanelData[], furnitureName: string): PanelData[] {
  const name = furnitureName.trim();
  if (!name || !SEATING_NAME_RE.test(name)) return panels;

  return panels.map((panel) => {
    const shape = panel.shape ?? "box";
    if (shape !== "box") return panel;
    if (!UPHOLSTERY_MAT_RE.test(panel.materialId)) return panel;

    const labelHit = isCushionLikeLabel(panel.label);
    const geomSeat = looksLikeSeatCushionBlock(panel);
    const geomBack = looksLikeBackCushionBlock(panel);
    if (!labelHit && !geomSeat && !geomBack) return panel;

    const [w, h, d] = panel.size;
    if (Math.min(w, h, d) < 0.018) return panel;

    let type = panel.type;
    if (geomBack) type = "vertical";
    else if (geomSeat) type = "horizontal";
    else {
      const backish =
        /\b(back|rest|headrest|pillow|bolster)\b/i.test(panel.label) && !/\bseat\b/i.test(panel.label);
      if (backish && h >= Math.max(w, d) * 0.55) type = "vertical";
    }

    const { cornerRadius: _omit, ...base } = panel;
    return { ...base, type, shape: "cushion" };
  });
}

/**
 * CylinderGeometry / circle_panel use Y as disk axis: flat top in XZ. rotation.x ≈ π/2 turns it vertical (wrong for tabletops).
 * Size must be [diameter, thickness, diameter] for horizontal cylinder; circle_panel uses w and d similarly.
 */
function fixHorizontalRoundDisk(panel: PanelData): PanelData {
  const sh = panel.shape ?? "box";
  if (panel.type !== "horizontal" || (sh !== "cylinder" && sh !== "circle_panel")) return panel;

  let p = { ...panel };
  const rot = p.rotation;
  if (
    rot &&
    Math.abs(rot[0] - Math.PI / 2) < 0.45 &&
    Math.abs(rot[1]) < 0.35 &&
    Math.abs(rot[2]) < 0.35
  ) {
    p = { ...p, rotation: [0, 0, 0] };
  }

  const [a, b, c] = p.size;
  const sorted = [a, b, c].slice().sort((x, y) => x - y);
  const t = sorted[0];
  const D = sorted[2];
  if (t >= D * 0.32) return p;
  p = { ...p, size: [D, t, D] as [number, number, number] };
  return p;
}

/**
 * Post-analysis validation & repair for upholstered seating.
 * Fixes common AI vision mistakes: floating parts, missing base, legs off floor.
 */
function repairSeatingGeometry(panels: PanelData[], name: string, nextId: () => string): PanelData[] {
  if (!SEATING_NAME_RE.test(name)) return panels;

  const result = [...panels];

  // Collect semantic groups
  const seatCushions = result.filter(p => (p.shape ?? "box") === "cushion" && p.type === "horizontal" && /seat|cushion/i.test(p.label) && !/back|pillow|throw/i.test(p.label));
  const backCushions = result.filter(p => (p.shape ?? "box") === "cushion" && p.type === "vertical" && /back|rest/i.test(p.label));
  const legs = result.filter(p => /leg|foot|feet/i.test(p.label));
  const plinths = result.filter(p => (p.shape ?? "box") === "plinth" || /plinth|base\b/i.test(p.label));

  // === Fix 1: Ensure legs touch floor ===
  for (const leg of legs) {
    const legH = leg.size[1];
    const expectedY = legH / 2;
    if (Math.abs(leg.position[1] - expectedY) > 0.03) {
      leg.position = [leg.position[0], expectedY, leg.position[2]];
    }
  }

  // === Fix 2: Add missing plinth/base for sofas only (not dining chairs) ===
  const isSofa = /\b(sofa|couch|sectional|loveseat|divan|settee|chesterfield|recliner)\b/i.test(name);
  if (isSofa && seatCushions.length > 0 && plinths.length === 0) {
    // Find the lowest seat cushion bottom
    const seatBottoms = seatCushions.map(p => p.position[1] - p.size[1] / 2);
    const lowestSeatBottom = Math.min(...seatBottoms);

    // Find furniture footprint
    const allX = result.map(p => [p.position[0] - p.size[0] / 2, p.position[0] + p.size[0] / 2]).flat();
    const allZ = result.map(p => [p.position[2] - p.size[2] / 2, p.position[2] + p.size[2] / 2]).flat();
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minZ = Math.min(...allZ), maxZ = Math.max(...allZ);
    const footW = maxX - minX;
    const footD = maxZ - minZ;

    // Determine plinth height — fill the gap between floor and seat cushion bottom
    const legTopY = legs.length > 0 ? Math.max(...legs.map(l => l.position[1] + l.size[1] / 2)) : 0;
    const plinthH = Math.max(0.06, lowestSeatBottom - legTopY);
    const plinthY = legTopY + plinthH / 2;

    // Only add if there's a meaningful gap
    if (plinthH > 0.04 && plinthH < 0.5) {
      // Match material to seat cushions
      const seatMat = seatCushions[0]?.materialId ?? "melamine_black";
      const plinthMat = UPHOLSTERY_MAT_RE.test(seatMat) ? seatMat : "melamine_black";

      result.push({
        id: nextId(),
        type: "horizontal",
        label: "Base",
        position: [(minX + maxX) / 2, plinthY, (minZ + maxZ) / 2],
        size: [footW * 0.95, plinthH, footD * 0.95],
        materialId: plinthMat,
        shape: "rounded_rect",
        shapeParams: { cornerRadius: 0.02 },
      });
    }
  }

  // === Fix 3: Validate seat cushion vertical stacking ===
  // Ensure back cushions sit above/behind seat cushions, not overlapping
  if (seatCushions.length > 0 && backCushions.length > 0) {
    const seatTopY = Math.max(...seatCushions.map(p => p.position[1] + p.size[1] / 2));
    const seatBackZ = Math.min(...seatCushions.map(p => p.position[2] - p.size[2] / 2));

    for (const bc of backCushions) {
      // Back cushion center should be above seat top
      if (bc.position[1] < seatTopY) {
        bc.position = [bc.position[0], seatTopY + bc.size[1] / 2, bc.position[2]];
      }
      // Back cushion should be behind seats (smaller Z or at seat back edge)
      if (bc.position[2] > seatBackZ + 0.05) {
        bc.position = [bc.position[0], bc.position[1], seatBackZ - bc.size[2] / 2 + 0.02];
      }
    }
  }

  return result;
}

export function panelsFromFurnitureAnalysis(
  analysis: FurnitureAnalysis,
  nextId: () => string
): PanelData[] {
  const panels = analysis.panels
    .map((p) => normalizeAnalysisPanel(p as RawAnalysisPanel, nextId()))
    .map(fixHorizontalRoundDisk);
  const refined = refineSeatingImportPanels(panels, analysis.name ?? "");
  return repairSeatingGeometry(refined, analysis.name ?? "", nextId);
}
