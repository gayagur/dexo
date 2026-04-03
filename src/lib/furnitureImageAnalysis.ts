/**
 * Normalize AI vision output into valid editor panels (shapes, materials, numeric arrays).
 */
import type { PanelData, PanelShape } from "./furnitureData";
import { MATERIALS } from "./furnitureData";
import type { FurnitureAnalysis } from "./ai";
import {
  classifyPanelRole,
  detectFurnitureCategory,
  inferPositionsFromCategory,
  repairCasegoodsLayout,
  repairShelvingLayout,
  repairTableDeskLayout,
  repairWardrobeLayout,
  type FurnitureCategory,
} from "./furnitureLayoutStrategies";

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
const SHAPE_ALIASES: Record<string, PanelShape> = {
  roundedrect: "rounded_rect",
  "rounded-rect": "rounded_rect",
  "rounded rectangle": "rounded_rect",
  roundedrectangle: "rounded_rect",
  cushionfirm: "cushion_firm",
  "firm cushion": "cushion_firm",
  cushionblock: "cushion_firm",
  softbox: "cushion_firm",
  soft_box: "cushion_firm",
  paddedblock: "padded_block",
  "padded block": "padded_block",
};

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
  x?: unknown;
  y?: unknown;
  z?: unknown;
  w?: unknown;
  h?: unknown;
  d?: unknown;
  width?: unknown;
  height?: unknown;
  depth?: unknown;
  offset?: unknown;
  bounds?: unknown;
  min?: unknown;
  max?: unknown;
  materialId?: unknown;
  shapeParams?: unknown;
  rotation?: unknown;
  cornerRadius?: unknown;
};

/**
 * Generic dimension normalization on RAW panels — detects units and converts to meters.
 * Works for ANY furniture type: finds the largest dimension across all panels,
 * determines the unit, scales everything, and clamps to sane bounds.
 * Must run BEFORE normalizeAnalysisPanel (which clamps sizes to 10m).
 */
function normalizeRawPanelDimensions(rawPanels: RawAnalysisPanel[]): RawAnalysisPanel[] {
  if (rawPanels.length === 0) return rawPanels;
  const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;

  // Extract sizes and positions from raw data
  const extracted = rawPanels.map((raw) => ({
    raw,
    size: extractRawSize(raw),
    position: extractRawPosition(raw, extractRawSize(raw)),
  }));

  // Find the largest single dimension value across ALL panels
  let largest = 0;
  for (const { size, position } of extracted) {
    if (size) for (const v of size) largest = Math.max(largest, Math.abs(v));
    if (position) for (const v of position) largest = Math.max(largest, Math.abs(v));
  }

  // Detect unit
  let scale = 1;
  if (largest > 100) {
    scale = 0.001; // mm → meters
  } else if (largest > 10) {
    scale = 0.01;  // cm → meters
  }

  if (isDev) {
    console.log("[normalizeRawPanelDimensions] largest value:", largest, "→ scale:", scale);
  }

  if (scale === 1) return rawPanels; // already meters

  return extracted.map(({ raw, size, position }) => {
    const out: RawAnalysisPanel = { ...raw };
    if (size) {
      out.size = size.map((v) => Math.max(0.005, Math.min(Math.abs(v) * scale, 3))) as unknown;
    }
    if (position) {
      out.position = position.map((v) => v * scale) as unknown;
    }
    // Also scale w/h/d and x/y/z if present (some models use these)
    if (typeof raw.w === "number") out.w = (raw.w as number) * scale;
    if (typeof raw.h === "number") out.h = (raw.h as number) * scale;
    if (typeof raw.d === "number") out.d = (raw.d as number) * scale;
    if (typeof raw.width === "number") out.width = (raw.width as number) * scale;
    if (typeof raw.height === "number") out.height = (raw.height as number) * scale;
    if (typeof raw.depth === "number") out.depth = (raw.depth as number) * scale;
    if (typeof raw.x === "number") out.x = (raw.x as number) * scale;
    if (typeof raw.y === "number") out.y = (raw.y as number) * scale;
    if (typeof raw.z === "number") out.z = (raw.z as number) * scale;
    return out;
  });
}

/**
 * Generic position inference — ignores AI positions entirely and rebuilds
 * positions from labels and dimensions. Works for ANY furniture type.
 */
function inferPositionsFromDimensions(panels: PanelData[]): PanelData[] {
  if (panels.length === 0) return panels;
  const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;

  // Sort by volume (largest first) to establish the reference envelope
  const sorted = panels.map((p, i) => ({
    panel: p,
    originalIndex: i,
    volume: p.size[0] * p.size[1] * p.size[2],
  })).sort((a, b) => b.volume - a.volume);

  // The largest panel defines the envelope
  const refW = Math.max(...panels.map((p) => p.size[0]));
  const refD = Math.max(...panels.map((p) => p.size[2]));

  // Classify each panel by label keywords
  type Role = "bottom" | "top" | "back" | "front" | "side" | "seat" | "arm" | "head" | "shelf" | "default";
  function classifyLabel(label: string): Role {
    const l = label.toLowerCase();
    // "footboard" must match "front" before "bottom" checks for "foot"
    if (/\b(footboard|foot\s*board)\b/.test(l)) return "front";
    if (/\b(headboard|head\s*board)\b/.test(l)) return "head";
    if (/\b(leg|feet|base|pedestal|wheel|caster|plinth|bun|star.?base|x.?base)\b/.test(l)) return "bottom";
    // "foot" alone (not "footboard") = leg/bottom
    if (/\bfoot\b/.test(l) && !/board/.test(l)) return "bottom";
    if (/\b(top|tabletop|surface|countertop|desktop|worktop)\b/.test(l)) return "top";
    if (/\b(back|backrest|rear|spine)\b/.test(l) && !/\bleg\b/.test(l)) return "back";
    if (/\b(front\s*panel|front\s*face)\b/.test(l)) return "front";
    if (/\b(shelf|slat|tier|stretcher|apron|rail|brace|support)\b/.test(l)) return "shelf";
    if (/\b(side|wall|door|panel|stile|upright)\b/.test(l) && !/\b(back|front|arm)\b/.test(l)) return "side";
    if (/\b(seat|cushion|pad|mattress)\b/.test(l) && !/\bback\b/.test(l)) return "seat";
    if (/\b(arm|armrest)\b/.test(l)) return "arm";
    if (/\b(head|headrest)\b/.test(l)) return "head";
    if (/\b(drawer)\b/.test(l)) return "front";
    return "default";
  }

  // Group panels by role for counting
  const roleCounts = new Map<Role, number>();
  const roleIndices = new Map<Role, number>();
  for (const { panel } of sorted) {
    const role = classifyLabel(panel.label);
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  // Track placed heights for stacking
  let bottomTop = 0;       // top edge of bottom-role panels
  let seatTop = 0;         // top edge of seat-role panels
  let backTop = 0;         // top edge of back-role panels
  let sideTop = 0;         // top edge of side-role panels (for cabinets/counters)
  let seatD = refD;        // depth of main body (seat/mattress/top)
  let seatH = 0;           // height span of the body (for shelf stacking)
  let defaultStackY = 0;   // running Y for default-stacked panels

  // First pass: compute reference heights and body dimensions
  for (const { panel } of sorted) {
    if (classifyLabel(panel.label) === "bottom") bottomTop = Math.max(bottomTop, panel.size[1]);
  }
  for (const { panel } of sorted) {
    const role = classifyLabel(panel.label);
    if (role === "seat") {
      seatTop = Math.max(seatTop, bottomTop + panel.size[1]);
      seatD = Math.max(seatD, panel.size[2]);  // use seat/mattress depth as body depth
    }
    if (role === "side") {
      sideTop = Math.max(sideTop, bottomTop + panel.size[1]);
      seatH = Math.max(seatH, panel.size[1]);
    }
    if (role === "back") backTop = Math.max(backTop, bottomTop + panel.size[1]);
  }
  // Ensure reasonable defaults
  if (seatTop === 0) seatTop = bottomTop;
  if (seatH === 0) seatH = Math.max(seatTop, sideTop, backTop);
  defaultStackY = Math.max(seatTop, sideTop, backTop);

  // Second pass: assign positions
  const result = new Array<PanelData>(panels.length);
  for (const { panel, originalIndex } of sorted) {
    const role = classifyLabel(panel.label);
    const idx = roleIndices.get(role) ?? 0;
    roleIndices.set(role, idx + 1);
    const count = roleCounts.get(role) ?? 1;
    const [pw, ph, pd] = panel.size;

    let x = 0;
    let y = 0;
    let z = 0;

    switch (role) {
      case "bottom": {
        // Legs/base → sit on floor, spread to corners if multiple
        y = ph / 2;
        if (count >= 4) {
          const corners: [number, number][] = [
            [-refW / 2 + pw / 2 + 0.02, -refD / 2 + pd / 2 + 0.02],
            [refW / 2 - pw / 2 - 0.02, -refD / 2 + pd / 2 + 0.02],
            [-refW / 2 + pw / 2 + 0.02, refD / 2 - pd / 2 - 0.02],
            [refW / 2 - pw / 2 - 0.02, refD / 2 - pd / 2 - 0.02],
          ];
          [x, z] = corners[idx % corners.length];
        } else if (count >= 2) {
          x = idx % 2 === 0 ? -refW / 4 : refW / 4;
        }
        break;
      }
      case "top": {
        // Top surface → above everything else (sides, back, seat, bottom)
        const belowTop = Math.max(seatTop, backTop, bottomTop, sideTop);
        y = belowTop + ph / 2;
        break;
      }
      case "back": {
        // Back → behind center, above bottom panels
        y = bottomTop + ph / 2;
        z = -(seatD / 2) - pd / 2 + 0.01;
        if (count > 1) {
          x = ((idx / Math.max(count - 1, 1)) - 0.5) * refW * 0.6;
        }
        backTop = Math.max(backTop, bottomTop + ph);
        break;
      }
      case "front": {
        // Front → opposite of back (footboard, front panel, drawer)
        y = bottomTop + ph / 2;
        z = (seatD / 2) + pd / 2 - 0.01;
        if (count > 1) {
          x = ((idx / Math.max(count - 1, 1)) - 0.5) * refW * 0.6;
        }
        break;
      }
      case "side": {
        // Sides → alternate left/right, centered on depth
        x = idx % 2 === 0 ? -refW / 2 + pw / 2 + 0.01 : refW / 2 - pw / 2 - 0.01;
        y = bottomTop + ph / 2;
        break;
      }
      case "seat": {
        // Seat/cushion/mattress → above bottom panels, centered
        y = bottomTop + ph / 2;
        if (count > 1) {
          x = ((idx / Math.max(count - 1, 1)) - 0.5) * refW * 0.7;
        }
        break;
      }
      case "shelf": {
        // Shelves/slats/rails → horizontal, stacked evenly within the body
        y = bottomTop + ph / 2;
        if (count > 1) {
          // Spread evenly along depth for slats, or stack in Y for shelves
          const isSlat = /\b(slat|brace)\b/i.test(panel.label);
          if (isSlat) {
            z = ((idx / Math.max(count - 1, 1)) - 0.5) * seatD * 0.85;
          } else {
            y = bottomTop + ph / 2 + idx * (seatH / Math.max(count, 1));
          }
        }
        break;
      }
      case "arm": {
        // Arms → left/right of seat, same height as seat
        x = idx % 2 === 0 ? -refW / 2 + pw / 2 + 0.01 : refW / 2 - pw / 2 - 0.01;
        y = Math.max(seatTop, bottomTop) + ph / 2;
        break;
      }
      case "head": {
        // Headboard/headrest → above back, behind center
        y = Math.max(backTop, seatTop, sideTop) + ph / 2;
        z = -(seatD / 2) - pd / 2 + 0.01;
        break;
      }
      default: {
        // Stack vertically above previous default panels
        y = defaultStackY + ph / 2;
        defaultStackY += ph + 0.01;
        break;
      }
    }

    result[originalIndex] = { ...panel, position: [x, y, z] };
  }

  // Re-center XZ and floor at Y=0
  const xs = result.map((p) => p.position[0]);
  const zs = result.map((p) => p.position[2]);
  const bottoms = result.map((p) => p.position[1] - p.size[1] / 2);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const minY = Math.min(...bottoms);

  const centered = result.map((p) => ({
    ...p,
    position: [
      p.position[0] - cx,
      p.position[1] - minY,
      p.position[2] - cz,
    ] as [number, number, number],
  }));

  if (isDev) {
    const maxX = Math.max(...centered.map((p) => p.position[0] + p.size[0] / 2));
    const minXc = Math.min(...centered.map((p) => p.position[0] - p.size[0] / 2));
    const maxY = Math.max(...centered.map((p) => p.position[1] + p.size[1] / 2));
    const maxZ = Math.max(...centered.map((p) => p.position[2] + p.size[2] / 2));
    const minZc = Math.min(...centered.map((p) => p.position[2] - p.size[2] / 2));
    console.log("[inferPositionsFromDimensions] final bbox:", {
      width: (maxX - minXc).toFixed(2),
      height: maxY.toFixed(2),
      depth: (maxZ - minZc).toFixed(2),
    });
    console.log("[inferPositionsFromDimensions] panels:", centered.map((p) => ({
      label: p.label,
      role: classifyLabel(p.label),
      position: p.position.map((v: number) => +v.toFixed(3)),
      size: p.size.map((v: number) => +v.toFixed(3)),
    })));
  }

  return centered;
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

  const [w, h, d] = panel.size;
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
  const shapeKey = shapeStr.toLowerCase().replace(/\s+/g, " ");
  const aliasedShape = SHAPE_ALIASES[shapeKey] ?? SHAPE_ALIASES[shapeKey.replace(/[\s-]+/g, "")];
  const normalizedShapeStr = aliasedShape ?? shapeStr;
  const shapeOk = VALID_SHAPES.has(normalizedShapeStr) ? (normalizedShapeStr as PanelShape) : "box";

  const mat = typeof raw.materialId === "string" ? raw.materialId.trim() : "";
  const materialId = VALID_MATERIAL_IDS.has(mat) ? mat : "oak";

  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim().slice(0, 120)
      : "Part";

  const extractedSize = extractRawSize(raw) ?? num3(raw.size, [0.2, 0.2, 0.05]);
  const extractedPosition = extractRawPosition(raw, extractedSize) ?? [0, 0.5, 0];
  const position = extractedPosition.map((n) => Math.max(-10, Math.min(n, 10))) as [number, number, number];
  const size = extractedSize.map((n) => Math.max(0.008, Math.min(n, 10))) as [
    number,
    number,
    number,
  ];

  const shapeParams = enhanceImportedShapeParams(
    shapeOk,
    label,
    materialId,
    size,
    sanitizeShapeParams(raw.shapeParams),
  );
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

function enhanceImportedShapeParams(
  shape: PanelShape,
  label: string,
  materialId: string,
  size: [number, number, number],
  shapeParams?: Record<string, number>,
): Record<string, number> | undefined {
  const next = { ...(shapeParams ?? {}) };
  const lower = label.toLowerCase();
  const upholstered = /^(fabric_|leather_|velvet_)/.test(materialId);
  const isSeatLike = /\b(seat|cushion|back|backrest|arm|armrest|headrest|pad|pillow)\b/i.test(lower);
  const minDim = Math.min(...size);
  const planDim = Math.max(size[0], size[2]);

  if (shape === "rounded_rect") {
    const strongRadius = upholstered || isSeatLike
      ? Math.min(Math.max(minDim * 0.22, 0.02), 0.08)
      : Math.min(Math.max(minDim * 0.12, 0.008), 0.04);
    next.cornerRadius = Math.max(next.cornerRadius ?? 0, strongRadius);
  }

  if (shape === "cushion_firm") {
    const targetSoftness =
      upholstered || isSeatLike
        ? (planDim > size[1] * 1.6 ? 0.62 : 0.52)
        : 0.42;
    next.softness = Math.max(next.softness ?? 0, targetSoftness);
  }

  if (shape === "padded_block") {
    next.softness = Math.max(next.softness ?? 0, 0.28);
    next.cornerRadius = Math.max(next.cornerRadius ?? 0, Math.min(Math.max(minDim * 0.14, 0.015), 0.05));
  }

  if (shape === "cushion") {
    next.softness = Math.max(next.softness ?? 0, 0.82);
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

type PositionSource = "position" | "xyz" | "offset" | "bounds" | "fallback";

function vec3FromObject(v: unknown): [number, number, number] | null {
  if (!v || typeof v !== "object") return null;
  const rec = v as Record<string, unknown>;
  const x = finite(rec.x);
  const y = finite(rec.y);
  const z = finite(rec.z);
  return x !== undefined && y !== undefined && z !== undefined ? [x, y, z] : null;
}

function vec3FromUnknown(v: unknown): [number, number, number] | null {
  if (Array.isArray(v)) return num3(v, [NaN, NaN, NaN]).every(Number.isFinite) ? num3(v, [0, 0, 0]) : null;
  return vec3FromObject(v);
}

function getBoundsMinMax(raw: RawAnalysisPanel): { min: [number, number, number]; max: [number, number, number] } | null {
  const bounds = raw.bounds;
  if (bounds && typeof bounds === "object") {
    const rec = bounds as Record<string, unknown>;
    const min = vec3FromUnknown(rec.min);
    const max = vec3FromUnknown(rec.max);
    if (min && max) return { min, max };
  }
  const min = vec3FromUnknown(raw.min);
  const max = vec3FromUnknown(raw.max);
  return min && max ? { min, max } : null;
}

function extractRawSize(raw: RawAnalysisPanel): [number, number, number] | null {
  const size = vec3FromUnknown(raw.size);
  if (size) return size;
  const w = finite(raw.w) ?? finite(raw.width);
  const h = finite(raw.h) ?? finite(raw.height);
  const d = finite(raw.d) ?? finite(raw.depth);
  if (w !== undefined && h !== undefined && d !== undefined) return [w, h, d];
  const bounds = getBoundsMinMax(raw);
  if (bounds) {
    return [
      Math.abs(bounds.max[0] - bounds.min[0]),
      Math.abs(bounds.max[1] - bounds.min[1]),
      Math.abs(bounds.max[2] - bounds.min[2]),
    ];
  }
  return null;
}

function extractRawPosition(raw: RawAnalysisPanel, size?: [number, number, number] | null): [number, number, number] | null {
  const position = vec3FromUnknown(raw.position);
  if (position) return position;
  const x = finite(raw.x);
  const y = finite(raw.y);
  const z = finite(raw.z);
  if (x !== undefined && y !== undefined && z !== undefined) return [x, y, z];
  const offset = vec3FromUnknown(raw.offset);
  if (offset) return offset;
  const bounds = getBoundsMinMax(raw);
  if (bounds) {
    return [
      (bounds.min[0] + bounds.max[0]) / 2,
      (bounds.min[1] + bounds.max[1]) / 2,
      (bounds.min[2] + bounds.max[2]) / 2,
    ];
  }
  if (position && size) {
    return [position[0] + size[0] / 2, position[1] + size[1] / 2, position[2] + size[2] / 2];
  }
  return null;
}

function getPositionSource(raw: RawAnalysisPanel): PositionSource {
  if (vec3FromUnknown(raw.position)) return "position";
  if (finite(raw.x) !== undefined && finite(raw.y) !== undefined && finite(raw.z) !== undefined) return "xyz";
  if (vec3FromUnknown(raw.offset)) return "offset";
  if (getBoundsMinMax(raw)) return "bounds";
  return "fallback";
}

function bucketPosition(position: [number, number, number]): string {
  return position.map((v) => Math.round(v / 0.025)).join("|");
}

function shouldInferCollapsedLayout(panels: PanelData[]): boolean {
  if (panels.length < 4) return false;
  const buckets = new Map<string, number>();
  for (const panel of panels) {
    const key = bucketPosition(panel.position);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const uniqueCount = buckets.size;
  const largestBucket = Math.max(...buckets.values());
  return uniqueCount <= Math.max(2, Math.ceil(panels.length / 3)) || largestBucket >= Math.ceil(panels.length * 0.5);
}

function estimatedDimsToMeters(
  dims: FurnitureAnalysis["estimatedDims"] | undefined,
  panels: PanelData[],
): { w: number; h: number; d: number } {
  if (dims) {
    const max = Math.max(Math.abs(dims.w), Math.abs(dims.h), Math.abs(dims.d));
    const scale = max > 20 ? 0.001 : 1;
    return {
      w: Math.max(dims.w * scale, 0.25),
      h: Math.max(dims.h * scale, 0.25),
      d: Math.max(dims.d * scale, 0.25),
    };
  }
  return {
    w: Math.max(...panels.map((p) => p.size[0]), 0.6),
    h: Math.max(...panels.map((p) => p.size[1]), 0.6),
    d: Math.max(...panels.map((p) => p.size[2]), 0.6),
  };
}

function inferPositionFromLabel(
  label: string,
  size: [number, number, number],
  furnitureDims: { w: number; h: number; d: number },
  index: number,
  count: number,
): [number, number, number] {
  const l = label.toLowerCase();
  const [pw, ph, pd] = size;
  const frontZ = furnitureDims.d / 2 - pd / 2 - 0.02;
  const backZ = -furnitureDims.d / 2 + pd / 2 + 0.02;
  const leftX = -furnitureDims.w / 2 + pw / 2 + 0.02;
  const rightX = furnitureDims.w / 2 - pw / 2 - 0.02;

  if (/leg|foot|feet|caster|wheel/.test(l)) {
    const corners: [number, number][] = [
      [leftX, backZ],
      [rightX, backZ],
      [leftX, frontZ],
      [rightX, frontZ],
    ];
    const corner = corners[index % corners.length];
    const x = /left/.test(l) ? leftX : /right/.test(l) ? rightX : corner[0];
    const z = /front/.test(l) ? frontZ : /back/.test(l) ? backZ : corner[1];
    return [x, ph / 2, z];
  }
  if (/gas\s*lift|lift|column|pedestal|center\s*post|center\s*column/.test(l)) {
    return [0, Math.max(furnitureDims.h * 0.28, ph / 2), 0];
  }
  if (/star\s*base|x[\s_-]*base|base/.test(l) && !/back|frame|arm/.test(l)) {
    return [0, Math.max(ph / 2, 0.05), 0];
  }
  if ((/seat|cushion/.test(l) && !/back/.test(l)) || /mattress/.test(l)) {
    const spread = count > 1 ? ((index / Math.max(count - 1, 1)) - 0.5) * (furnitureDims.w * 0.4) : 0;
    return [spread, Math.max(furnitureDims.h * 0.45, ph / 2), 0];
  }
  if (/back|backrest/.test(l)) {
    const spread = count > 1 ? ((index / Math.max(count - 1, 1)) - 0.5) * (furnitureDims.w * 0.35) : 0;
    return [spread, Math.max(furnitureDims.h * 0.72, ph / 2), -furnitureDims.d * 0.35];
  }
  if (/armrest|arm/.test(l)) {
    const x = /left/.test(l) || index % 2 === 0 ? leftX : rightX;
    return [x, Math.max(furnitureDims.h * 0.55, ph / 2), -furnitureDims.d * 0.08];
  }
  if (/head/.test(l)) {
    return [0, Math.max(furnitureDims.h * 0.92, ph / 2), -furnitureDims.d * 0.3];
  }
  if (/frame|rail|base|support|column|pedestal|post|stretcher/.test(l)) {
    const x = /left/.test(l) ? leftX : /right/.test(l) ? rightX : 0;
    const z = /front/.test(l) ? frontZ * 0.5 : /back/.test(l) ? backZ * 0.5 : 0;
    return [x, Math.max(furnitureDims.h * 0.35, ph / 2), z];
  }
  return [0, Math.max(ph / 2, 0.05), 0];
}

function spreadRadially(
  count: number,
  radiusX: number,
  radiusZ: number,
  startAngle: number = -Math.PI / 2,
): [number, number][] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + (i * Math.PI * 2) / count;
    return [Math.cos(angle) * radiusX, Math.sin(angle) * radiusZ];
  });
}

type LayoutStrategy = {
  repairGeometry?: (
    panels: PanelData[],
    dims: { w: number; h: number; d: number },
    name: string,
    nextId: () => string,
  ) => PanelData[];
  completeStructure?: (
    panels: PanelData[],
    dims: { w: number; h: number; d: number },
    name: string,
    nextId: () => string,
  ) => PanelData[];
  postValidate?: (
    panels: PanelData[],
    dims: { w: number; h: number; d: number },
    name: string,
  ) => PanelData[];
};

function getLayoutStrategy(category: FurnitureCategory): LayoutStrategy {
  switch (category) {
    case "seating":
      return {
        repairGeometry: (panels, _dims, name, nextId) => repairSeatingGeometry(panels, name, nextId),
      };
    case "office_chair":
      return {
        repairGeometry: (panels) => repairOfficeChairLayout(panels, "office_chair"),
        completeStructure: (panels, _dims, name, nextId) => repairOfficeChairBase(panels, name, nextId),
      };
    case "bed":
      return {
        repairGeometry: (panels) => repairBedLayout(panels, "bed"),
      };
    case "table_desk":
      return {
        repairGeometry: (panels, dims) => repairTableDeskLayout(panels, dims),
      };
    case "casegoods":
      return {
        repairGeometry: (panels, dims) => repairCasegoodsLayout(panels, dims),
      };
    case "wardrobe":
      return {
        repairGeometry: (panels, dims) => repairWardrobeLayout(panels, dims),
      };
    case "shelving":
      return {
        repairGeometry: (panels, dims) => repairShelvingLayout(panels, dims),
        postValidate: (panels, _dims, name) => {
          const result = [...panels];
          repairBookcaseShelfSpacing(result, name);
          return result;
        },
      };
    default:
      return {};
  }
}

function repairOfficeChairLayout(
  panels: PanelData[],
  name: string,
): PanelData[] {
  if (!/\b(office|task|desk|executive|swivel|ergonomic|gaming)\b/i.test(name) && !/\boffice_chair\b/i.test(name)) {
    return panels;
  }

  const result = [...panels];
  const byLabel = (re: RegExp) => result.filter((p) => re.test(p.label));
  const seats = byLabel(/\bseat\b/i);
  const backs = byLabel(/\bback(rest)?\b/i);
  const heads = byLabel(/\bhead(rest)?\b/i);
  const armPads = byLabel(/\barm(rest)?|arm\s*pad\b/i);
  const armSupports = byLabel(/\barm\s*support|support\s*arm|arm\s*frame\b/i);
  const casters = byLabel(/\bcaster|wheel\b/i);
  const legs = byLabel(/\bleg\b/i).filter((p) => !/arm|back/.test(p.label));
  const starBases = result.filter((p) => /star.*base|x[\s._-]*base|base.*star/i.test(p.label) || (p.shape ?? "box") === "x_base");
  const liftColumns = result.filter((p) => /gas\s*lift|lift.*column|center\s*post|pedestal|column/i.test(p.label));

  const seat = seats.sort((a, b) => b.size[0] * b.size[2] - a.size[0] * a.size[2])[0];
  const seatY = seat ? Math.max(seat.position[1], 0.42) : 0.45;
  const seatZ = 0;
  const seatX = 0;
  if (seat) {
    seat.position = [seatX, seatY, seatZ];
  }

  const seatBackZ = seat ? seat.position[2] - seat.size[2] / 2 : -0.12;
  const seatTopY = seat ? seat.position[1] + seat.size[1] / 2 : seatY + 0.08;
  const chairHalfWidth = seat ? Math.max(seat.size[0] / 2, 0.26) : 0.28;

  backs.forEach((back) => {
    const targetY = Math.max(seatTopY + back.size[1] / 2 - Math.min(back.size[1] * 0.25, 0.16), back.position[1]);
    const targetZ = Math.min(seatBackZ - back.size[2] / 2 + 0.03, -0.12);
    back.position = [0, targetY, targetZ];
  });

  heads.forEach((head) => {
    const back = backs[0];
    const baseY = back ? back.position[1] + back.size[1] / 2 : seatTopY + 0.35;
    const baseZ = back ? back.position[2] - Math.min(back.size[2] * 0.2, 0.05) : -0.18;
    head.position = [0, baseY + head.size[1] / 2 - 0.05, baseZ];
  });

  armPads.forEach((arm, index) => {
    const x = /left/i.test(arm.label) || (!/right/i.test(arm.label) && index % 2 === 0)
      ? -chairHalfWidth + arm.size[0] / 2
      : chairHalfWidth - arm.size[0] / 2;
    arm.position = [x, Math.max(seatY + seat.size[1] * 0.45, 0.58), -0.04];
  });

  armSupports.forEach((support, index) => {
    const x = /left/i.test(support.label) || (!/right/i.test(support.label) && index % 2 === 0)
      ? -chairHalfWidth + support.size[0] / 2
      : chairHalfWidth - support.size[0] / 2;
    support.position = [x, Math.max(seatY * 0.78, support.size[1] / 2 + 0.2), -0.02];
  });

  const wheelParts = casters.length > 0 ? casters : legs;
  const wheelRadiusX = Math.max(chairHalfWidth * 0.95, 0.22);
  const wheelRadiusZ = Math.max((seat?.size[2] ?? 0.5) * 0.48, 0.22);
  const radialPositions = spreadRadially(wheelParts.length, wheelRadiusX, wheelRadiusZ);
  wheelParts.forEach((part, index) => {
    const [x, z] = radialPositions[index] ?? [0, 0];
    part.position = [x, Math.max(part.size[1] / 2, 0.03), z];
  });

  starBases.forEach((base) => {
    base.position = [0, Math.max(base.size[1] / 2, 0.07), 0];
    base.size = [Math.max(base.size[0], wheelRadiusX * 2), base.size[1], Math.max(base.size[2], wheelRadiusZ * 2)];
  });

  liftColumns.forEach((lift) => {
    const bottomY = starBases[0]
      ? starBases[0].position[1] + starBases[0].size[1] / 2
      : 0.08;
    const topY = seat ? seat.position[1] - seat.size[1] / 2 : 0.32;
    const liftH = Math.max(0.14, topY - bottomY);
    lift.position = [0, bottomY + liftH / 2, 0];
    lift.size = [Math.min(lift.size[0], 0.08), liftH, Math.min(lift.size[2], 0.08)];
  });

  return result;
}

function repairBedLayout(
  panels: PanelData[],
  name: string,
): PanelData[] {
  if (!/\b(bed|bedframe|bed_frame|platform bed|platform_bed|headboard|footboard)\b/i.test(name)) {
    return panels;
  }

  const result = [...panels];
  const byLabel = (re: RegExp) => result.filter((p) => re.test(p.label));
  const mattresses = result.filter((p) => /\bmattress\b/i.test(p.label) || (p.shape ?? "box") === "mattress");
  const headboards = result.filter((p) => /\bheadboard|head board|head\b/i.test(p.label) && !/\bleg\b/i.test(p.label));
  const footboards = result.filter((p) => /\bfootboard|foot board|foot rail\b/i.test(p.label));
  const sideRails = result.filter((p) => /\bside rail|bed side|left rail|right rail|side frame|bed rail\b/i.test(p.label));
  const baseFrames = result.filter((p) => /\bbase frame|bed base|platform|foundation|support deck|frame\b/i.test(p.label) && !/\bhead|foot|rail|leg\b/i.test(p.label));
  const slats = byLabel(/\bslat\b/i);
  const legs = byLabel(/\bleg\b/i).filter((p) => !/head|arm|back/i.test(p.label));

  const primaryBase =
    mattresses.sort((a, b) => b.size[0] * b.size[2] - a.size[0] * a.size[2])[0] ??
    baseFrames.sort((a, b) => b.size[0] * b.size[2] - a.size[0] * a.size[2])[0];

  const bedWidth = primaryBase ? Math.max(primaryBase.size[0], 0.9) : Math.max(...result.map((p) => p.size[0]), 0.9);
  const bedDepth = primaryBase ? Math.max(primaryBase.size[2], 1.8) : Math.max(...result.map((p) => p.size[2]), 1.8);
  const deckTopY = primaryBase
    ? Math.max(primaryBase.position[1], 0.22)
    : 0.24;
  const deckThickness = primaryBase
    ? Math.min(primaryBase.size[1], 0.18)
    : 0.08;
  const deckCenterY = Math.max(deckTopY, deckThickness / 2 + 0.12);
  const leftX = -bedWidth / 2;
  const rightX = bedWidth / 2;
  const headZ = -bedDepth / 2;
  const footZ = bedDepth / 2;

  if (primaryBase) {
    primaryBase.position = [0, deckCenterY, 0];
    primaryBase.size = [bedWidth, deckThickness, bedDepth];
  }

  mattresses.forEach((mattress) => {
    const thickness = Math.min(Math.max(mattress.size[1], 0.12), 0.28);
    mattress.position = [0, deckCenterY + deckThickness / 2 + thickness / 2 - 0.01, 0];
    mattress.size = [Math.min(Math.max(mattress.size[0], bedWidth * 0.94), bedWidth * 0.98), thickness, Math.min(Math.max(mattress.size[2], bedDepth * 0.94), bedDepth * 0.98)];
  });

  headboards.forEach((headboard) => {
    const depth = Math.min(Math.max(Math.min(headboard.size[0], headboard.size[2]), 0.03), 0.09);
    const width = Math.max(headboard.size[0], bedWidth);
    const height = Math.max(headboard.size[1], 0.6);
    headboard.position = [0, Math.max(deckCenterY + height / 2 - 0.05, height / 2), headZ - depth / 2 + 0.01];
    headboard.size = [width, height, depth];
  });

  footboards.forEach((footboard) => {
    const depth = Math.min(Math.max(Math.min(footboard.size[0], footboard.size[2]), 0.025), 0.08);
    const width = Math.max(footboard.size[0], bedWidth * 0.9);
    const height = Math.min(Math.max(footboard.size[1], 0.2), 0.55);
    footboard.position = [0, Math.max(deckCenterY + height / 2 - 0.12, height / 2), footZ + depth / 2 - 0.01];
    footboard.size = [width, height, depth];
  });

  sideRails.forEach((rail, index) => {
    const isLeft = /left/i.test(rail.label) || (!/right/i.test(rail.label) && index % 2 === 0);
    const x = isLeft ? leftX + rail.size[0] / 2 : rightX - rail.size[0] / 2;
    const height = Math.min(Math.max(rail.size[1], 0.12), 0.28);
    const depth = Math.max(rail.size[2], bedDepth * 0.92);
    rail.position = [x, Math.max(deckCenterY, height / 2 + 0.12), 0];
    rail.size = [Math.min(Math.max(rail.size[0], 0.025), 0.08), height, depth];
  });

  slats.forEach((slat) => {
    const height = Math.min(Math.max(slat.size[1], 0.012), 0.04);
    slat.position = [0, deckCenterY + deckThickness / 2 - height / 2 - 0.005, 0];
    slat.size = [Math.min(Math.max(slat.size[0], bedWidth * 0.9), bedWidth * 0.96), height, Math.min(Math.max(slat.size[2], bedDepth * 0.88), bedDepth * 0.94)];
  });

  const legPositions: [number, number][] = [
    [leftX + 0.05, headZ + 0.08],
    [rightX - 0.05, headZ + 0.08],
    [leftX + 0.05, footZ - 0.08],
    [rightX - 0.05, footZ - 0.08],
  ];
  legs.forEach((leg, index) => {
    const [x, z] = legPositions[index % legPositions.length] ?? [0, 0];
    const height = Math.min(Math.max(leg.size[1], 0.12), 0.32);
    const thickness = Math.min(Math.max(Math.max(leg.size[0], leg.size[2]), 0.025), 0.08);
    leg.position = [x, height / 2, z];
    leg.size = [thickness, height, thickness];
  });

  return result;
}

function debugPositions(stage: string, panels: Array<RawAnalysisPanel | PanelData>): void {
  const metaEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
  if (!metaEnv?.DEV) return;
  const rows = panels.map((panel, index) => {
    const raw = panel as RawAnalysisPanel;
    const cooked = panel as PanelData;
    const size =
      "id" in cooked
        ? cooked.size
        : extractRawSize(raw);
    const position =
      "id" in cooked
        ? cooked.position
        : extractRawPosition(raw, extractRawSize(raw)) ?? null;
    const shape =
      "id" in cooked
        ? (cooked.shape ?? "box")
        : (typeof raw.shape === "string" ? raw.shape : "box");
    const type =
      "id" in cooked
        ? cooked.type
        : normalizeType(raw.type);
    return {
      i: index,
      label: typeof raw.label === "string" ? raw.label : cooked.label,
      type,
      shape,
      position,
      size,
      source: "id" in cooked ? "panel" : getPositionSource(raw),
    };
  });
  console.log(`[furnitureImageAnalysis] ${stage}`, rows);
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

const UPHOLSTERED_BACK_PLAN_SHAPES = /^(box|cushion|cushion_firm|padded_block)$/;

/**
 * Vision models often emit sofa back cushions with width/depth swapped (thin edge faces the room)
 * or add rotation.y ≈ ±π/2 to compensate. Editor convention: wide span on X, thin depth on Z.
 */
function normalizeUpholsteredBackPlanAxes(panel: PanelData): PanelData {
  if (panel.type !== "vertical") return panel;
  if (!UPHOLSTERY_MAT_RE.test(panel.materialId)) return panel;
  const shape = panel.shape ?? "box";
  if (!UPHOLSTERED_BACK_PLAN_SHAPES.test(shape)) return panel;

  const L = panel.label;
  if (/\b(arm|armrest|arm\s*pad|leg|feet|foot|throw)\b/i.test(L)) return panel;
  const seatOnly = /\bseat\b/i.test(L) && !/\b(back|backrest)\b/i.test(L);
  if (seatOnly) return panel;

  const isBackLabel =
    /\b(back|backrest|headrest|bolster)\b/i.test(L) ||
    /\bback\s*cushion\b/i.test(L) ||
    (/\bcushion\b/i.test(L) && /\bback\b/i.test(L));

  let [w, h, d] = panel.size;
  const upright = h >= Math.max(w, d) * 0.55;
  if (!upright) return panel;

  const geomBackLike =
    h >= Math.max(w, d) * 0.65 &&
    Math.min(w, d) >= 0.04 &&
    Math.max(w, d) >= 0.18 &&
    Math.min(w, d) <= 0.38;
  const planLooksSwapped = d > w * 1.12 && w <= 0.32 && d >= 0.18;

  if (!isBackLabel && !(geomBackLike && planLooksSwapped)) return panel;

  const rot = panel.rotation;
  const nearHalfPiY =
    rot &&
    Math.abs(rot[0]) < 0.35 &&
    Math.abs(rot[2]) < 0.35 &&
    Math.abs(Math.abs(rot[1]) - Math.PI / 2) < 0.35;

  if (planLooksSwapped) {
    const next: PanelData = { ...panel, size: [d, h, w] };
    if (nearHalfPiY) next.rotation = [0, 0, 0];
    return next;
  }

  if (w >= d * 1.05 && d <= 0.34 && nearHalfPiY) {
    return { ...panel, rotation: [0, 0, 0] };
  }

  return panel;
}

function normalizeImportedUpholsteryThickness(panel: PanelData): PanelData {
  const shape = panel.shape ?? "box";
  const upholsteryShape = /^(rounded_rect|cushion|cushion_firm|padded_block|mattress)$/.test(shape);
  const upholsteryMaterial = UPHOLSTERY_MAT_RE.test(panel.materialId);
  const cushionLike = isCushionLikeLabel(panel.label);
  if (!upholsteryShape && !upholsteryMaterial && !cushionLike) return panel;

  let [w, h, d] = panel.size;
  const plan = Math.max(w, d);
  const isArm = /\b(arm|armrest|arm\s*pad)\b/i.test(panel.label);
  const isBackLike = /\b(back|backrest|headrest|rest|pillow|bolster)\b/i.test(panel.label) && !/\bseat\b/i.test(panel.label);

  if (panel.type === "horizontal") {
    const maxThickness = isArm
      ? Math.min(Math.max(plan * 0.22, 0.05), 0.14)
      : Math.min(Math.max(plan * 0.18, 0.045), 0.12);
    if (h > maxThickness) {
      h = maxThickness;
    }
    return { ...panel, size: [w, h, d] };
  }

  if (panel.type === "vertical" || panel.type === "back" || isBackLike) {
    const thinAxis = w <= d ? "w" : "d";
    const thickness = Math.min(w, d);
    const span = Math.max(w, h, d);
    const maxThickness = isArm
      ? Math.min(Math.max(span * 0.16, 0.04), 0.11)
      : Math.min(Math.max(span * 0.12, 0.035), 0.09);
    if (thickness > maxThickness) {
      if (thinAxis === "w") w = maxThickness;
      else d = maxThickness;
    }
    return { ...panel, size: [w, h, d] };
  }

  return panel;
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
      p.size[0] < 0.35 &&
      !/\bleg\b/i.test(p.label),
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
function repairCollapsedLayout(
  panels: PanelData[],
  furnitureName: string,
  category: FurnitureCategory,
): void {
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
  const roles = new Map(panels.map((panel) => [panel.id, classifyPanelRole(panel, category)]));
  const seatLikes = panels.filter((panel) => {
    const role = roles.get(panel.id);
    return role === "seat" || role === "mattress" || role === "top";
  });
  const backLikes = panels.filter((panel) => {
    const role = roles.get(panel.id);
    return role === "back" || role === "back_panel" || role === "headboard";
  });
  const legLikes = panels.filter((panel) => roles.get(panel.id) === "leg");
  const sideLikes = panels.filter((panel) => {
    const role = roles.get(panel.id);
    return role === "side" || role === "arm" || role === "front" || role === "drawer" || role === "door";
  });
  const centerColumns = panels.filter((panel) => roles.get(panel.id) === "column");

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
function validateAndRepairGeometry(
  panels: PanelData[],
  furnitureName: string,
  category: FurnitureCategory,
): PanelData[] {
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
    // Tables: corner legs must stay on footprint — never fan them along Z (breaks attachment to top).
    if (category === "table_desk" && /\bleg\b/i.test(p.label) && !/arm|back/i.test(p.label)) continue;
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

  // === Fix: Ensure table/desk legs touch floor (label or classified role) ===
  for (const p of result) {
    const role = category === "table_desk" ? classifyPanelRole(p, "table_desk") : null;
    const isLegPart =
      (/\bleg\b/i.test(p.label) && !/(arm|back)/i.test(p.label)) ||
      (category === "table_desk" && role === "leg");
    if (!isLegPart) continue;
    const legH = p.size[1];
    const expectedY = legH / 2;
    if (Math.abs(p.position[1] - expectedY) > 0.05) {
      p.position = [p.position[0], expectedY, p.position[2]];
    }
  }

  repairCollapsedLayout(result, furnitureName, category);
  nudgeCoplanarVerticalPanels(result);

  return result;
}

export function panelsFromFurnitureAnalysis(
  analysis: FurnitureAnalysis,
  nextId: () => string
): PanelData[] {
  const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;

  // Step 0: Normalize raw dimensions FIRST (detect mm/cm/m → convert to meters)
  // Must happen before normalizeAnalysisPanel which clamps sizes to 10m
  const rawPanels = (analysis.panels ?? []) as unknown as RawAnalysisPanel[];
  const rawNormalized = normalizeRawPanelDimensions(rawPanels);
  debugPositions("after normalizeRawPanelDimensions", rawNormalized);

  // Step 1: Parse raw panels into PanelData (shapes, materials, labels)
  let panels = rawNormalized.map((p) => normalizeAnalysisPanel(p, nextId()));
  debugPositions("after normalizeAnalysisPanel", panels);

  const category = detectFurnitureCategory(analysis.name ?? "", panels);
  const furnitureDims = estimatedDimsToMeters(analysis.estimatedDims, panels);

  if (isDev) {
    console.log("[panelsFromFurnitureAnalysis] category:", category, "furnitureDims:", furnitureDims);
  }

  // Step 2: Normalize shapes/axes (existing helpers — generic)
  panels = panels.map(normalizeVerticalBoxHeightAxis);
  panels = panels.map(normalizeVerticalAxisymmetricPanel);
  panels = panels.map(clampRealisticThickness);
  panels = panels.map(sanitizeImportRotation);
  panels = panels.map(stabilizeStructuralRotation);
  panels = panels.map(fixHorizontalRoundDisk);
  debugPositions("after shape normalization", panels);

  // Step 3: Position inference — only when AI positions are unreliable
  const positionSources = rawNormalized.map(getPositionSource);
  const fallbackMask = positionSources.map((source) => source === "fallback");
  const fallbackCount = fallbackMask.filter(Boolean).length;
  const collapsedAfterNormalize = shouldInferCollapsedLayout(panels);

  if (isDev) {
    console.log("[panelsFromFurnitureAnalysis] positionSources:", positionSources, "fallbacks:", fallbackCount, "collapsed:", collapsedAfterNormalize);
  }

  if (fallbackCount > 0 || collapsedAfterNormalize) {
    const inferred = inferPositionsFromCategory(
      panels,
      category,
      furnitureDims,
      collapsedAfterNormalize ? undefined : fallbackMask,
    );
    panels = inferred;
    debugPositions("after inferPositionsFromCategory", panels);
  }

  // Step 4: Category-specific geometry repairs (existing pipeline — tuned per type)
  const refined = refineSeatingImportPanels(panels, analysis.name ?? "");
  const backPlanFixed = refined.map(normalizeUpholsteredBackPlanAxes);
  const tightenedUpholstery = backPlanFixed.map(normalizeImportedUpholsteryThickness);
  const strategy = getLayoutStrategy(category);
  const repaired = strategy.repairGeometry
    ? strategy.repairGeometry(tightenedUpholstery, furnitureDims, analysis.name ?? "", nextId)
    : tightenedUpholstery;
  const completed = strategy.completeStructure
    ? strategy.completeStructure(repaired, furnitureDims, analysis.name ?? "", nextId)
    : repaired;
  const validated = validateAndRepairGeometry(completed, analysis.name ?? "", category);
  const postValidated = strategy.postValidate
    ? strategy.postValidate(validated, furnitureDims, analysis.name ?? "")
    : validated;
  debugPositions("final output", postValidated);
  return postValidated;
}
