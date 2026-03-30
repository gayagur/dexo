/**
 * Furniture Template Library — family/variant system for template matching.
 *
 * Instead of generating geometry from AI, we classify the uploaded image
 * and match it to the closest template family + variant here.
 * Templates produce the same high-quality panels as our curated library.
 */

import type { PanelData, PanelShape } from "./furnitureData";

// ─── Types ──────────────────────────────────────────────

export interface FurnitureClassification {
  category: string;       // "sofa" | "chair" | "table" | "bed" | "cabinet" | "shelf"
  subtype: string;        // "3_seat" | "loveseat" | "l_sectional" | "armchair" | etc.
  style: string;          // "modern" | "scandinavian" | "classic" | "industrial"
  armStyle: string;       // "rounded" | "square" | "thin" | "none"
  backStyle: string;      // "loose_back" | "tight_back" | "tufted" | "open"
  baseStyle: string;      // "legs" | "recessed" | "pedestal" | "sled"
  material: string;       // materialId from our palette
  dominantColor: string;  // hex color
  seatCount?: number;     // for sofas
}

export interface TemplateFamily {
  id: string;
  category: string;
  subtypes: string[];
  styles: string[];
  description: string;
  buildPanels: (opts: TemplateBuildOpts) => PanelData[];
}

export interface TemplateBuildOpts {
  w: number;  // width in meters
  h: number;  // height in meters
  d: number;  // depth in meters
  material: string;
  seatCount: number;
  armStyle: string;
  backStyle: string;
  baseStyle: string;
}

// ─── Helpers ──────────────────────────────────────────────

let _pid = 8000;
function pid(): string { return `tmpl-${++_pid}`; }

function cushion(label: string, type: PanelData["type"], pos: [number, number, number], size: [number, number, number], mat: string, rotation?: [number, number, number]): PanelData {
  return { id: pid(), type, shape: "cushion" as PanelShape, label, position: pos, size, materialId: mat, ...(rotation ? { rotation } : {}) };
}
function firmCushion(label: string, type: PanelData["type"], pos: [number, number, number], size: [number, number, number], mat: string): PanelData {
  return { id: pid(), type, shape: "cushion_firm" as PanelShape, label, position: pos, size, materialId: mat };
}
function padded(label: string, type: PanelData["type"], pos: [number, number, number], size: [number, number, number], mat: string, rotation?: [number, number, number]): PanelData {
  return { id: pid(), type, shape: "padded_block" as PanelShape, label, position: pos, size, materialId: mat, ...(rotation ? { rotation } : {}) };
}
function box(label: string, type: PanelData["type"], pos: [number, number, number], size: [number, number, number], mat: string): PanelData {
  return { id: pid(), type, label, position: pos, size, materialId: mat };
}
function cyl(label: string, pos: [number, number, number], diameter: number, height: number, mat = "black_metal"): PanelData {
  return { id: pid(), type: "vertical", shape: "cylinder" as PanelShape, label, position: pos, size: [diameter, height, diameter], materialId: mat };
}
function roundedRect(label: string, type: PanelData["type"], pos: [number, number, number], size: [number, number, number], mat: string, cr = 0.02): PanelData {
  return { id: pid(), type, shape: "rounded_rect" as PanelShape, label, position: pos, size, materialId: mat, shapeParams: { cornerRadius: cr } };
}

// ─── Sofa Builder (parametric) ───────────────────────────

function buildSofa(opts: TemplateBuildOpts): PanelData[] {
  _pid = 8000;
  const { w, h, d, material: mat, seatCount, armStyle, baseStyle } = opts;
  const panels: PanelData[] = [];

  const legH = baseStyle === "recessed" ? 0.03 : 0.07;
  const baseH = 0.15;
  const baseTop = legH + baseH;
  const armW = armStyle === "thin" ? 0.08 : armStyle === "none" ? 0 : 0.16;
  const armH = armStyle === "none" ? 0 : 0.38;
  const backFrameT = 0.13;
  const backFrameH = 0.40;
  const cushT = 0.14;
  const seatD = 0.60;
  const seatTopY = baseTop + cushT;
  const innerW = w - armW * 2;
  const cushW = innerW / seatCount - 0.008;
  const seatY = baseTop + cushT / 2;
  const seatZ = d / 2 - seatD / 2 - 0.02;
  const backCushH = 0.40;
  const backCushT = 0.20;
  const backY = seatTopY + backCushH / 2 + 0.02;
  const backZ = -d / 2 + backFrameT / 2 + backCushT / 2 + 0.02;
  const backTilt: [number, number, number] = [-0.15, 0, 0];

  // Base frame (hidden, same material as sofa)
  panels.push(roundedRect("Base", "horizontal", [0, legH + baseH / 2, 0], [innerW, baseH, d - 0.04], mat, 0.005));

  // Back rest
  panels.push(padded("Back rest", "vertical",
    [0, baseTop + backFrameH / 2, -d / 2 + backFrameT / 2],
    [innerW, backFrameH, backFrameT], mat, [-0.09, 0, 0]));

  // Arms
  if (armW > 0) {
    panels.push(padded("Left Arm", "vertical", [-w / 2 + armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat));
    panels.push(padded("Right Arm", "vertical", [w / 2 - armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat));
  }

  // Seat cushions
  const gap = 0.006;
  for (let i = 0; i < seatCount; i++) {
    const x = -innerW / 2 + cushW / 2 + i * (cushW + gap) + gap * seatCount / 2;
    panels.push(firmCushion(`Seat ${i + 1}`, "horizontal", [x, seatY, seatZ], [cushW, cushT, seatD], mat));
  }

  // Back cushions
  for (let i = 0; i < seatCount; i++) {
    const x = -innerW / 2 + cushW / 2 + i * (cushW + gap) + gap * seatCount / 2;
    panels.push(cushion(`Back ${i + 1}`, "vertical", [x, backY, backZ], [cushW - 0.02, backCushH, backCushT], mat, backTilt));
  }

  // Legs
  if (baseStyle !== "recessed") {
    const legMat = "oak";
    panels.push(cyl("Leg FL", [-w / 2 + 0.10, legH / 2, d / 2 - 0.10], 0.035, legH, legMat));
    panels.push(cyl("Leg FR", [w / 2 - 0.10, legH / 2, d / 2 - 0.10], 0.035, legH, legMat));
    panels.push(cyl("Leg BL", [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], 0.035, legH, legMat));
    panels.push(cyl("Leg BR", [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], 0.035, legH, legMat));
  }

  // Throw pillows (2 at ends)
  panels.push(cushion("Pillow L", "vertical",
    [-innerW / 3, seatTopY + 0.18, seatZ - 0.08],
    [0.40, 0.40, 0.13], "fabric_taupe", [-0.35, 0.12, 0]));
  panels.push(cushion("Pillow R", "vertical",
    [innerW / 3, seatTopY + 0.18, seatZ - 0.08],
    [0.40, 0.40, 0.13], "fabric_taupe", [-0.35, -0.10, 0]));

  return panels;
}

// ─── Armchair Builder ────────────────────────────────────

function buildArmchair(opts: TemplateBuildOpts): PanelData[] {
  return buildSofa({ ...opts, w: opts.w || 0.85, d: opts.d || 0.85, seatCount: 1 });
}

// ─── Table Builder ───────────────────────────────────────

function buildTable(opts: TemplateBuildOpts): PanelData[] {
  _pid = 8000;
  const { w, h, d, material: mat } = opts;
  const panels: PanelData[] = [];
  const topT = 0.04;
  const legH = h - topT;

  panels.push(roundedRect("Top", "horizontal", [0, h - topT / 2, 0], [w, topT, d], mat, 0.01));

  const legMat = mat.includes("metal") ? mat : "oak";
  const legD = 0.04;
  panels.push(cyl("Leg FL", [-w / 2 + 0.06, legH / 2, d / 2 - 0.06], legD, legH, legMat));
  panels.push(cyl("Leg FR", [w / 2 - 0.06, legH / 2, d / 2 - 0.06], legD, legH, legMat));
  panels.push(cyl("Leg BL", [-w / 2 + 0.06, legH / 2, -d / 2 + 0.06], legD, legH, legMat));
  panels.push(cyl("Leg BR", [w / 2 - 0.06, legH / 2, -d / 2 + 0.06], legD, legH, legMat));

  return panels;
}

// ─── Bed Builder ─────────────────────────────────────────

function buildBed(opts: TemplateBuildOpts): PanelData[] {
  _pid = 8000;
  const { w, h, d, material: mat } = opts;
  const panels: PanelData[] = [];
  const frameH = 0.30;
  const headH = h - 0.20;
  const footH = 0.40;
  const railH = 0.14;
  const legH = 0.10;
  const mattressH = 0.24;
  const woodMat = mat.includes("fabric") ? "oak" : mat;

  // Headboard
  panels.push(roundedRect("Headboard", "vertical", [0, headH / 2 + legH, -d / 2 + 0.025], [w - 0.04, headH, 0.05], woodMat, 0.01));
  // Footboard
  panels.push(roundedRect("Footboard", "vertical", [0, footH / 2 + legH, d / 2 - 0.025], [w - 0.04, footH, 0.05], woodMat, 0.01));
  // Side rails
  panels.push(box("Left Rail", "horizontal", [-w / 2 + 0.02, legH + railH / 2, 0], [0.04, railH, d - 0.10], woodMat));
  panels.push(box("Right Rail", "horizontal", [w / 2 - 0.02, legH + railH / 2, 0], [0.04, railH, d - 0.10], woodMat));
  // Slats (8)
  const slatCount = 8;
  const slatW = w - 0.10;
  const slatSpacing = (d - 0.14) / (slatCount - 1);
  for (let i = 0; i < slatCount; i++) {
    const z = -d / 2 + 0.07 + i * slatSpacing;
    panels.push(box(`Slat ${i + 1}`, "horizontal", [0, legH + railH - 0.01, z], [slatW, 0.02, 0.08], "plywood"));
  }
  // Mattress
  panels.push({ id: pid(), type: "horizontal", shape: "mattress" as PanelShape, label: "Mattress",
    position: [0, legH + railH + mattressH / 2, 0], size: [w - 0.06, mattressH, d - 0.06], materialId: "fabric_cream" });
  // Legs
  panels.push(cyl("Leg FL", [-w / 2 + 0.05, legH / 2, d / 2 - 0.05], 0.05, legH, woodMat));
  panels.push(cyl("Leg FR", [w / 2 - 0.05, legH / 2, d / 2 - 0.05], 0.05, legH, woodMat));
  panels.push(cyl("Leg BL", [-w / 2 + 0.05, legH / 2, -d / 2 + 0.05], 0.05, legH, woodMat));
  panels.push(cyl("Leg BR", [w / 2 - 0.05, legH / 2, -d / 2 + 0.05], 0.05, legH, woodMat));
  // Pillows
  panels.push(cushion("Pillow L", "horizontal", [-w / 4, legH + railH + mattressH + 0.06, -d / 2 + 0.30], [0.50, 0.12, 0.35], "fabric_cream"));
  panels.push(cushion("Pillow R", "horizontal", [w / 4, legH + railH + mattressH + 0.06, -d / 2 + 0.30], [0.50, 0.12, 0.35], "fabric_cream"));

  return panels;
}

// ─── Cabinet/Dresser Builder ─────────────────────────────

function buildCabinet(opts: TemplateBuildOpts): PanelData[] {
  _pid = 8000;
  const { w, h, d, material: mat } = opts;
  const T = 0.02;
  const panels: PanelData[] = [];

  panels.push(box("Top", "horizontal", [0, h - T / 2, 0], [w, T, d], mat));
  panels.push(box("Bottom", "horizontal", [0, T / 2, 0], [w, T, d], mat));
  panels.push(box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d], mat));
  panels.push(box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d], mat));
  panels.push(box("Back", "back", [0, h / 2, -d / 2 + T / 4], [w - T * 2, h - T * 2, T / 2], mat));

  // 2 shelves
  const shelfH1 = h * 0.35;
  const shelfH2 = h * 0.65;
  panels.push(box("Shelf 1", "horizontal", [0, shelfH1, 0], [w - T * 2, T, d - T], mat));
  panels.push(box("Shelf 2", "horizontal", [0, shelfH2, 0], [w - T * 2, T, d - T], mat));

  return panels;
}

// ─── Bookshelf Builder ───────────────────────────────────

function buildBookshelf(opts: TemplateBuildOpts): PanelData[] {
  _pid = 8000;
  const { w, h, d, material: mat } = opts;
  const T = 0.02;
  const panels: PanelData[] = [];

  panels.push(box("Top", "horizontal", [0, h - T / 2, 0], [w, T, d], mat));
  panels.push(box("Bottom", "horizontal", [0, T / 2, 0], [w, T, d], mat));
  panels.push(box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d], mat));
  panels.push(box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d], mat));
  panels.push(box("Back", "back", [0, h / 2, -d / 2 + T / 4], [w - T * 2, h - T * 2, T / 2], mat));

  const shelfCount = Math.max(2, Math.round(h / 0.30));
  for (let i = 1; i < shelfCount; i++) {
    const y = (h / shelfCount) * i;
    panels.push(box(`Shelf ${i}`, "horizontal", [0, y, 0], [w - T * 2, T, d - T], mat));
  }

  return panels;
}

// ─── Template Families ───────────────────────────────────

export const TEMPLATE_FAMILIES: TemplateFamily[] = [
  // ── Seating ──
  {
    id: "sofa_modern",
    category: "sofa",
    subtypes: ["2_seat", "3_seat", "loveseat", "sofa"],
    styles: ["modern", "scandinavian", "contemporary", "minimalist"],
    description: "Modern soft sofa with padded arms and firm seat cushions",
    buildPanels: (opts) => buildSofa(opts),
  },
  {
    id: "sofa_classic",
    category: "sofa",
    subtypes: ["2_seat", "3_seat", "loveseat", "sofa", "chesterfield"],
    styles: ["classic", "traditional", "english", "tufted"],
    description: "Classic sofa with rolled arms and button-tufted back",
    buildPanels: (opts) => buildSofa({ ...opts, armStyle: "rounded" }),
  },
  {
    id: "armchair_modern",
    category: "chair",
    subtypes: ["armchair", "accent_chair", "club_chair", "lounge_chair"],
    styles: ["modern", "scandinavian", "mid_century", "contemporary"],
    description: "Modern armchair with single seat cushion",
    buildPanels: (opts) => buildArmchair(opts),
  },
  {
    id: "armchair_classic",
    category: "chair",
    subtypes: ["armchair", "wingback", "club_chair", "bergere"],
    styles: ["classic", "traditional", "english"],
    description: "Classic armchair with wide arms",
    buildPanels: (opts) => buildArmchair({ ...opts, armStyle: "rounded" }),
  },
  // ── Tables ──
  {
    id: "table_dining",
    category: "table",
    subtypes: ["dining_table", "kitchen_table", "farm_table"],
    styles: ["modern", "scandinavian", "classic", "farmhouse", "industrial"],
    description: "Dining table with 4 legs",
    buildPanels: (opts) => buildTable(opts),
  },
  {
    id: "table_coffee",
    category: "table",
    subtypes: ["coffee_table", "cocktail_table", "low_table"],
    styles: ["modern", "scandinavian", "classic", "industrial"],
    description: "Coffee table",
    buildPanels: (opts) => buildTable({ ...opts, h: opts.h || 0.45 }),
  },
  {
    id: "table_side",
    category: "table",
    subtypes: ["side_table", "end_table", "nightstand", "accent_table"],
    styles: ["modern", "scandinavian", "classic"],
    description: "Side/end table",
    buildPanels: (opts) => buildTable({ ...opts, w: opts.w || 0.50, d: opts.d || 0.50 }),
  },
  {
    id: "desk",
    category: "table",
    subtypes: ["desk", "writing_desk", "office_desk", "computer_desk"],
    styles: ["modern", "scandinavian", "industrial", "classic"],
    description: "Desk",
    buildPanels: (opts) => buildTable({ ...opts, h: opts.h || 0.75 }),
  },
  // ── Bedroom ──
  {
    id: "bed_standard",
    category: "bed",
    subtypes: ["bed", "bed_frame", "platform_bed", "standard_bed", "queen_bed", "king_bed", "double_bed", "single_bed"],
    styles: ["modern", "scandinavian", "classic", "industrial", "farmhouse"],
    description: "Bed frame with headboard, slats, and mattress",
    buildPanels: (opts) => buildBed(opts),
  },
  // ── Storage ──
  {
    id: "cabinet",
    category: "cabinet",
    subtypes: ["cabinet", "sideboard", "credenza", "buffet", "tv_unit", "media_console"],
    styles: ["modern", "scandinavian", "classic", "industrial"],
    description: "Storage cabinet with shelves",
    buildPanels: (opts) => buildCabinet(opts),
  },
  {
    id: "bookshelf",
    category: "shelf",
    subtypes: ["bookshelf", "bookcase", "shelving_unit", "display_shelf", "shelf"],
    styles: ["modern", "scandinavian", "classic", "industrial"],
    description: "Open bookshelf with multiple shelves",
    buildPanels: (opts) => buildBookshelf(opts),
  },
  {
    id: "dresser",
    category: "cabinet",
    subtypes: ["dresser", "chest_of_drawers", "tallboy", "wardrobe"],
    styles: ["modern", "scandinavian", "classic"],
    description: "Dresser with drawers",
    buildPanels: (opts) => buildCabinet(opts),
  },
];

// ─── Default Dimensions ──────────────────────────────────

const DEFAULT_DIMS: Record<string, { w: number; h: number; d: number }> = {
  // Seating
  "sofa_2_seat": { w: 1.60, h: 0.85, d: 0.90 },
  "sofa_3_seat": { w: 2.10, h: 0.85, d: 0.90 },
  "sofa_loveseat": { w: 1.40, h: 0.85, d: 0.90 },
  "sofa_default": { w: 2.00, h: 0.85, d: 0.90 },
  "chair_armchair": { w: 0.85, h: 0.85, d: 0.85 },
  "chair_default": { w: 0.80, h: 0.85, d: 0.80 },
  // Tables
  "table_dining_table": { w: 1.40, h: 0.75, d: 0.80 },
  "table_coffee_table": { w: 1.10, h: 0.45, d: 0.60 },
  "table_side_table": { w: 0.50, h: 0.55, d: 0.50 },
  "table_desk": { w: 1.20, h: 0.75, d: 0.60 },
  "table_default": { w: 1.00, h: 0.75, d: 0.60 },
  // Bedroom
  "bed_single_bed": { w: 0.90, h: 1.10, d: 2.00 },
  "bed_double_bed": { w: 1.40, h: 1.10, d: 2.00 },
  "bed_queen_bed": { w: 1.60, h: 1.10, d: 2.00 },
  "bed_king_bed": { w: 1.80, h: 1.10, d: 2.00 },
  "bed_default": { w: 1.60, h: 1.10, d: 2.00 },
  // Storage
  "cabinet_default": { w: 1.00, h: 0.80, d: 0.45 },
  "shelf_default": { w: 0.80, h: 1.80, d: 0.30 },
};

function getDims(category: string, subtype: string): { w: number; h: number; d: number } {
  return DEFAULT_DIMS[`${category}_${subtype}`]
    ?? DEFAULT_DIMS[`${category}_default`]
    ?? { w: 1.0, h: 0.80, d: 0.60 };
}

// ─── Template Matching ───────────────────────────────────

export function matchTemplate(classification: FurnitureClassification): {
  family: TemplateFamily;
  panels: PanelData[];
  dims: { w: number; h: number; d: number };
} {
  const { category, subtype, style, material, armStyle, backStyle, baseStyle, seatCount } = classification;

  // Score each family
  let bestFamily = TEMPLATE_FAMILIES[0];
  let bestScore = -1;

  for (const family of TEMPLATE_FAMILIES) {
    let score = 0;

    // Category match (must match)
    if (family.category === category) score += 100;
    else if (category === "sofa" && family.category === "chair") score += 30; // sofa can fall back to chair
    else if (category === "chair" && family.category === "sofa") score += 20;
    else continue; // skip if category doesn't match at all

    // Subtype match
    if (family.subtypes.some(s => subtype.includes(s) || s.includes(subtype))) score += 50;

    // Style match
    if (family.styles.some(s => style.includes(s) || s.includes(style))) score += 30;

    if (score > bestScore) {
      bestScore = score;
      bestFamily = family;
    }
  }

  // Get dimensions
  const dims = getDims(category, subtype);

  // Determine seat count for sofas
  let seats = seatCount ?? 2;
  if (subtype.includes("3_seat") || subtype.includes("3seat")) seats = 3;
  else if (subtype.includes("loveseat") || subtype.includes("2_seat")) seats = 2;
  else if (subtype.includes("armchair") || subtype.includes("accent")) seats = 1;
  else if (category === "sofa" && !seatCount) seats = 3;

  // Build panels
  const panels = bestFamily.buildPanels({
    w: dims.w,
    h: dims.h,
    d: dims.d,
    material,
    seatCount: seats,
    armStyle: armStyle || "rounded",
    backStyle: backStyle || "loose_back",
    baseStyle: baseStyle || "legs",
  });

  return { family: bestFamily, panels, dims };
}
