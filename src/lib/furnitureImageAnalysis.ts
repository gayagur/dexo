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
  "draped",
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
  "softness",
  "foldSpread",
]);

function num3(v: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(v) || v.length < 3) return fallback;
  const a = Number(v[0]);
  const b = Number(v[1]);
  const c = Number(v[2]);
  if (![a, b, c].every((n) => Number.isFinite(n))) return fallback;
  return [a, b, c];
}

/**
 * Vision models often emit degrees (90, -45) or huge "radians" that are actually degrees.
 * Three.js / R3F use Euler XYZ in radians; values like 15–360 on an axis almost always mean degrees.
 */
function optionalRotation(v: unknown): [number, number, number] | undefined {
  if (!Array.isArray(v) || v.length < 3) return undefined;
  let a = Number(v[0]);
  let b = Number(v[1]);
  let c = Number(v[2]);
  if (![a, b, c].every((n) => Number.isFinite(n))) return undefined;

  const maxAbs = Math.max(Math.abs(a), Math.abs(b), Math.abs(c));
  // Clear mistake: degrees written as numbers 6.5..360 (π/2≈1.57 is valid; 90 is not)
  if (maxAbs > 6.5 && maxAbs <= 360) {
    const k = Math.PI / 180;
    a *= k;
    b *= k;
    c *= k;
  } else {
    const nearIntDeg =
      maxAbs >= 8 &&
      maxAbs <= 360 &&
      [a, b, c].every(
        (x) => Math.abs(x) < 0.01 || Math.abs(x - Math.round(x)) < 0.2,
      );
    if (nearIntDeg) {
      const k = Math.PI / 180;
      a *= k;
      b *= k;
      c *= k;
    }
  }

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

/** Vision models often emit mm in panel fields; normalize before clamping (which capped 1800→10m). */
function scaleRawAnalysisPanelsToMeters(rawPanels: RawAnalysisPanel[]): RawAnalysisPanel[] {
  if (rawPanels.length === 0) return rawPanels;
  let maxPos = 0;
  let maxSize = 0;
  for (const p of rawPanels) {
    if (Array.isArray(p.position)) {
      for (const x of p.position) {
        const n = Math.abs(Number(x));
        if (Number.isFinite(n)) maxPos = Math.max(maxPos, n);
      }
    }
    if (Array.isArray(p.size)) {
      for (const x of p.size) {
        const n = Math.abs(Number(x));
        if (Number.isFinite(n)) maxSize = Math.max(maxSize, n);
      }
    }
  }
  const scalePos = maxPos > 14 ? 0.001 : 1;
  const scaleSize = maxSize > 5 ? 0.001 : 1;
  if (scalePos === 1 && scaleSize === 1) return rawPanels;

  return rawPanels.map((p) => {
    const out: RawAnalysisPanel = { ...p };
    if (scalePos !== 1 && Array.isArray(p.position)) {
      out.position = p.position.map((x) => Number(x) * scalePos) as unknown;
    }
    if (scaleSize !== 1 && Array.isArray(p.size)) {
      out.size = p.size.map((x) => Number(x) * scaleSize) as unknown;
    }
    return out;
  });
}

/**
 * Clamp absurd UI dims from vision (e.g. coffee table height 1600mm).
 */
export function sanitizeEstimatedDims(
  name: string,
  dims: { w: number; h: number; d: number } | undefined,
): { w: number; h: number; d: number } | undefined {
  if (!dims) return undefined;
  let { w, h, d } = { ...dims };
  if (![w, h, d].every((n) => Number.isFinite(n))) return dims;
  const maxAny = Math.max(Math.abs(w), Math.abs(h), Math.abs(d));
  if (maxAny > 8000) {
    w /= 1000;
    h /= 1000;
    d /= 1000;
  }
  const n = name.toLowerCase();
  if (/\bcoffee\b|\bside\s*table\b|\bend\s*table\b|\btea\s*table\b/i.test(n)) {
    h = Math.min(h, 650);
    w = Math.min(w, 3500);
    d = Math.min(d, 2200);
  }
  if (/\b(nightstand|bedside)\b/i.test(n)) {
    h = Math.min(h, 900);
  }
  if (/\bbed\s*frame\b|\bplatform\s*bed\b|\bbed\b/i.test(n) && !/\b(sofa|couch|daybed)\b/i.test(n)) {
    h = Math.min(h, 2400);
  }
  return { w, h, d };
}

function normalizeType(t: unknown): PanelData["type"] {
  if (t === "horizontal" || t === "vertical" || t === "back") return t;
  return "vertical";
}

/**
 * Vision models often use fat size[1] for flat shelves or put thickness on the wrong axis.
 * Editor box = [X width, Y height, Y-up]; horizontal boards should be thin on Y.
 */
function clampRealisticThickness(panel: PanelData): PanelData {
  const sh = panel.shape ?? "box";
  if (sh !== "box" && sh !== "rounded_rect") return panel;

  let [w, h, d] = panel.size;
  const L = panel.label.toLowerCase();

  if (panel.type === "horizontal") {
    const noSwap = /\b(seat|cushion|mattress|drawer|block|step|plinth|pedestal|bun|foam|tread)\b/i.test(L);
    if (!noSwap && h > Math.max(w, d) * 0.42) {
      const sorted = [w, h, d].slice().sort((a, b) => a - b);
      const t = Math.max(sorted[0], 0.014);
      const mid = sorted[1];
      const lo = sorted[2];
      w = lo;
      h = t;
      d = mid;
    }

    const shelfLike =
      /\b(shelf|slat|tier|apron|stretcher|rail|plank|board|bar)\b/i.test(L) ||
      (!/\b(seat|cushion|mattress|drawer|top\b|counter|block|step|plinth|pedestal|tread)\b/i.test(L) &&
        Math.max(w, d) > h * 2.5);

    if (shelfLike && h > 0.055) {
      h = Math.min(h, 0.048);
    }
    return { ...panel, size: [w, h, d] };
  }

  if (panel.type === "back") {
    const m = Math.min(w, h, d);
    if (m > 0.052) {
      const target = 0.024;
      const f = target / m;
      if (m === w) w *= f;
      else if (m === h) h *= f;
      else d *= f;
    }
    return { ...panel, size: [w, h, d] };
  }

  if (panel.type === "vertical") {
    const sheet =
      /\b(side|stile|end\s*panel|divider|partition|upright|head\b|foot\b|headboard|footboard)\b/i.test(L) ||
      (/\b(panel|board)\b/i.test(L) && !/\b(back|circuit)\b/i.test(L));
    const minXZ = Math.min(w, d);
    if (sheet && h > 0.18 && minXZ > 0.055 && minXZ < h * 0.45) {
      const target = 0.034;
      if (minXZ > target) {
        const f = target / minXZ;
        if (w <= d) w *= f;
        else d *= f;
      }
    }
    return { ...panel, size: [w, h, d] };
  }

  return panel;
}

/** Drop tiny meaningless rotations; clamp extreme values from bad JSON. */
function sanitizeImportRotation(panel: PanelData): PanelData {
  const r = panel.rotation;
  if (!r) return panel;
  const [rx, ry, rz] = r;
  const allowTilt = /\b(back|cushion|pillow|headrest|tilt|lean|recline|bolster)\b/i.test(panel.label);

  if (!allowTilt && Math.abs(rx) + Math.abs(ry) + Math.abs(rz) < 0.055) {
    const { rotation: _r, ...rest } = panel;
    return rest as PanelData;
  }

  const c = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));
  return {
    ...panel,
    rotation: [c(rx, allowTilt ? 0.65 : 0.4), c(ry, Math.PI), c(rz, allowTilt ? 0.5 : 0.4)] as [
      number,
      number,
      number,
    ],
  };
}

const RIGID_STRUCTURE_LABEL =
  /\b(leg|feet|foot|slat|apron|rail|stretcher|post|stile|plinth|pedestal|column|spindle)\b/i;
const SPLAY_OR_ANGLE_LABEL = /\b(splay|splayed|angled\s*leg|tilted\s*frame)\b/i;

/**
 * Models often add small random Euler angles to "fix" wrong axes — makes rigid parts look twisted.
 * Legs/slats/aprons: drop noise; keep real tilts only for upholstery / named splay.
 */
function stabilizeStructuralRotation(panel: PanelData): PanelData {
  if (!panel.rotation) return panel;
  if (SPLAY_OR_ANGLE_LABEL.test(panel.label)) return panel;

  const allowTilt =
    /\b(back|cushion|pillow|headrest|tilt|lean|recline|bolster|seat|arm|wedge|slope)\b/i.test(
      panel.label,
    );

  let [rx, ry, rz] = panel.rotation;

  const snapSmall = (v: number, eps: number) => (Math.abs(v) < eps ? 0 : v);
  const sum = Math.abs(rx) + Math.abs(ry) + Math.abs(rz);

  if (panel.type === "back" && sum < 0.14) {
    const { rotation: _r, ...rest } = panel;
    return rest as PanelData;
  }

  if (!allowTilt && RIGID_STRUCTURE_LABEL.test(panel.label) && sum < 0.2) {
    const { rotation: _r, ...rest } = panel;
    return rest as PanelData;
  }

  if (
    /\b(leg|post|column)\b/i.test(panel.label) &&
    !/\barm\b/i.test(panel.label) &&
    !allowTilt
  ) {
    if (Math.abs(rx) < 0.38 && Math.abs(rz) < 0.38) {
      rx = snapSmall(rx, 0.12);
      rz = snapSmall(rz, 0.12);
    }
    ry = snapSmall(ry, 0.1);
  }

  if (panel.type === "horizontal" && RIGID_STRUCTURE_LABEL.test(panel.label) && !allowTilt) {
    rx = snapSmall(rx, 0.1);
    ry = snapSmall(ry, 0.1);
    rz = snapSmall(rz, 0.1);
  }

  if (Math.abs(rx) + Math.abs(ry) + Math.abs(rz) < 0.045) {
    const { rotation: _r, ...rest } = panel;
    return rest as PanelData;
  }

  return { ...panel, rotation: [rx, ry, rz] };
}

/**
 * Vertical box/rounded_rect should be tall on Y. Models often put board thickness on size[1] by mistake.
 * When Y is clearly the thinnest dimension, remap to [midSpan, tallSpan, thickness] (thin on Z).
 */
function normalizeVerticalBoxHeightAxis(panel: PanelData): PanelData {
  if (panel.type !== "vertical") return panel;
  const sh = panel.shape ?? "box";
  if (sh !== "box" && sh !== "rounded_rect") return panel;
  const [w, h, d] = panel.size;
  const M = Math.max(w, h, d);
  if (!(h < w && h < d)) return panel;
  if (h >= M * 0.28 || M < 0.08) return panel;
  const sorted = [w, h, d].slice().sort((a, b) => a - b);
  const [t, mid, tall] = sorted;
  const { rotation: _r, ...rest } = panel;
  return { ...rest, size: [mid, tall, t] as [number, number, number] };
}

/** Cylinder/cone in ShapeRenderer use Y as height; vertical parts must have size[1] as the tall axis. */
function normalizeVerticalAxisymmetricPanel(panel: PanelData): PanelData {
  const sh = panel.shape ?? "box";
  if (panel.type !== "vertical") return panel;
  if (sh !== "cylinder" && sh !== "cone" && sh !== "tapered_leg") return panel;

  let [w, h, d] = panel.size;
  if (h >= w - 1e-6 && h >= d - 1e-6) {
    const diam = Math.max(0.008, (w + d) / 2);
    return { ...panel, size: [diam, h, diam] };
  }

  const sorted = [w, h, d].slice().sort((x, y) => x - y);
  const H = sorted[2];
  const D = Math.max(sorted[0], sorted[1], 0.008);
  const { rotation: _drop, ...rest } = panel;
  return {
    ...rest,
    size: [D, H, D] as [number, number, number],
  };
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

  const result = [...panels];

  // Collect semantic groups — match any cushion variant + boxes with upholstery
  const isCushionShape = (s: string) => /^(cushion|cushion_firm|padded_block|mattress)$/.test(s);
  const isUpholstered = (p: PanelData) => isCushionShape(p.shape ?? "box") || ((p.shape ?? "box") === "box" && UPHOLSTERY_MAT_RE.test(p.materialId));
  // Seat = horizontal upholstered part at seat height, excluding back/pillow/arm/throw
  const seatCushions = result.filter(p => isUpholstered(p) && p.type === "horizontal" && p.position[1] > 0.15 && p.position[1] < 0.55 && !/back|pillow|throw|arm/i.test(p.label));
  const backCushions = result.filter(p => isUpholstered(p) && p.type === "vertical" && !/arm|leg|pillow|throw/i.test(p.label) && /back|rest|cushion/i.test(p.label));
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

  // === Fix 3: Compact seat cushions (remove gaps between them) ===
  // AI often spaces seat cushions too far apart. Pack them side-by-side within the arm boundaries.
  if (isSofa && seatCushions.length >= 2) {
    // Find arm positions to determine inner width
    const arms = result.filter(p => /arm/i.test(p.label));
    let innerLeft: number, innerRight: number;
    if (arms.length >= 2) {
      const armXs = arms.map(a => a.position[0]).sort((a, b) => a - b);
      const leftArm = arms.find(a => a.position[0] === armXs[0])!;
      const rightArm = arms.find(a => a.position[0] === armXs[armXs.length - 1])!;
      innerLeft = leftArm.position[0] + leftArm.size[0] / 2;
      innerRight = rightArm.position[0] - rightArm.size[0] / 2;
    } else {
      // No arms — use total footprint
      const allX = result.map(p => [p.position[0] - p.size[0] / 2, p.position[0] + p.size[0] / 2]).flat();
      innerLeft = Math.min(...allX) + 0.05;
      innerRight = Math.max(...allX) - 0.05;
    }

    const innerWidth = innerRight - innerLeft;
    if (innerWidth > 0.3) {
      const cushCount = seatCushions.length;
      const gap = 0.015; // small gap between cushions
      const cushW = (innerWidth - gap * (cushCount - 1)) / cushCount;

      // Sort cushions by current X and reassign evenly
      const sorted = [...seatCushions].sort((a, b) => a.position[0] - b.position[0]);
      for (let i = 0; i < sorted.length; i++) {
        const newX = innerLeft + cushW / 2 + i * (cushW + gap);
        sorted[i].position = [newX, sorted[i].position[1], sorted[i].position[2]];
        sorted[i].size = [cushW, sorted[i].size[1], sorted[i].size[2]];
      }
    }
  }

  // === Fix 4: Validate back cushion positions ===
  if (seatCushions.length > 0 && backCushions.length > 0) {
    const seatTopY = Math.max(...seatCushions.map(p => p.position[1] + p.size[1] / 2));
    const seatBackZ = Math.min(...seatCushions.map(p => p.position[2] - p.size[2] / 2));
    const seatCenterX = seatCushions.reduce((s, p) => s + p.position[0], 0) / seatCushions.length;

    // Sort seat cushions by X to match with back cushions
    const sortedSeats = [...seatCushions].sort((a, b) => a.position[0] - b.position[0]);

    for (let i = 0; i < backCushions.length; i++) {
      const bc = backCushions[i];

      // Back cushion Y: must be above seat top
      if (bc.position[1] < seatTopY) {
        bc.position = [bc.position[0], seatTopY + bc.size[1] / 2, bc.position[2]];
      }

      // Back cushion Z: must be behind seats
      if (bc.position[2] > seatBackZ + 0.05) {
        bc.position = [bc.position[0], bc.position[1], seatBackZ - bc.size[2] / 2 + 0.02];
      }

      // Back cushion X: if counts match, align X with corresponding seat cushion
      if (backCushions.length === seatCushions.length && sortedSeats[i]) {
        const seatX = sortedSeats[i].position[0];
        // If back cushion X is far from its matching seat, snap it
        if (Math.abs(bc.position[0] - seatX) > 0.15) {
          bc.position = [seatX, bc.position[1], bc.position[2]];
        }
      }

      // Back cushion X: if too far from sofa center, it's misplaced (probably at arm position)
      const allSeatMinX = Math.min(...seatCushions.map(p => p.position[0] - p.size[0] / 2));
      const allSeatMaxX = Math.max(...seatCushions.map(p => p.position[0] + p.size[0] / 2));
      if (bc.position[0] < allSeatMinX - 0.10 || bc.position[0] > allSeatMaxX + 0.10) {
        // Back cushion is outside seat area — snap to nearest seat X
        const nearest = sortedSeats.reduce((best, s) =>
          Math.abs(s.position[0] - bc.position[0]) < Math.abs(best.position[0] - bc.position[0]) ? s : best
        );
        bc.position = [nearest.position[0], bc.position[1], bc.position[2]];
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
 * Bookcases / open shelving: AI often stacks shelf boards almost coplanar (Z-fighting) or too tight in Y.
 */
function repairBookcaseShelfSpacing(panels: PanelData[], furnitureName: string): void {
  if (!/\b(bookcase|bookshelf|shelv|rack|étagère|etagere|display\s*shelf|open\s*shelf|storage\s*shelf|wall\s*shelf)/i.test(furnitureName)) {
    return;
  }

  const isShelfLike = (p: PanelData) => {
    if (p.type !== "horizontal") return false;
    if (/\b(drawer|counter|worktop|desktop|seat|mattress|cushion)/i.test(p.label)) return false;
    const [w, h, d] = p.size;
    const thick = Math.min(w, h, d);
    const span = Math.max(w, d);
    if (thick > 0.085 || span < 0.18) return false;
    if (/\b(shelf|tier|level|board|plank|rail)\b/i.test(p.label)) return true;
    return span / Math.max(thick, 0.001) >= 4;
  };

  const shelves = panels.filter(isShelfLike);
  if (shelves.length < 2) return;

  shelves.sort((a, b) => a.position[1] - b.position[1]);
  const MIN_CLEAR = 0.11;
  for (let i = 1; i < shelves.length; i++) {
    const low = shelves[i - 1];
    const hi = shelves[i];
    const topLow = low.position[1] + low.size[1] / 2;
    const botHi = hi.position[1] - hi.size[1] / 2;
    const clear = botHi - topLow;
    if (clear < MIN_CLEAR) {
      hi.position = [hi.position[0], hi.position[1] + (MIN_CLEAR - clear), hi.position[2]];
    }
  }
}

/**
 * Nudge nearly-coincident vertical panels apart in X to reduce black Z-fighting stripes.
 */
function nudgeCoplanarVerticalPanels(panels: PanelData[]): void {
  const verticals = panels.filter(
    (p) =>
      p.type === "vertical" &&
      (p.shape ?? "box") === "box" &&
      p.size[0] > 0.004 &&
      p.size[0] < 0.35,
  );
  const EPS = 0.003;
  for (let i = 0; i < verticals.length; i++) {
    for (let j = i + 1; j < verticals.length; j++) {
      const a = verticals[i];
      const b = verticals[j];
      if (Math.abs(a.position[2] - b.position[2]) > 0.02) continue;
      if (Math.abs(a.position[1] - b.position[1]) > 0.08) continue;
      const ax0 = a.position[0] - a.size[0] / 2;
      const ax1 = a.position[0] + a.size[0] / 2;
      const bx0 = b.position[0] - b.size[0] / 2;
      const bx1 = b.position[0] + b.size[0] / 2;
      const overlap = Math.min(ax1, bx1) - Math.max(ax0, bx0);
      if (overlap > a.size[0] * 0.55 && overlap > b.size[0] * 0.55) {
        b.position = [b.position[0] + EPS, b.position[1], b.position[2]];
      }
    }
  }
}

function spreadEvenly<T>(items: T[], start: number, end: number, set: (item: T, value: number) => void): void {
  if (items.length === 0) return;
  if (items.length === 1) {
    set(items[0], (start + end) / 2);
    return;
  }
  const span = end - start;
  items.forEach((item, i) => {
    const t = i / (items.length - 1);
    set(item, start + span * t);
  });
}

/**
 * When the vision model identifies the right parts but puts many of them on nearly the same center,
 * the canvas shows a dense black block. This pass spreads obvious semantic parts into a plausible
 * furniture layout, but ONLY when the import is clearly collapsed.
 */
function repairCollapsedLayout(panels: PanelData[], furnitureName: string): void {
  if (panels.length < 5) return;

  const bottoms = panels.map((p) => p.position[1] - p.size[1] / 2);
  const tops = panels.map((p) => p.position[1] + p.size[1] / 2);
  const lefts = panels.map((p) => p.position[0] - p.size[0] / 2);
  const rights = panels.map((p) => p.position[0] + p.size[0] / 2);
  const backs = panels.map((p) => p.position[2] - p.size[2] / 2);
  const fronts = panels.map((p) => p.position[2] + p.size[2] / 2);

  const minX = Math.min(...lefts);
  const maxX = Math.max(...rights);
  const minY = Math.min(...bottoms);
  const maxY = Math.max(...tops);
  const minZ = Math.min(...backs);
  const maxZ = Math.max(...fronts);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const spanZ = maxZ - minZ;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  if (spanX < 0.12 && spanZ < 0.12) return;

  const closePairs = (() => {
    let close = 0;
    let total = 0;
    for (let i = 0; i < panels.length; i++) {
      for (let j = i + 1; j < panels.length; j++) {
        total++;
        const a = panels[i];
        const b = panels[j];
        const dx = Math.abs(a.position[0] - b.position[0]);
        const dy = Math.abs(a.position[1] - b.position[1]);
        const dz = Math.abs(a.position[2] - b.position[2]);
        if (dx < 0.09 && dy < 0.12 && dz < 0.09) close++;
      }
    }
    return total > 0 ? close / total : 0;
  })();

  const meanDistXZ =
    panels.reduce((sum, p) => {
      const dx = p.position[0] - cx;
      const dz = p.position[2] - cz;
      return sum + Math.sqrt(dx * dx + dz * dz);
    }, 0) / panels.length;
  const expectedSpread = Math.max(spanX, spanZ) * 0.22;
  const looksCollapsed = closePairs > 0.22 || meanDistXZ < expectedSpread;
  if (!looksCollapsed) return;

  const label = (p: PanelData) => p.label.toLowerCase();
  const isBackLike = (p: PanelData) =>
    /\b(back|backrest|headrest|head\s*rest|rear|headboard)\b/i.test(label(p)) || p.type === "back";
  const isSeatLike = (p: PanelData) =>
    /\b(seat|cushion|mattress|duvet|blanket|throw|top|surface|desktop|counter)\b/i.test(label(p)) ||
    (p.type === "horizontal" && p.size[1] <= Math.max(p.size[0], p.size[2]) * 0.3);
  const isLegLike = (p: PanelData) =>
    /\b(leg|foot|feet|caster|wheel)\b/i.test(label(p)) || (p.shape ?? "box") === "caster";
  const isSideLike = (p: PanelData) =>
    /\b(side|arm|armrest|upright|panel|stile|post)\b/i.test(label(p)) && !isBackLike(p);
  const isCenterColumn = (p: PanelData) =>
    /\b(column|pedestal|gas\s*lift|center\s*post|base\s*post|spindle)\b/i.test(label(p)) ||
    (p.shape ?? "box") === "pedestal";

  const seatLikes = panels.filter(isSeatLike);
  const backLikes = panels.filter(isBackLike);
  const legLikes = panels.filter(isLegLike);
  const sideLikes = panels.filter(isSideLike);
  const centerColumns = panels.filter(isCenterColumn);

  const planFromSeats = seatLikes.length > 0
    ? {
        w: Math.max(...seatLikes.map((p) => p.size[0])),
        d: Math.max(...seatLikes.map((p) => p.size[2])),
      }
    : {
        w: Math.max(...panels.map((p) => p.size[0])),
        d: Math.max(...panels.map((p) => p.size[2])),
      };

  const footW = Math.max(spanX, planFromSeats.w, 0.35);
  const footD = Math.max(spanZ, planFromSeats.d, 0.35);
  const leftX = cx - footW / 2;
  const rightX = cx + footW / 2;
  const backZ = cz - footD / 2;
  const frontZ = cz + footD / 2;

  // Large horizontal parts become the main footprint anchors.
  for (const p of seatLikes) {
    const L = label(p);
    const y = Math.max(minY + p.size[1] / 2, p.position[1]);
    let z = cz;
    if (/\b(back|rear)\b/i.test(L)) z = backZ + p.size[2] / 2 + 0.015;
    else if (/\b(front|footrest)\b/i.test(L)) z = frontZ - p.size[2] / 2 - 0.015;
    p.position = [cx, y, z];
  }

  // Put back / headrest parts behind the seat area.
  for (const p of backLikes) {
    const targetY = Math.max(
      p.position[1],
      ...seatLikes.map((s) => s.position[1] + s.size[1] / 2 + p.size[1] / 2 + 0.02),
      minY + spanY * 0.55,
    );
    p.position = [cx, targetY, backZ + p.size[2] / 2 + 0.01];
  }

  // Center post / gas lift stays centered.
  for (const p of centerColumns) {
    p.position = [cx, Math.max(p.size[1] / 2, p.position[1]), cz];
  }

  // Spread legs / casters to footprint corners or around the perimeter.
  if (legLikes.length > 0) {
    const insetX = Math.max(0.03, footW * 0.12);
    const insetZ = Math.max(0.03, footD * 0.12);
    const corners: [number, number][] = [
      [leftX + insetX, backZ + insetZ],
      [rightX - insetX, backZ + insetZ],
      [leftX + insetX, frontZ - insetZ],
      [rightX - insetX, frontZ - insetZ],
    ];
    legLikes.forEach((p, i) => {
      const [tx, tz] = corners[i % corners.length];
      const y = /\b(caster|wheel)\b/i.test(label(p))
        ? Math.max(p.size[1] / 2, minY + p.size[1] / 2)
        : Math.max(p.size[1] / 2, minY + p.size[1] / 2);
      p.position = [tx, y, tz];
    });
  }

  // Spread left/right arms or side panels to the outside edges.
  const sideCandidates = sideLikes.filter((p) => !legLikes.includes(p) && !centerColumns.includes(p));
  const leftSide = sideCandidates.filter((_, i) => i % 2 === 0);
  const rightSide = sideCandidates.filter((_, i) => i % 2 === 1);
  spreadEvenly(leftSide, backZ + 0.08, frontZ - 0.08, (p, z) => {
    p.position = [leftX + p.size[0] / 2 + 0.01, p.position[1], z];
  });
  spreadEvenly(rightSide, backZ + 0.08, frontZ - 0.08, (p, z) => {
    p.position = [rightX - p.size[0] / 2 - 0.01, p.position[1], z];
  });

  // If many generic vertical pieces still sit at center, fan them across X to expose the structure.
  const centralVerticals = panels
    .filter((p) => p.type === "vertical" && !backLikes.includes(p) && !legLikes.includes(p) && !centerColumns.includes(p))
    .filter((p) => Math.abs(p.position[0] - cx) < footW * 0.12);
  centralVerticals.sort((a, b) => a.label.localeCompare(b.label));
  spreadEvenly(centralVerticals, leftX + 0.08, rightX - 0.08, (p, x) => {
    p.position = [x, p.position[1], p.position[2]];
  });

  // Keep floor contact sane after spreading.
  for (const p of panels) {
    const bottom = p.position[1] - p.size[1] / 2;
    if (bottom < 0) {
      p.position = [p.position[0], p.position[1] - bottom, p.position[2]];
    }
  }
}

/**
 * General geometry validation — runs on ALL furniture types.
 * Fixes common AI mistakes regardless of category.
 */
function validateAndRepairGeometry(panels: PanelData[], furnitureName: string): PanelData[] {
  if (panels.length === 0) return panels;

  const result = [...panels];

  // === Slats / legs stacked at identical centers → spread along Z before dedupe ===
  const isStructuralRepeat = (label: string) =>
    /\bslat\b/i.test(label) || (/\bleg\b/i.test(label) && !/arm|back/i.test(label));
  const bucket = (v: number) => Math.round(v / 0.025) * 0.025;
  const groupKey = (p: PanelData) =>
    `${bucket(p.position[0])}|${bucket(p.position[1])}|${bucket(p.position[2])}`;
  const repeatGroups = new Map<string, PanelData[]>();
  for (const p of result) {
    if (!isStructuralRepeat(p.label)) continue;
    const k = groupKey(p);
    const arr = repeatGroups.get(k) ?? [];
    arr.push(p);
    repeatGroups.set(k, arr);
  }
  for (const arr of repeatGroups.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a.label.localeCompare(b.label));
    const step = Math.max(0.016, Math.min(...arr.map((x) => x.size[2])) * 0.9);
    const mid = (arr.length - 1) / 2;
    arr.forEach((p, i) => {
      p.position = [p.position[0], p.position[1], p.position[2] + (i - mid) * step];
    });
  }

  // === Remove duplicate/near-identical panels (keep distinct slat/leg labels) ===
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
      if (dx >= 0.02 || dy >= 0.02 || dz >= 0.02 || sw >= 0.02 || sh >= 0.02 || sd >= 0.02) continue;

      const la = a.label.toLowerCase().trim();
      const lb = b.label.toLowerCase().trim();
      if (la !== lb && /\bslat\b/i.test(la) && /\bslat\b/i.test(lb)) continue;
      if (la !== lb && /\bleg\b/i.test(la) && /\bleg\b/i.test(lb)) continue;

      toRemove.add(j);
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

  repairCollapsedLayout(result, furnitureName);
  repairBookcaseShelfSpacing(result, furnitureName);
  nudgeCoplanarVerticalPanels(result);

  return result;
}

export function panelsFromFurnitureAnalysis(
  analysis: FurnitureAnalysis,
  nextId: () => string
): PanelData[] {
  const rawScaled = scaleRawAnalysisPanelsToMeters(
    (analysis.panels ?? []) as unknown as RawAnalysisPanel[],
  );
  const panels = rawScaled
    .map((p) => normalizeAnalysisPanel(p, nextId()))
    .map(normalizeVerticalBoxHeightAxis)
    .map(normalizeVerticalAxisymmetricPanel)
    .map(clampRealisticThickness)
    .map(sanitizeImportRotation)
    .map(stabilizeStructuralRotation)
    .map(fixHorizontalRoundDisk);
  const refined = refineSeatingImportPanels(panels, analysis.name ?? "");
  const repaired = repairSeatingGeometry(refined, analysis.name ?? "", nextId);
  const withBase = repairOfficeChairBase(repaired, analysis.name ?? "", nextId);
  return validateAndRepairGeometry(withBase, analysis.name ?? "");
}
