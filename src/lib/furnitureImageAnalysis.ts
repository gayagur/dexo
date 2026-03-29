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
  "cushion_firm",
  "cushion_bolster",
  "padded_block",
  "mattress",
  "books",
  "vase",
  "basket",
  "picture_frame",
  "lamp_shade",
  "potted_plant",
  "slat_group",
] as const satisfies readonly PanelShape[];

const VALID_SHAPES = new Set<string>(FURNITURE_ANALYSIS_SHAPES);

const SHAPE_PARAM_KEYS = new Set([
  "cornerRadius",
  "arcAngle",
  "topRatio",
  "tubeRadius",
  "thickness",
  "knobSign",
  "slatCount",
  "slatGap",
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

/**
 * Turn obvious upholstery boxes into cushion meshes after AI import.
 * ONLY applies to sofas/couches/upholstered furniture — NOT dining chairs,
 * wood chairs, or other seating where the AI deliberately chose "box".
 * The AI prompt already instructs to use "cushion" for padded parts,
 * so this is a safety net for older/weaker models that ignore that instruction.
 */
const UPHOLSTERED_SEATING_RE =
  /\b(sofa|couch|sectional|loveseat|divan|settee|chesterfield|recliner|armchair|ottoman|ספה|כורסא)\b/i;

function refineSeatingImportPanels(panels: PanelData[], furnitureName: string): PanelData[] {
  const name = furnitureName.trim();
  // Only auto-convert for explicitly upholstered furniture types
  // Dining chairs, office chairs, accent chairs etc. keep what the AI returned
  if (!name || !UPHOLSTERED_SEATING_RE.test(name)) return panels;

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

    // Use cushion_firm (not full cushion) because the AI chose "box" —
    // meaning the furniture looks structured/boxy. If the AI wanted puffy
    // pillow shapes it would have output "cushion" directly.
    // Arms get padded_block (even less rounding — they're structural).
    const isArm = /\b(arm|armrest)\b/i.test(panel.label);
    const targetShape: PanelShape = isArm ? "padded_block" : "cushion_firm";

    const { cornerRadius: _omit, ...base } = panel;
    return { ...base, type, shape: targetShape };
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
  const isSofa = /\b(sofa|couch|sectional|loveseat|divan|settee|chesterfield|recliner)\b/i.test(name);

  const result = [...panels];

  // Collect semantic groups
  const isCushionShape = (s: string) => /^(cushion|cushion_firm|padded_block|mattress)$/.test(s);
  const isUpholstered = (p: PanelData) => isCushionShape(p.shape ?? "box") || ((p.shape ?? "box") === "box" && UPHOLSTERY_MAT_RE.test(p.materialId));
  const seatCushions = result.filter(p => isUpholstered(p) && p.type === "horizontal" && p.position[1] > 0.15 && p.position[1] < 0.55 && !/back|pillow|throw|arm/i.test(p.label));
  const backCushions = result.filter(p => isUpholstered(p) && p.type === "vertical" && !/arm|leg|pillow|throw/i.test(p.label) && /back|rest|cushion/i.test(p.label));
  const arms = result.filter(p => /arm/i.test(p.label) && !/leg|back/i.test(p.label));
  const legs = result.filter(p => /leg|foot|feet|caster/i.test(p.label));
  const plinths = result.filter(p => (p.shape ?? "box") === "plinth" || /plinth|base\b|frame\b/i.test(p.label));

  // === Determine dominant sofa material (most common among upholstered parts) ===
  const allUpholstered = result.filter(p => UPHOLSTERY_MAT_RE.test(p.materialId));
  const matCounts = new Map<string, number>();
  for (const p of allUpholstered) {
    matCounts.set(p.materialId, (matCounts.get(p.materialId) ?? 0) + 1);
  }
  let dominantMat = "fabric_cream";
  let maxCount = 0;
  for (const [mat, count] of matCounts) {
    if (count > maxCount) { maxCount = count; dominantMat = mat; }
  }

  // === Fix 1: Legs touch floor ===
  for (const leg of legs) {
    const legH = leg.size[1];
    leg.position = [leg.position[0], legH / 2, leg.position[2]];
  }

  // === Fix 2: Plinth/base uses SOFA material, not black ===
  for (const p of plinths) {
    if (p.materialId === "melamine_black" || p.materialId === "black_metal") {
      p.materialId = dominantMat;
    }
  }

  // === Fix 3: Add missing base for sofas (in sofa material, not black) ===
  if (isSofa && seatCushions.length > 0 && plinths.length === 0) {
    const seatBottoms = seatCushions.map(p => p.position[1] - p.size[1] / 2);
    const lowestSeatBottom = Math.min(...seatBottoms);
    const legTopY = legs.length > 0 ? Math.max(...legs.map(l => l.position[1] + l.size[1] / 2)) : 0;
    const plinthH = Math.max(0.06, lowestSeatBottom - legTopY);

    if (plinthH > 0.04 && plinthH < 0.5) {
      const allX = result.map(p => [p.position[0] - p.size[0] / 2, p.position[0] + p.size[0] / 2]).flat();
      const allZ = result.map(p => [p.position[2] - p.size[2] / 2, p.position[2] + p.size[2] / 2]).flat();
      result.push({
        id: nextId(),
        type: "horizontal",
        label: "Base",
        position: [(Math.min(...allX) + Math.max(...allX)) / 2, legTopY + plinthH / 2, (Math.min(...allZ) + Math.max(...allZ)) / 2],
        size: [(Math.max(...allX) - Math.min(...allX)) * 0.95, plinthH, (Math.max(...allZ) - Math.min(...allZ)) * 0.95],
        materialId: dominantMat, // Same as sofa, NOT black
        shape: "padded_block",
      });
    }
  }

  // === Fix 4: Arms — force to padded_block, correct material, RESET rotation ===
  if (isSofa) {
    for (const arm of arms) {
      if ((arm.shape ?? "box") === "cylinder" || (arm.shape ?? "box") === "box") {
        arm.shape = "padded_block";
      }
      if (!UPHOLSTERY_MAT_RE.test(arm.materialId)) {
        arm.materialId = dominantMat;
      }
      arm.rotation = [0, 0, 0]; // Arms should NEVER be rotated
    }
  }

  // === Fix 4b: Seat cushions — RESET rotation (must be flat) ===
  for (const sc of seatCushions) {
    sc.rotation = [0, 0, 0];
  }

  // === Fix 5: Compact seat cushions between arms ===
  if (isSofa && seatCushions.length >= 2) {
    let innerLeft: number, innerRight: number;
    if (arms.length >= 2) {
      const sortedArms = [...arms].sort((a, b) => a.position[0] - b.position[0]);
      innerLeft = sortedArms[0].position[0] + sortedArms[0].size[0] / 2;
      innerRight = sortedArms[sortedArms.length - 1].position[0] - sortedArms[sortedArms.length - 1].size[0] / 2;
    } else {
      const allX = result.map(p => [p.position[0] - p.size[0] / 2, p.position[0] + p.size[0] / 2]).flat();
      innerLeft = Math.min(...allX) + 0.05;
      innerRight = Math.max(...allX) - 0.05;
    }
    const innerWidth = innerRight - innerLeft;
    if (innerWidth > 0.3) {
      const n = seatCushions.length;
      const gap = 0.012;
      const cushW = (innerWidth - gap * (n - 1)) / n;
      const sorted = [...seatCushions].sort((a, b) => a.position[0] - b.position[0]);
      for (let i = 0; i < sorted.length; i++) {
        sorted[i].position = [innerLeft + cushW / 2 + i * (cushW + gap), sorted[i].position[1], sorted[i].position[2]];
        sorted[i].size = [cushW, sorted[i].size[1], sorted[i].size[2]];
      }
    }
  }

  // === Fix 6: Back cushions — FORCE position + FIX rotation ===
  if (seatCushions.length > 0 && backCushions.length > 0) {
    const seatTopY = Math.max(...seatCushions.map(p => p.position[1] + p.size[1] / 2));
    const seatBackZ = Math.min(...seatCushions.map(p => p.position[2] - p.size[2] / 2));
    const sortedSeats = [...seatCushions].sort((a, b) => a.position[0] - b.position[0]);
    const sortedBacks = [...backCushions].sort((a, b) => a.position[0] - b.position[0]);

    for (let i = 0; i < sortedBacks.length; i++) {
      const bc = sortedBacks[i];
      const matchSeat = sortedSeats[Math.min(i, sortedSeats.length - 1)];
      bc.position = [
        matchSeat.position[0],
        seatTopY + bc.size[1] / 2,
        seatBackZ - bc.size[2] / 2 + 0.01,
      ];
      // FORCE sane rotation — only allow slight backward tilt on X axis
      // Remove any wild Y/Z rotation the AI set
      const rx = bc.rotation?.[0] ?? 0;
      const clampedRx = Math.max(-0.25, Math.min(0, rx)); // only backward tilt, max ~15°
      bc.rotation = [clampedRx, 0, 0];

      // Match width to seat width
      if (bc.size[0] > matchSeat.size[0] * 1.2) {
        bc.size = [matchSeat.size[0], bc.size[1], bc.size[2]];
      }
    }
  }

  return result;
}

/**
 * Fix office/task chairs: if casters exist but no star base connects them
 * to the gas lift, add an x_base automatically.
 */
function repairOfficeChairBase(panels: PanelData[], name: string, nextId: () => string): PanelData[] {
  if (!/\b(office|task|desk|executive|swivel|ergonomic|gaming)\b/i.test(name) &&
      !/\bchair\b/i.test(name)) return panels;

  const casters = panels.filter(p => /caster|wheel/i.test(p.label) || (p.shape ?? "box") === "caster");
  const starBases = panels.filter(p => /star.*base|x.base|base.*star/i.test(p.label) || (p.shape ?? "box") === "x_base");
  const gasLifts = panels.filter(p => /gas.*lift|lift.*column|column|pedestal|center.*post/i.test(p.label));

  if (casters.length >= 3 && starBases.length === 0) {
    // Find centroid of all casters
    const cx = casters.reduce((s, p) => s + p.position[0], 0) / casters.length;
    const cz = casters.reduce((s, p) => s + p.position[2], 0) / casters.length;
    // Star base sits just above casters
    const casterTopY = Math.max(...casters.map(p => p.position[1] + p.size[1] / 2));
    // Compute radius from center to furthest caster
    const maxR = Math.max(...casters.map(p => {
      const dx = p.position[0] - cx;
      const dz = p.position[2] - cz;
      return Math.sqrt(dx * dx + dz * dz);
    }));
    const baseSize = Math.max(0.50, maxR * 2);

    panels.push({
      id: nextId(),
      type: "horizontal",
      label: "Star Base",
      position: [cx, casterTopY + 0.02, cz],
      size: [baseSize, 0.04, baseSize],
      materialId: "chrome",
      shape: "x_base",
    });

    // If no gas lift exists, add one connecting base to seat
    if (gasLifts.length === 0) {
      const seatPanels = panels.filter(p => /seat/i.test(p.label));
      const seatBottomY = seatPanels.length > 0
        ? Math.min(...seatPanels.map(p => p.position[1] - p.size[1] / 2))
        : 0.40;
      const liftH = seatBottomY - (casterTopY + 0.04);
      if (liftH > 0.05) {
        panels.push({
          id: nextId(),
          type: "vertical",
          label: "Gas Lift",
          position: [cx, casterTopY + 0.04 + liftH / 2, cz],
          size: [0.06, liftH, 0.06],
          materialId: "black_metal",
          shape: "cylinder",
        });
      }
    }
  }

  return panels;
}

/**
 * Fix bed geometry — AI often swaps width/depth making beds vertical.
 * Ensures bed is wider than tall and longer than wide.
 */
function repairBedGeometry(panels: PanelData[], name: string): PanelData[] {
  if (!/\b(bed|bunk|crib|cot|daybed)\b/i.test(name)) return panels;

  // Check if the overall shape is wrong — bed should be wide and long, not tall
  const allX = panels.flatMap(p => [p.position[0] - p.size[0] / 2, p.position[0] + p.size[0] / 2]);
  const allY = panels.flatMap(p => [p.position[1] - p.size[1] / 2, p.position[1] + p.size[1] / 2]);
  const allZ = panels.flatMap(p => [p.position[2] - p.size[2] / 2, p.position[2] + p.size[2] / 2]);
  const spanX = Math.max(...allX) - Math.min(...allX);
  const spanY = Math.max(...allY) - Math.min(...allY);
  const spanZ = Math.max(...allZ) - Math.min(...allZ);

  // A bed should have: spanX (width) > spanY (height), spanZ (depth/length) > spanX (width)
  // If spanY > spanX, the bed is vertical — parts need fixing
  if (spanY > spanX * 1.5) {
    // The AI made it too tall — swap Y and Z for all panels
    for (const p of panels) {
      // Swap position Y and Z
      const oldY = p.position[1];
      const oldZ = p.position[2];
      p.position = [p.position[0], Math.abs(oldZ) + 0.01, oldY];
      // Swap size height and depth for non-vertical parts
      if (p.type === "horizontal") {
        const oldSH = p.size[1];
        const oldSD = p.size[2];
        p.size = [p.size[0], Math.min(oldSH, oldSD), Math.max(oldSH, oldSD)];
      }
    }
  }

  // Fix slats — ensure they're horizontal thin panels
  const slats = panels.filter(p => /slat/i.test(p.label));
  for (const slat of slats) {
    // Slats should be thin horizontally
    const [w, h, d] = slat.size;
    if (h > 0.05) {
      // Too thick — fix: width should be large, height thin, depth medium
      const sorted = [w, h, d].sort((a, b) => a - b);
      slat.size = [sorted[2], sorted[0], sorted[1]]; // widest, thinnest, medium
    }
    slat.type = "horizontal";
    slat.rotation = [0, 0, 0];
  }

  // Fix headboard — should be vertical, at the back (most negative Z)
  const headboards = panels.filter(p => /headboard/i.test(p.label));
  for (const hb of headboards) {
    hb.type = "vertical";
    // Headboard should be wide and tall, thin depth
    const dims = [...hb.size].sort((a, b) => a - b);
    hb.size = [dims[2], dims[1], dims[0]]; // widest, medium (height), thinnest (depth)
    hb.rotation = [0, 0, 0];
  }

  // Fix footboard — same as headboard but shorter
  const footboards = panels.filter(p => /footboard/i.test(p.label));
  for (const fb of footboards) {
    fb.type = "vertical";
    const dims = [...fb.size].sort((a, b) => a - b);
    fb.size = [dims[2], dims[1], dims[0]];
    fb.rotation = [0, 0, 0];
  }

  // Fix side rails — horizontal, long, thin
  const sideRails = panels.filter(p => /side.*rail|side.*panel/i.test(p.label));
  for (const rail of sideRails) {
    rail.type = "horizontal";
    const dims = [...rail.size].sort((a, b) => a - b);
    // Longest dimension = depth (along bed length), medium = height, thinnest = width (thickness)
    rail.size = [dims[0], dims[1], dims[2]];
    rail.rotation = [0, 0, 0];
  }

  return panels;
}

/**
 * General geometry validation — runs on ALL furniture types.
 * Fixes common AI mistakes regardless of category.
 */
function validateAndRepairGeometry(panels: PanelData[]): PanelData[] {
  if (panels.length === 0) return panels;

  const result = [...panels];

  // === Fix: Remove duplicate/near-identical panels ===
  // AI sometimes outputs the same part twice with nearly identical positions
  const toRemove = new Set<number>();
  for (let i = 0; i < result.length; i++) {
    if (toRemove.has(i)) continue;
    for (let j = i + 1; j < result.length; j++) {
      if (toRemove.has(j)) continue;
      const a = result[i], b = result[j];
      const dx = Math.abs(a.position[0] - b.position[0]);
      const dy = Math.abs(a.position[1] - b.position[1]);
      const dz = Math.abs(a.position[2] - b.position[2]);
      const sw = Math.abs(a.size[0] - b.size[0]);
      const sh = Math.abs(a.size[1] - b.size[1]);
      const sd = Math.abs(a.size[2] - b.size[2]);
      // If position AND size are nearly identical, it's a duplicate
      if (dx < 0.02 && dy < 0.02 && dz < 0.02 && sw < 0.02 && sh < 0.02 && sd < 0.02) {
        toRemove.add(j);
      }
    }
  }
  if (toRemove.size > 0) {
    const cleaned = result.filter((_, i) => !toRemove.has(i));
    result.length = 0;
    result.push(...cleaned);
  }

  // === Fix: Ensure nothing is below floor (Y < 0) ===
  const allBottomY = result.map(p => p.position[1] - p.size[1] / 2);
  const lowestY = Math.min(...allBottomY);
  if (lowestY < -0.01) {
    const shift = -lowestY;
    for (const p of result) {
      p.position = [p.position[0], p.position[1] + shift, p.position[2]];
    }
  }

  // === Fix: Clamp unreasonably large panels ===
  for (const p of result) {
    for (let axis = 0; axis < 3; axis++) {
      if (p.size[axis] > 4.0) {
        p.size[axis] = Math.min(p.size[axis], 4.0);
      }
    }
  }

  // === Fix: Ensure parts with "leg" in label touch floor ===
  for (const p of result) {
    if (/\bleg\b/i.test(p.label) && !/(arm|back)/i.test(p.label)) {
      const legH = p.size[1];
      const expectedY = legH / 2;
      if (Math.abs(p.position[1] - expectedY) > 0.05) {
        p.position = [p.position[0], expectedY, p.position[2]];
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
  const repaired = repairSeatingGeometry(refined, analysis.name ?? "", nextId);
  const withBase = repairOfficeChairBase(repaired, analysis.name ?? "", nextId);
  const bedFixed = repairBedGeometry(withBase, analysis.name ?? "");
  return validateAndRepairGeometry(bedFixed);
}
