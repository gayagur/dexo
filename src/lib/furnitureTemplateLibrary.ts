/**
 * DEXO Furniture Template Library — 200+ items in family/variant system.
 *
 * Architecture:
 *   TemplateFamily → contains multiple TemplateVariants
 *   TemplateVariant → has metadata + buildPanels()
 *   Parametric builders → one builder per furniture type, configurable
 *
 * Used by: classify → matchTemplate() → insert editable object
 */

import type { PanelData, PanelShape } from "./furnitureData";
import { LIBRARY_TEMPLATES } from "./libraryData";

/** Reuse parametric geometry from `LIBRARY_TEMPLATES` for AI classify → matchTemplate. */
function fromLibraryTemplate(libraryId: string): (w: number, h: number, d: number, _mat: string) => PanelData[] {
  const tpl = LIBRARY_TEMPLATES.find((t) => t.id === libraryId);
  if (!tpl) {
    throw new Error(`fromLibraryTemplate: missing "${libraryId}" in LIBRARY_TEMPLATES`);
  }
  return (w, h, d, _mat) =>
    tpl.buildPanels({ w: Math.round(w * 1000), h: Math.round(h * 1000), d: Math.round(d * 1000) });
}

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface FurnitureClassification {
  category: string;
  subtype: string;
  style: string;
  armStyle: string;
  backStyle: string;
  baseStyle: string;
  material: string;
  dominantColor: string;
  seatCount?: number;
  estimatedDims?: { w: number; h: number; d: number };
}

export interface TemplateVariant {
  id: string;
  name: string;
  category: string;
  subtypes: string[];
  styles: string[];
  tags: string[];
  defaultDims: { w: number; h: number; d: number }; // meters
  defaultMaterial: string;
  buildPanels: (w: number, h: number, d: number, mat: string) => PanelData[];
}

// ═════════════════════════════════════════════════════════
// PANEL HELPERS
// ═════════════════════════════════════════════════════════

let _pid = 9000;
function pid(): string { return `t${++_pid}`; }
function resetPid() { _pid = 9000; }

function p(label: string, type: PanelData["type"], shape: PanelShape | undefined, pos: [number,number,number], size: [number,number,number], mat: string, opts?: { rotation?: [number,number,number]; shapeParams?: Record<string,number> }): PanelData {
  return {
    id: pid(), type, label, position: pos, size, materialId: mat,
    ...(shape && shape !== "box" ? { shape } : {}),
    ...(opts?.rotation ? { rotation: opts.rotation } : {}),
    ...(opts?.shapeParams ? { shapeParams: opts.shapeParams } : {}),
  };
}

// ═════════════════════════════════════════════════════════
// PARAMETRIC BUILDERS
// ═════════════════════════════════════════════════════════

// ─── SOFA BUILDER ────────────────────────────────────────

interface SofaConfig {
  seats: number;
  armW: number;      // arm width (0 = no arms)
  armShape: PanelShape;
  cushionPuff: PanelShape; // cushion vs cushion_firm vs padded_block
  backPuff: PanelShape;
  legH: number;
  legMat: string;
  legShape: PanelShape;
  baseVisible: boolean;
  pillows: boolean;
}

function buildSofa(w: number, h: number, d: number, mat: string, cfg: SofaConfig): PanelData[] {
  resetPid();
  const panels: PanelData[] = [];
  const { seats, armW, armShape, cushionPuff, backPuff, legH, legMat, legShape, baseVisible, pillows } = cfg;

  const baseH = 0.15;
  const baseTop = legH + baseH;
  const armH = 0.38;
  const backT = 0.13;
  const backH = 0.40;
  const cushT = 0.14;
  const seatD = 0.60;
  const innerW = w - armW * 2;
  const cushW = innerW / seats - 0.008;
  const seatY = baseTop + cushT / 2;
  const seatZ = d / 2 - seatD / 2 - 0.02;
  const seatTopY = baseTop + cushT;
  const backCushH = 0.40;
  const backCushT = 0.20;
  const backY = seatTopY + backCushH / 2 + 0.02;
  const backZ = -d / 2 + backT / 2 + backCushT / 2 + 0.02;

  // Base frame
  panels.push(p("Base", "horizontal", "rounded_rect", [0, legH + baseH / 2, 0], [innerW, baseH, d - 0.04], baseVisible ? mat : mat, { shapeParams: { cornerRadius: 0.005 } }));

  // Back rest
  panels.push(p("Back rest", "vertical", "padded_block", [0, baseTop + backH / 2, -d / 2 + backT / 2], [innerW, backH, backT], mat, { rotation: [-0.09, 0, 0] }));

  // Arms
  if (armW > 0) {
    panels.push(p("Left Arm", "vertical", armShape, [-w / 2 + armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat));
    panels.push(p("Right Arm", "vertical", armShape, [w / 2 - armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat));
  }

  // Seat cushions
  const gap = 0.006;
  for (let i = 0; i < seats; i++) {
    const x = -innerW / 2 + cushW / 2 + i * (cushW + gap) + gap * seats / 2;
    panels.push(p(`Seat ${i + 1}`, "horizontal", cushionPuff, [x, seatY, seatZ], [cushW, cushT, seatD], mat));
  }

  // Back cushions
  for (let i = 0; i < seats; i++) {
    const x = -innerW / 2 + cushW / 2 + i * (cushW + gap) + gap * seats / 2;
    panels.push(p(`Back ${i + 1}`, "vertical", backPuff, [x, backY, backZ], [cushW - 0.02, backCushH, backCushT], mat, { rotation: [-0.15, 0, 0] }));
  }

  // Legs
  if (legH > 0.02) {
    panels.push(p("Leg FL", "vertical", legShape, [-w / 2 + 0.10, legH / 2, d / 2 - 0.10], [0.035, legH, 0.035], legMat));
    panels.push(p("Leg FR", "vertical", legShape, [w / 2 - 0.10, legH / 2, d / 2 - 0.10], [0.035, legH, 0.035], legMat));
    panels.push(p("Leg BL", "vertical", legShape, [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], [0.035, legH, 0.035], legMat));
    panels.push(p("Leg BR", "vertical", legShape, [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], [0.035, legH, 0.035], legMat));
  }

  // Pillows
  if (pillows && seats >= 2) {
    panels.push(p("Pillow L", "vertical", "cushion", [-innerW / 3, seatTopY + 0.18, seatZ - 0.08], [0.40, 0.40, 0.13], "fabric_taupe", { rotation: [-0.35, 0.12, 0] }));
    panels.push(p("Pillow R", "vertical", "cushion", [innerW / 3, seatTopY + 0.18, seatZ - 0.08], [0.40, 0.40, 0.13], "fabric_taupe", { rotation: [-0.35, -0.10, 0] }));
  }

  return panels;
}

// Sofa presets
const SOFA_MODERN: SofaConfig = { seats: 3, armW: 0.16, armShape: "padded_block", cushionPuff: "cushion_firm", backPuff: "cushion", legH: 0.06, legMat: "oak", legShape: "cylinder", baseVisible: false, pillows: true };
const SOFA_MINIMAL: SofaConfig = { ...SOFA_MODERN, armShape: "padded_block", cushionPuff: "cushion_firm", backPuff: "cushion_firm", legH: 0.04, pillows: false };
const SOFA_SCANDI: SofaConfig = { ...SOFA_MODERN, legH: 0.14, legMat: "oak", legShape: "tapered_leg", armW: 0.10, pillows: true };
const SOFA_PLUSH: SofaConfig = { ...SOFA_MODERN, armW: 0.20, cushionPuff: "cushion", backPuff: "cushion", legH: 0.03, pillows: true };
const SOFA_TUXEDO: SofaConfig = { ...SOFA_MODERN, armW: 0.12, armShape: "padded_block", backPuff: "cushion_firm" };
const SOFA_LOW: SofaConfig = { ...SOFA_MODERN, legH: 0.02, armW: 0.14, pillows: false };

// ─── TABLE BUILDER ───────────────────────────────────────

interface TableConfig {
  topShape: PanelShape;
  topT: number;
  legCount: number;
  legShape: PanelShape;
  legD: number;
  legMat: string;
  topCR: number;
  hasPedestal: boolean;
  hasShelf: boolean;
}

function buildTable(w: number, h: number, d: number, mat: string, cfg: TableConfig): PanelData[] {
  resetPid();
  const panels: PanelData[] = [];
  const { topShape, topT, legCount, legShape, legD, legMat, topCR, hasPedestal, hasShelf } = cfg;

  const legH = h - topT;
  const topParams = topCR > 0 ? { shapeParams: { cornerRadius: topCR } } : {};

  panels.push(p("Top", "horizontal", topShape, [0, h - topT / 2, 0], [w, topT, d], mat, topParams));

  if (hasPedestal) {
    panels.push(p("Pedestal", "vertical", "cylinder", [0, legH / 2, 0], [0.12, legH, 0.12], legMat));
    panels.push(p("Base", "horizontal", "cylinder", [0, 0.02, 0], [w * 0.6, 0.04, w * 0.6], legMat));
  } else if (legCount === 4) {
    const inX = w / 2 - 0.06, inZ = d / 2 - 0.06;
    panels.push(p("Leg FL", "vertical", legShape, [-inX, legH / 2, inZ], [legD, legH, legD], legMat));
    panels.push(p("Leg FR", "vertical", legShape, [inX, legH / 2, inZ], [legD, legH, legD], legMat));
    panels.push(p("Leg BL", "vertical", legShape, [-inX, legH / 2, -inZ], [legD, legH, legD], legMat));
    panels.push(p("Leg BR", "vertical", legShape, [inX, legH / 2, -inZ], [legD, legH, legD], legMat));
  }

  if (hasShelf) {
    panels.push(p("Shelf", "horizontal", topShape === "circle_panel" ? "circle_panel" : "rounded_rect", [0, h * 0.3, 0], [w - 0.10, 0.02, d - 0.10], mat, topParams));
  }

  return panels;
}

const TABLE_RECT: TableConfig = { topShape: "rounded_rect", topT: 0.04, legCount: 4, legShape: "cylinder", legD: 0.04, legMat: "oak", topCR: 0.01, hasPedestal: false, hasShelf: false };
const TABLE_ROUND: TableConfig = { ...TABLE_RECT, topShape: "circle_panel" };
const TABLE_PEDESTAL: TableConfig = { ...TABLE_ROUND, hasPedestal: true };
const TABLE_SHELF: TableConfig = { ...TABLE_RECT, hasShelf: true };

// ─── BED BUILDER ─────────────────────────────────────────

function buildBed(w: number, h: number, d: number, mat: string, headH: number, headMat: string, headShape: PanelShape): PanelData[] {
  resetPid();
  const panels: PanelData[] = [];
  const legH = 0.10, railH = 0.14, mattH = 0.24;
  const woodMat = headMat.includes("fabric") ? "oak" : headMat;

  // Headboard
  panels.push(p("Headboard", "vertical", headShape, [0, headH / 2 + legH, -d / 2 + 0.025], [w - 0.04, headH, 0.05], headMat, headShape === "rounded_rect" ? { shapeParams: { cornerRadius: 0.01 } } : {}));
  // Footboard
  panels.push(p("Footboard", "vertical", "rounded_rect", [0, 0.20 + legH, d / 2 - 0.025], [w - 0.04, 0.40, 0.04], woodMat, { shapeParams: { cornerRadius: 0.01 } }));
  // Side rails
  panels.push(p("Left Rail", "horizontal", undefined, [-w / 2 + 0.02, legH + railH / 2, 0], [0.04, railH, d - 0.10], woodMat));
  panels.push(p("Right Rail", "horizontal", undefined, [w / 2 - 0.02, legH + railH / 2, 0], [0.04, railH, d - 0.10], woodMat));
  // Slats
  const slatCount = 8;
  const slatSpacing = (d - 0.14) / (slatCount - 1);
  for (let i = 0; i < slatCount; i++) {
    panels.push(p(`Slat ${i + 1}`, "horizontal", undefined, [0, legH + railH - 0.01, -d / 2 + 0.07 + i * slatSpacing], [w - 0.10, 0.02, 0.08], "plywood"));
  }
  // Mattress
  panels.push(p("Mattress", "horizontal", "mattress", [0, legH + railH + mattH / 2, 0], [w - 0.06, mattH, d - 0.06], "fabric_cream"));
  // Legs
  panels.push(p("Leg FL", "vertical", "cylinder", [-w / 2 + 0.05, legH / 2, d / 2 - 0.05], [0.05, legH, 0.05], woodMat));
  panels.push(p("Leg FR", "vertical", "cylinder", [w / 2 - 0.05, legH / 2, d / 2 - 0.05], [0.05, legH, 0.05], woodMat));
  panels.push(p("Leg BL", "vertical", "cylinder", [-w / 2 + 0.05, legH / 2, -d / 2 + 0.05], [0.05, legH, 0.05], woodMat));
  panels.push(p("Leg BR", "vertical", "cylinder", [w / 2 - 0.05, legH / 2, -d / 2 + 0.05], [0.05, legH, 0.05], woodMat));
  // Pillows
  panels.push(p("Pillow L", "horizontal", "cushion", [-w / 4, legH + railH + mattH + 0.06, -d / 2 + 0.30], [0.50, 0.12, 0.35], "fabric_cream"));
  panels.push(p("Pillow R", "horizontal", "cushion", [w / 4, legH + railH + mattH + 0.06, -d / 2 + 0.30], [0.50, 0.12, 0.35], "fabric_cream"));
  return panels;
}

// ─── CABINET BUILDER ─────────────────────────────────────

function buildCabinet(w: number, h: number, d: number, mat: string, shelves: number, drawers: number, legH: number): PanelData[] {
  resetPid();
  const T = 0.02;
  const panels: PanelData[] = [];

  panels.push(p("Top", "horizontal", undefined, [0, h - T / 2, 0], [w, T, d], mat));
  panels.push(p("Bottom", "horizontal", undefined, [0, legH + T / 2, 0], [w, T, d], mat));
  panels.push(p("Left Side", "vertical", undefined, [-w / 2 + T / 2, (h + legH) / 2, 0], [T, h - legH, d], mat));
  panels.push(p("Right Side", "vertical", undefined, [w / 2 - T / 2, (h + legH) / 2, 0], [T, h - legH, d], mat));
  panels.push(p("Back", "back", undefined, [0, (h + legH) / 2, -d / 2 + T / 4], [w - T * 2, h - legH - T, T / 2], mat));

  // Shelves
  const innerH = h - legH - T * 2;
  for (let i = 1; i <= shelves; i++) {
    const y = legH + T + (innerH / (shelves + 1)) * i;
    panels.push(p(`Shelf ${i}`, "horizontal", undefined, [0, y, 0], [w - T * 2, T, d - T], mat));
  }

  // Drawers (simple fronts)
  for (let i = 0; i < drawers; i++) {
    const drawerH = innerH / drawers;
    const y = legH + T + drawerH * i + drawerH / 2;
    panels.push(p(`Drawer ${i + 1}`, "vertical", "drawer_box", [0, y, d / 2 - T / 2], [w - T * 2 - 0.01, drawerH - 0.01, T], mat));
    panels.push(p(`Handle ${i + 1}`, "horizontal", "bar_handle", [0, y, d / 2 + 0.01], [0.12, 0.02, 0.03], "black_metal"));
  }

  // Legs
  if (legH > 0.02) {
    panels.push(p("Leg FL", "vertical", "cylinder", [-w / 2 + 0.05, legH / 2, d / 2 - 0.05], [0.03, legH, 0.03], "black_metal"));
    panels.push(p("Leg FR", "vertical", "cylinder", [w / 2 - 0.05, legH / 2, d / 2 - 0.05], [0.03, legH, 0.03], "black_metal"));
    panels.push(p("Leg BL", "vertical", "cylinder", [-w / 2 + 0.05, legH / 2, -d / 2 + 0.05], [0.03, legH, 0.03], "black_metal"));
    panels.push(p("Leg BR", "vertical", "cylinder", [w / 2 - 0.05, legH / 2, -d / 2 + 0.05], [0.03, legH, 0.03], "black_metal"));
  }
  return panels;
}

// ─── SHELF BUILDER ───────────────────────────────────────

function buildShelf(w: number, h: number, d: number, mat: string, shelfCount: number): PanelData[] {
  resetPid();
  const T = 0.02;
  const panels: PanelData[] = [];
  panels.push(p("Top", "horizontal", undefined, [0, h - T / 2, 0], [w, T, d], mat));
  panels.push(p("Bottom", "horizontal", undefined, [0, T / 2, 0], [w, T, d], mat));
  panels.push(p("Left Side", "vertical", undefined, [-w / 2 + T / 2, h / 2, 0], [T, h, d], mat));
  panels.push(p("Right Side", "vertical", undefined, [w / 2 - T / 2, h / 2, 0], [T, h, d], mat));
  panels.push(p("Back", "back", undefined, [0, h / 2, -d / 2 + T / 4], [w - T * 2, h - T * 2, T / 2], mat));
  for (let i = 1; i < shelfCount; i++) {
    const y = (h / shelfCount) * i;
    panels.push(p(`Shelf ${i}`, "horizontal", undefined, [0, y, 0], [w - T * 2, T, d - T], mat));
  }
  return panels;
}

// ─── ACCESSORY BUILDERS ──────────────────────────────────

function buildPillow(w: number, h: number, _d: number, mat: string): PanelData[] {
  resetPid();
  return [p("Pillow", "vertical", "cushion", [0, h / 2, 0], [w, h, 0.13], mat)];
}

function buildThrow(w: number, h: number, _d: number, mat: string): PanelData[] {
  resetPid();
  return [p("Throw", "horizontal", "cushion_firm", [0, h / 2, 0], [w, 0.03, h], mat)];
}

function buildRug(w: number, _h: number, d: number, mat: string): PanelData[] {
  resetPid();
  return [p("Rug", "horizontal", "rounded_rect", [0, 0.005, 0], [w, 0.01, d], mat, { shapeParams: { cornerRadius: 0.01 } })];
}

function buildLamp(w: number, h: number, _d: number, mat: string): PanelData[] {
  resetPid();
  const panels: PanelData[] = [];
  const baseH = 0.03;
  panels.push(p("Base", "horizontal", "cylinder", [0, baseH / 2, 0], [w * 0.6, baseH, w * 0.6], "black_metal"));
  panels.push(p("Stem", "vertical", "cylinder", [0, h * 0.4, 0], [0.025, h * 0.7, 0.025], "black_metal"));
  panels.push(p("Shade", "vertical", "lamp_shade", [0, h - 0.12, 0], [w, 0.22, w], mat, { shapeParams: { topRatio: 0.5 } }));
  return panels;
}

// ═════════════════════════════════════════════════════════
// TEMPLATE REGISTRY — all 200 items
// ═════════════════════════════════════════════════════════

export const TEMPLATE_REGISTRY: TemplateVariant[] = [
  // ════ A. SOFAS & SECTIONALS (30) ═══════════════════════
  { id: "modern_soft_3seat", name: "Modern Soft 3-Seat Sofa", category: "sofa", subtypes: ["3_seat", "sofa", "couch"], styles: ["modern", "contemporary"], tags: ["soft", "rounded"], defaultDims: { w: 2.10, h: 0.85, d: 0.90 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, SOFA_MODERN) },
  { id: "modern_soft_loveseat", name: "Modern Soft Loveseat", category: "sofa", subtypes: ["loveseat", "2_seat"], styles: ["modern"], tags: ["soft"], defaultDims: { w: 1.60, h: 0.85, d: 0.90 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_MODERN, seats: 2 }) },
  { id: "modern_soft_armchair", name: "Modern Soft Armchair", category: "chair", subtypes: ["armchair", "accent_chair"], styles: ["modern"], tags: ["soft", "single"], defaultDims: { w: 0.85, h: 0.85, d: 0.85 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_MODERN, seats: 1 }) },
  { id: "modern_soft_ottoman", name: "Modern Soft Ottoman", category: "chair", subtypes: ["ottoman", "pouf", "footstool"], styles: ["modern"], tags: ["soft"], defaultDims: { w: 0.60, h: 0.42, d: 0.60 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => { resetPid(); return [p("Ottoman", "horizontal", "cushion", [0, h / 2, 0], [w, h, d], m)]; } },
  { id: "modern_soft_l_sectional", name: "Modern L-Sectional", category: "sofa", subtypes: ["l_sectional", "sectional", "l_shaped"], styles: ["modern"], tags: ["sectional", "l_shape"], defaultDims: { w: 2.70, h: 0.85, d: 1.80 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_MODERN, seats: 3 }) },
  { id: "minimal_box_3seat", name: "Minimal Box 3-Seat Sofa", category: "sofa", subtypes: ["3_seat", "sofa"], styles: ["minimalist", "modern"], tags: ["boxy", "clean"], defaultDims: { w: 2.10, h: 0.80, d: 0.85 }, defaultMaterial: "fabric_gray", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, SOFA_MINIMAL) },
  { id: "minimal_box_loveseat", name: "Minimal Box Loveseat", category: "sofa", subtypes: ["loveseat", "2_seat"], styles: ["minimalist"], tags: ["boxy"], defaultDims: { w: 1.50, h: 0.80, d: 0.85 }, defaultMaterial: "fabric_gray", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_MINIMAL, seats: 2 }) },
  { id: "minimal_box_armchair", name: "Minimal Box Armchair", category: "chair", subtypes: ["armchair"], styles: ["minimalist"], tags: ["boxy"], defaultDims: { w: 0.80, h: 0.80, d: 0.80 }, defaultMaterial: "fabric_gray", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_MINIMAL, seats: 1 }) },
  { id: "scandi_sofa", name: "Scandinavian Sofa", category: "sofa", subtypes: ["3_seat", "sofa"], styles: ["scandinavian", "nordic"], tags: ["tapered_legs", "light"], defaultDims: { w: 2.00, h: 0.82, d: 0.88 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, SOFA_SCANDI) },
  { id: "scandi_loveseat", name: "Scandinavian Loveseat", category: "sofa", subtypes: ["loveseat", "2_seat"], styles: ["scandinavian"], tags: ["tapered_legs"], defaultDims: { w: 1.50, h: 0.82, d: 0.88 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_SCANDI, seats: 2 }) },
  { id: "scandi_armchair", name: "Scandinavian Armchair", category: "chair", subtypes: ["armchair"], styles: ["scandinavian"], tags: ["tapered_legs"], defaultDims: { w: 0.80, h: 0.82, d: 0.82 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_SCANDI, seats: 1 }) },
  { id: "plush_sofa", name: "Luxury Plush Sofa", category: "sofa", subtypes: ["3_seat", "sofa"], styles: ["luxury", "glam"], tags: ["plush", "deep"], defaultDims: { w: 2.20, h: 0.85, d: 0.95 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, SOFA_PLUSH) },
  { id: "plush_loveseat", name: "Luxury Plush Loveseat", category: "sofa", subtypes: ["loveseat"], styles: ["luxury"], tags: ["plush"], defaultDims: { w: 1.65, h: 0.85, d: 0.95 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_PLUSH, seats: 2 }) },
  { id: "plush_armchair", name: "Luxury Plush Armchair", category: "chair", subtypes: ["armchair", "club_chair"], styles: ["luxury"], tags: ["plush"], defaultDims: { w: 0.90, h: 0.85, d: 0.90 }, defaultMaterial: "leather_brown", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_PLUSH, seats: 1 }) },
  { id: "tuxedo_sofa", name: "Tuxedo Sofa", category: "sofa", subtypes: ["3_seat", "sofa", "tuxedo"], styles: ["modern", "contemporary"], tags: ["tuxedo", "square_arms"], defaultDims: { w: 2.10, h: 0.80, d: 0.88 }, defaultMaterial: "velvet_navy", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, SOFA_TUXEDO) },
  { id: "low_profile_sofa", name: "Low Profile Sofa", category: "sofa", subtypes: ["3_seat", "sofa"], styles: ["modern", "japanese"], tags: ["low", "floor"], defaultDims: { w: 2.10, h: 0.70, d: 0.90 }, defaultMaterial: "fabric_charcoal", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, SOFA_LOW) },

  // ════ B. CHAIRS & ACCENT SEATING (30) ══════════════════
  { id: "dining_chair_upholstered", name: "Upholstered Dining Chair", category: "chair", subtypes: ["dining_chair"], styles: ["modern", "contemporary"], tags: ["dining"], defaultDims: { w: 0.48, h: 0.85, d: 0.52 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => { resetPid(); return [p("Seat", "horizontal", "cushion_firm", [0, 0.46, 0.02], [0.42, 0.06, 0.40], m), p("Back", "vertical", "cushion_firm", [0, 0.72, -0.20], [0.40, 0.36, 0.06], m), p("Leg FL", "vertical", "tapered_leg", [-0.18, 0.22, 0.18], [0.03, 0.44, 0.03], "oak"), p("Leg FR", "vertical", "tapered_leg", [0.18, 0.22, 0.18], [0.03, 0.44, 0.03], "oak"), p("Leg BL", "vertical", "tapered_leg", [-0.18, 0.22, -0.18], [0.03, 0.44, 0.03], "oak"), p("Leg BR", "vertical", "tapered_leg", [0.18, 0.22, -0.18], [0.03, 0.44, 0.03], "oak")]; } },
  { id: "wood_dining_chair", name: "Wood Dining Chair", category: "chair", subtypes: ["dining_chair"], styles: ["scandinavian", "classic", "modern"], tags: ["wood", "dining", "rounded"],
    defaultDims: { w: 0.45, h: 0.82, d: 0.50 }, defaultMaterial: "oak",
    buildPanels: (w, h, d, m) => { resetPid(); return [
      p("Seat", "horizontal", "circle_panel", [0, 0.44, 0], [0.40, 0.03, 0.40], m),
      p("Back", "vertical", "oval", [0, 0.68, -0.18], [0.36, 0.32, 0.018], m),
      p("Leg FL", "vertical", "tapered_leg", [-0.15, 0.22, 0.15], [0.028, 0.44, 0.028], m),
      p("Leg FR", "vertical", "tapered_leg", [0.15, 0.22, 0.15], [0.028, 0.44, 0.028], m),
      p("Leg BL", "vertical", "cylinder", [-0.14, 0.34, -0.15], [0.028, 0.68, 0.028], m),
      p("Leg BR", "vertical", "cylinder", [0.14, 0.34, -0.15], [0.028, 0.68, 0.028], m),
    ]; },
  },
  { id: "barrel_tub_chair", name: "Curved Barrel/Tub Chair", category: "chair", subtypes: ["accent_chair", "barrel_chair", "tub_chair", "club_chair"], styles: ["modern", "contemporary", "scandinavian"], tags: ["curved", "wraparound", "tub", "barrel"],
    defaultDims: { w: 0.75, h: 0.75, d: 0.72 }, defaultMaterial: "fabric_cream",
    buildPanels: (w, h, d, m) => {
      resetPid();
      const legH = 0.18;
      const shellH = h - legH;
      const seatTopY = legH + shellH * 0.35;
      return [
        p("Shell", "vertical", "padded_block", [0, legH + shellH / 2, -0.02], [w - 0.02, shellH, d - 0.04], m),
        p("Seat", "horizontal", "cushion", [0, seatTopY, 0.04], [w * 0.65, 0.07, d * 0.70], m),
        p("Leg FL", "vertical", "cylinder", [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], [0.03, legH, 0.03], "oak"),
        p("Leg FR", "vertical", "cylinder", [w / 2 - 0.08, legH / 2, d / 2 - 0.08], [0.03, legH, 0.03], "oak"),
        p("Leg BL", "vertical", "cylinder", [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], [0.03, legH, 0.03], "oak"),
        p("Leg BR", "vertical", "cylinder", [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], [0.03, legH, 0.03], "oak"),
        p("Stretcher F", "horizontal", undefined, [0, legH * 0.5, d / 2 - 0.08], [w - 0.20, 0.02, 0.02], "oak"),
        p("Stretcher L", "horizontal", undefined, [-w / 2 + 0.08, legH * 0.5, 0], [0.02, 0.02, d - 0.20], "oak"),
        p("Stretcher R", "horizontal", undefined, [w / 2 - 0.08, legH * 0.5, 0], [0.02, 0.02, d - 0.20], "oak"),
        p("Stretcher B", "horizontal", undefined, [0, legH * 0.5, -d / 2 + 0.08], [w - 0.20, 0.02, 0.02], "oak"),
      ];
    },
  },
  { id: "wingback_chair", name: "Mid-Century Wingback Chair", category: "chair", subtypes: ["wingback", "armchair", "accent_chair"], styles: ["mid_century", "modern", "classic", "scandinavian"], tags: ["wingback", "tall_back", "tapered_legs", "tufted"],
    defaultDims: { w: 0.72, h: 0.95, d: 0.74 }, defaultMaterial: "fabric_sage",
    buildPanels: (w, h, d, mat) => {
      resetPid();
      const legH = 0.16;
      const seatH = 0.06;
      const seatTopY = 0.42;
      const seatY = seatTopY - seatH / 2;
      const seatD = d * 0.72;
      const seatW = w * 0.70;
      const armW = 0.10;
      const armH = 0.32;
      const armTop = seatTopY + armH;
      const backH = h - seatTopY + 0.04;
      const backT = 0.08;
      const backW = w * 0.78;
      const wingD = d * 0.35; // wing depth (how far forward the wings come)

      return [
        // Seat cushion — firm, sits inside the frame
        p("Seat cushion", "horizontal", "cushion_firm", [0, seatY, 0.04], [seatW, seatH, seatD], mat),
        // Back — tall, slightly tilted, tufted look
        p("Backrest", "vertical", "cushion_firm", [0, seatTopY + backH / 2 - 0.02, -d / 2 + backT / 2 + 0.02], [backW, backH, backT], mat, { rotation: [-0.10, 0, 0] }),
        // Left arm — wraps from back to front, integrated wing
        p("Left Arm", "vertical", "padded_block", [-w / 2 + armW / 2 + 0.01, seatTopY + armH / 2 - 0.02, -0.02], [armW, armH, wingD], mat),
        // Right arm — mirror
        p("Right Arm", "vertical", "padded_block", [w / 2 - armW / 2 - 0.01, seatTopY + armH / 2 - 0.02, -0.02], [armW, armH, wingD], mat),
        // Left wing extension (upper, wraps around back)
        p("Left Wing", "vertical", "padded_block", [-w / 2 + 0.04, armTop + 0.06, -d / 2 + 0.12], [0.06, 0.18, 0.16], mat),
        // Right wing extension
        p("Right Wing", "vertical", "padded_block", [w / 2 - 0.04, armTop + 0.06, -d / 2 + 0.12], [0.06, 0.18, 0.16], mat),
        // Seat frame (hidden under cushion)
        p("Frame", "horizontal", "rounded_rect", [0, seatTopY - seatH - 0.04, 0], [w - 0.06, 0.06, d - 0.06], mat, { shapeParams: { cornerRadius: 0.005 } }),
        // 4 tapered wood legs — splayed outward slightly
        p("Leg FL", "vertical", "tapered_leg", [-w / 2 + 0.10, legH / 2, d / 2 - 0.10], [0.04, legH, 0.04], "walnut"),
        p("Leg FR", "vertical", "tapered_leg", [w / 2 - 0.10, legH / 2, d / 2 - 0.10], [0.04, legH, 0.04], "walnut"),
        p("Leg BL", "vertical", "tapered_leg", [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], [0.04, legH, 0.04], "walnut"),
        p("Leg BR", "vertical", "tapered_leg", [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], [0.04, legH, 0.04], "walnut"),
      ];
    },
  },
  { id: "lounge_chair", name: "Lounge Chair", category: "chair", subtypes: ["lounge_chair", "accent_chair"], styles: ["mid_century", "modern"], tags: ["low", "lounge"], defaultDims: { w: 0.78, h: 0.78, d: 0.80 }, defaultMaterial: "leather_tan", buildPanels: (w, h, d, m) => buildSofa(w, h, d, m, { ...SOFA_SCANDI, seats: 1 }) },
  { id: "executive_office_chair", name: "Executive Office Chair", category: "chair",
    subtypes: ["office_chair", "desk_chair", "task_chair", "executive_chair", "gaming_chair"],
    styles: ["modern", "ergonomic", "executive"], tags: ["swivel", "office", "headrest", "chrome_base", "casters"],
    defaultDims: { w: 0.68, h: 1.25, d: 0.70 }, defaultMaterial: "leather_black",
    buildPanels: (w, h, d, m) => {
      resetPid();
      const dark = "black_metal";
      const chrome = "chrome";
      const seatY = 0.48, seatT = 0.10;
      const backH = 0.52, backT = 0.08, backY = seatY + seatT / 2 + backH / 2 + 0.02, backZ = -0.20;
      const headH = 0.14, headY = backY + backH / 2 + headH / 2 + 0.02;
      const armX = 0.27, armSY = seatY + 0.02, armPY = seatY + seatT / 2 + 0.02;
      const liftH = 0.22, liftY = seatY - seatT / 2 - liftH / 2;
      const baseY = liftY - liftH / 2 - 0.02, baseR = 0.33;
      const cAngles = [0, 72, 144, 216, 288].map(a => a * Math.PI / 180);
      return [
        p("Seat", "horizontal", "cushion_firm", [0, seatY, 0.02], [0.52, seatT, 0.50], m),
        p("Backrest", "vertical", "cushion_firm", [0, backY, backZ], [0.48, backH, backT], m, { rotation: [-0.12, 0, 0] }),
        p("Headrest", "horizontal", "cushion", [0, headY, backZ + 0.02], [0.30, headH, 0.07], m),
        p("L arm post", "vertical", undefined, [-armX, armSY, 0.04], [0.035, 0.16, 0.04], dark),
        p("L arm pad", "horizontal", "padded_block", [-armX, armPY, 0.04], [0.07, 0.035, 0.30], m),
        p("R arm post", "vertical", undefined, [armX, armSY, 0.04], [0.035, 0.16, 0.04], dark),
        p("R arm pad", "horizontal", "padded_block", [armX, armPY, 0.04], [0.07, 0.035, 0.30], m),
        p("Gas lift", "vertical", "cylinder", [0, liftY, 0], [0.06, liftH, 0.06], dark),
        p("Star base", "horizontal", "x_base", [0, baseY, 0], [0.62, 0.04, 0.62], chrome),
        ...cAngles.map((a, i) => p(`Caster ${i + 1}`, "vertical", "sphere", [Math.cos(a) * baseR, 0.035, Math.sin(a) * baseR], [0.06, 0.06, 0.06], dark)),
      ];
    },
  },
  { id: "bench_upholstered", name: "Upholstered Bench", category: "chair", subtypes: ["bench", "dining_bench"], styles: ["modern", "contemporary"], tags: ["bench", "seating"], defaultDims: { w: 1.20, h: 0.48, d: 0.40 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => { resetPid(); return [p("Seat", "horizontal", "cushion_firm", [0, h - 0.06, 0], [w, 0.08, d], m), p("Frame", "horizontal", "rounded_rect", [0, h / 2 - 0.04, 0], [w - 0.04, h - 0.10, d - 0.04], "oak", { shapeParams: { cornerRadius: 0.01 } })]; } },
  { id: "pouf_round", name: "Round Pouf", category: "chair", subtypes: ["pouf", "ottoman"], styles: ["modern", "bohemian"], tags: ["round", "floor"], defaultDims: { w: 0.50, h: 0.35, d: 0.50 }, defaultMaterial: "fabric_taupe", buildPanels: (w, h, d, m) => { resetPid(); return [p("Pouf", "horizontal", "cushion", [0, h / 2, 0], [w, h, d], m)]; } },
  { id: "bar_stool", name: "Bar Stool", category: "chair", subtypes: ["bar_stool", "counter_stool"], styles: ["modern", "industrial"], tags: ["tall", "bar"], defaultDims: { w: 0.42, h: 0.75, d: 0.42 }, defaultMaterial: "black_metal", buildPanels: (w, h, d, m) => { resetPid(); return [p("Seat", "horizontal", "cushion_firm", [0, h - 0.04, 0], [0.38, 0.05, 0.35], "fabric_charcoal"), p("Leg FL", "vertical", "cylinder", [-0.14, h / 2 - 0.02, 0.14], [0.025, h - 0.06, 0.025], m), p("Leg FR", "vertical", "cylinder", [0.14, h / 2 - 0.02, 0.14], [0.025, h - 0.06, 0.025], m), p("Leg BL", "vertical", "cylinder", [-0.14, h / 2 - 0.02, -0.14], [0.025, h - 0.06, 0.025], m), p("Leg BR", "vertical", "cylinder", [0.14, h / 2 - 0.02, -0.14], [0.025, h - 0.06, 0.025], m), p("Footrest", "horizontal", "cylinder", [0, 0.25, 0.14], [0.28, 0.02, 0.02], m)]; } },
  { id: "chair_ladder_back", name: "Ladder-Back Dining Chair", category: "chair", subtypes: ["dining_chair", "farmhouse"], styles: ["farmhouse", "classic", "rustic"], tags: ["ladder_back", "slats", "wood", "library"], defaultDims: { w: 0.45, h: 0.92, d: 0.52 }, defaultMaterial: "oak", buildPanels: fromLibraryTemplate("chair_ladder_back") },
  { id: "chair_windsor_spindle", name: "Windsor-Style Spindle Chair", category: "chair", subtypes: ["dining_chair", "windsor"], styles: ["classic", "traditional"], tags: ["spindle", "wood", "library"], defaultDims: { w: 0.46, h: 0.90, d: 0.50 }, defaultMaterial: "oak", buildPanels: fromLibraryTemplate("chair_windsor_spindle") },
  { id: "chair_parsons_upholstered", name: "Parsons Upholstered Chair", category: "chair", subtypes: ["dining_chair", "side_chair"], styles: ["modern", "minimalist", "contemporary"], tags: ["upholstered", "parsons", "library"], defaultDims: { w: 0.50, h: 0.88, d: 0.56 }, defaultMaterial: "fabric_charcoal", buildPanels: fromLibraryTemplate("chair_parsons_upholstered") },
  { id: "chair_industrial_metal", name: "Industrial Metal Chair", category: "chair", subtypes: ["dining_chair", "metal_chair"], styles: ["industrial", "modern"], tags: ["metal", "sheet", "library"], defaultDims: { w: 0.48, h: 0.82, d: 0.52 }, defaultMaterial: "black_metal", buildPanels: fromLibraryTemplate("chair_industrial_metal") },
  { id: "chair_counter_stool_back", name: "Counter Stool with Back", category: "chair", subtypes: ["counter_stool", "bar_stool"], styles: ["modern", "contemporary"], tags: ["counter_height", "footrest", "library"], defaultDims: { w: 0.45, h: 0.98, d: 0.48 }, defaultMaterial: "fabric_cream", buildPanels: fromLibraryTemplate("chair_counter_stool_back") },
  { id: "chair_acrylic_ghost", name: "Ghost Acrylic Chair", category: "chair", subtypes: ["accent_chair", "dining_chair"], styles: ["modern", "contemporary"], tags: ["acrylic", "transparent", "ghost", "library"], defaultDims: { w: 0.46, h: 0.88, d: 0.52 }, defaultMaterial: "acrylic_clear", buildPanels: fromLibraryTemplate("chair_acrylic_ghost") },
  { id: "chair_velvet_accent", name: "Velvet Accent Chair", category: "chair", subtypes: ["accent_chair", "armchair", "club_chair"], styles: ["modern", "luxury"], tags: ["velvet", "bucket", "library"], defaultDims: { w: 0.72, h: 0.82, d: 0.68 }, defaultMaterial: "fabric_blush", buildPanels: fromLibraryTemplate("chair_velvet_accent") },

  // ════ C. COFFEE TABLES (15) ════════════════════════════
  { id: "coffee_rect_wood", name: "Rectangular Coffee Table", category: "table", subtypes: ["coffee_table"], styles: ["modern", "scandinavian"], tags: ["rectangular"], defaultDims: { w: 1.10, h: 0.45, d: 0.60 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_RECT) },
  { id: "coffee_round_wood", name: "Round Coffee Table", category: "table", subtypes: ["coffee_table"], styles: ["modern", "scandinavian"], tags: ["round"], defaultDims: { w: 0.80, h: 0.42, d: 0.80 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_ROUND) },
  { id: "coffee_round_stone", name: "Round Stone Coffee Table", category: "table", subtypes: ["coffee_table"], styles: ["modern", "luxury"], tags: ["round", "stone"], defaultDims: { w: 0.80, h: 0.40, d: 0.80 }, defaultMaterial: "marble_white", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, { ...TABLE_ROUND, legMat: "black_metal" }) },
  { id: "coffee_oval", name: "Oval Coffee Table", category: "table", subtypes: ["coffee_table"], styles: ["modern"], tags: ["oval"], defaultDims: { w: 1.10, h: 0.42, d: 0.65 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, { ...TABLE_RECT, topShape: "oval" }) },
  { id: "coffee_pedestal", name: "Pedestal Coffee Table", category: "table", subtypes: ["coffee_table"], styles: ["modern", "sculptural"], tags: ["pedestal"], defaultDims: { w: 0.75, h: 0.42, d: 0.75 }, defaultMaterial: "marble_white", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_PEDESTAL) },
  { id: "coffee_shelf", name: "Coffee Table with Shelf", category: "table", subtypes: ["coffee_table"], styles: ["modern", "scandinavian"], tags: ["shelf", "storage"], defaultDims: { w: 1.10, h: 0.45, d: 0.60 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_SHELF) },
  { id: "table_coffee_nesting_glass_walnut", name: "Nesting Round Glass Coffee Tables", category: "table", subtypes: ["coffee_table", "nesting_table", "accent_table", "side_table"], styles: ["modern", "contemporary", "mid_century"], tags: ["glass", "walnut", "round", "nesting", "library"], defaultDims: { w: 1.18, h: 0.40, d: 1.02 }, defaultMaterial: "walnut", buildPanels: fromLibraryTemplate("table_coffee_nesting_glass_walnut") },

  // ════ D. SIDE TABLES (15) ══════════════════════════════
  { id: "side_round_wood", name: "Round Side Table", category: "table", subtypes: ["side_table", "end_table"], styles: ["modern", "scandinavian"], tags: ["round", "small"], defaultDims: { w: 0.45, h: 0.55, d: 0.45 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_ROUND) },
  { id: "side_square", name: "Square Side Table", category: "table", subtypes: ["side_table", "end_table"], styles: ["modern", "minimalist"], tags: ["square", "small"], defaultDims: { w: 0.45, h: 0.55, d: 0.45 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_RECT) },
  { id: "nightstand_drawer", name: "Nightstand with Drawer", category: "table", subtypes: ["nightstand", "bedside_table"], styles: ["modern", "scandinavian"], tags: ["drawer", "bedroom"], defaultDims: { w: 0.45, h: 0.50, d: 0.40 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 0, 1, 0.10) },
  { id: "nightstand_2drawer", name: "2-Drawer Nightstand", category: "table", subtypes: ["nightstand", "bedside_table"], styles: ["modern"], tags: ["drawer", "bedroom"], defaultDims: { w: 0.50, h: 0.55, d: 0.40 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 0, 2, 0.10) },
  { id: "nightstand_open", name: "Open Shelf Nightstand", category: "table", subtypes: ["nightstand", "bedside_table"], styles: ["scandinavian", "minimalist"], tags: ["open", "bedroom"], defaultDims: { w: 0.45, h: 0.50, d: 0.38 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 1, 0, 0.10) },

  // ════ E. DINING TABLES (12) ════════════════════════════
  { id: "dining_rect_4", name: "4-Seat Dining Table", category: "table", subtypes: ["dining_table", "kitchen_table"], styles: ["modern", "scandinavian"], tags: ["rectangular", "4_seat"], defaultDims: { w: 1.20, h: 0.75, d: 0.80 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_RECT) },
  { id: "dining_rect_6", name: "6-Seat Dining Table", category: "table", subtypes: ["dining_table"], styles: ["modern", "farmhouse"], tags: ["rectangular", "6_seat"], defaultDims: { w: 1.80, h: 0.75, d: 0.90 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_RECT) },
  { id: "dining_round", name: "Round Dining Table", category: "table", subtypes: ["dining_table"], styles: ["modern", "scandinavian"], tags: ["round"], defaultDims: { w: 1.10, h: 0.75, d: 1.10 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_ROUND) },
  { id: "dining_round_pedestal", name: "Pedestal Dining Table", category: "table", subtypes: ["dining_table"], styles: ["modern", "classic"], tags: ["round", "pedestal"], defaultDims: { w: 1.10, h: 0.75, d: 1.10 }, defaultMaterial: "marble_white", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_PEDESTAL) },
  { id: "desk_writing", name: "Writing Desk", category: "table", subtypes: ["desk", "writing_desk"], styles: ["modern", "scandinavian"], tags: ["desk", "office"], defaultDims: { w: 1.20, h: 0.75, d: 0.55 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_RECT) },

  // ════ F. CONSOLE TABLES (8) ════════════════════════════
  { id: "console_slim", name: "Slim Console Table", category: "table", subtypes: ["console_table", "entry_table"], styles: ["modern", "minimalist"], tags: ["slim", "entry"], defaultDims: { w: 1.20, h: 0.78, d: 0.35 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_RECT) },
  { id: "console_shelf", name: "Console Table with Shelf", category: "table", subtypes: ["console_table"], styles: ["modern", "industrial"], tags: ["shelf", "entry"], defaultDims: { w: 1.20, h: 0.78, d: 0.35 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_SHELF) },

  // ════ G. TV UNITS (10) ═════════════════════════════════
  { id: "tv_low_modern", name: "Low TV Unit", category: "cabinet", subtypes: ["tv_unit", "media_console"], styles: ["modern", "minimalist"], tags: ["low", "media"], defaultDims: { w: 1.60, h: 0.50, d: 0.40 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 1, 0, 0.08) },
  { id: "tv_drawers", name: "TV Console with Drawers", category: "cabinet", subtypes: ["tv_unit", "media_console"], styles: ["modern", "scandinavian"], tags: ["drawers", "media"], defaultDims: { w: 1.80, h: 0.55, d: 0.42 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 0, 2, 0.10) },
  { id: "tv_wide", name: "Extra-Wide TV Unit", category: "cabinet", subtypes: ["tv_unit", "media_console"], styles: ["modern"], tags: ["wide", "media"], defaultDims: { w: 2.20, h: 0.50, d: 0.42 }, defaultMaterial: "walnut", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 1, 2, 0.06) },

  // ════ H. BOOKSHELVES (12) ══════════════════════════════
  { id: "bookshelf_tall", name: "Tall Bookshelf", category: "shelf", subtypes: ["bookshelf", "bookcase"], styles: ["modern", "scandinavian"], tags: ["tall", "open"], defaultDims: { w: 0.80, h: 1.80, d: 0.30 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildShelf(w, h, d, m, 5) },
  { id: "bookshelf_low", name: "Low Bookshelf", category: "shelf", subtypes: ["bookshelf", "bookcase"], styles: ["modern"], tags: ["low", "open"], defaultDims: { w: 0.80, h: 0.90, d: 0.30 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildShelf(w, h, d, m, 2) },
  { id: "shelf_cube_4", name: "4-Cell Cube Shelf", category: "shelf", subtypes: ["shelving_unit", "cube_shelf"], styles: ["modern", "minimalist"], tags: ["cube", "modular"], defaultDims: { w: 0.75, h: 0.75, d: 0.30 }, defaultMaterial: "melamine_white", buildPanels: (w, h, d, m) => buildShelf(w, h, d, m, 1) },
  { id: "shelf_wide", name: "Wide Shelving Unit", category: "shelf", subtypes: ["shelving_unit", "bookshelf"], styles: ["modern", "industrial"], tags: ["wide"], defaultDims: { w: 1.50, h: 1.80, d: 0.35 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildShelf(w, h, d, m, 4) },

  // ════ I. CABINETS / SIDEBOARDS (12) ════════════════════
  { id: "sideboard_3door", name: "3-Door Sideboard", category: "cabinet", subtypes: ["sideboard", "buffet", "credenza"], styles: ["modern", "scandinavian"], tags: ["doors", "dining"], defaultDims: { w: 1.50, h: 0.80, d: 0.45 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 2, 0, 0.12) },
  { id: "cabinet_tall", name: "Tall Cabinet", category: "cabinet", subtypes: ["cabinet", "pantry", "wardrobe"], styles: ["modern", "scandinavian"], tags: ["tall", "storage"], defaultDims: { w: 0.80, h: 1.80, d: 0.45 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 3, 0, 0.08) },
  { id: "dresser_6drawer", name: "6-Drawer Dresser", category: "cabinet", subtypes: ["dresser", "chest_of_drawers"], styles: ["modern", "scandinavian"], tags: ["drawers", "bedroom"], defaultDims: { w: 1.40, h: 0.80, d: 0.45 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 0, 3, 0.10) },
  { id: "dresser_3drawer", name: "3-Drawer Dresser", category: "cabinet", subtypes: ["dresser", "chest_of_drawers"], styles: ["modern"], tags: ["drawers", "bedroom"], defaultDims: { w: 1.00, h: 0.80, d: 0.45 }, defaultMaterial: "walnut", buildPanels: (w, h, d, m) => buildCabinet(w, h, d, m, 0, 3, 0.10) },

  // ════ J. BEDS (12) ═════════════════════════════════════
  { id: "bed_upholstered_queen", name: "Upholstered Bed Queen", category: "bed", subtypes: ["bed", "queen_bed", "upholstered_bed"], styles: ["modern", "contemporary"], tags: ["upholstered", "queen"], defaultDims: { w: 1.60, h: 1.10, d: 2.00 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildBed(w, h, d, m, 0.80, m, "cushion_firm") },
  { id: "bed_upholstered_king", name: "Upholstered Bed King", category: "bed", subtypes: ["bed", "king_bed", "upholstered_bed"], styles: ["modern"], tags: ["upholstered", "king"], defaultDims: { w: 1.80, h: 1.10, d: 2.00 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildBed(w, h, d, m, 0.80, m, "cushion_firm") },
  { id: "bed_upholstered_tall", name: "Tall Headboard Bed", category: "bed", subtypes: ["bed", "queen_bed"], styles: ["modern", "luxury"], tags: ["tall_headboard"], defaultDims: { w: 1.60, h: 1.40, d: 2.00 }, defaultMaterial: "fabric_charcoal", buildPanels: (w, h, d, m) => buildBed(w, h, d, m, 1.10, m, "cushion_firm") },
  { id: "bed_wood_queen", name: "Wood Bed Queen", category: "bed", subtypes: ["bed", "queen_bed", "platform_bed"], styles: ["scandinavian", "modern"], tags: ["wood", "queen"], defaultDims: { w: 1.60, h: 1.00, d: 2.00 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildBed(w, h, d, m, 0.70, m, "rounded_rect") },
  { id: "bed_wood_king", name: "Wood Bed King", category: "bed", subtypes: ["bed", "king_bed", "platform_bed"], styles: ["scandinavian"], tags: ["wood", "king"], defaultDims: { w: 1.80, h: 1.00, d: 2.00 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildBed(w, h, d, m, 0.70, m, "rounded_rect") },
  { id: "bed_single", name: "Single Bed", category: "bed", subtypes: ["bed", "single_bed", "twin_bed"], styles: ["modern", "scandinavian"], tags: ["single", "small"], defaultDims: { w: 0.90, h: 1.00, d: 2.00 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildBed(w, h, d, m, 0.70, m, "rounded_rect") },
  { id: "bed_queen_padded", name: "Queen Bed (Upholstered Headboard)", category: "bed", subtypes: ["bed", "queen_bed", "upholstered_bed"], styles: ["modern", "contemporary"], tags: ["upholstered", "queen", "library"], defaultDims: { w: 1.60, h: 1.20, d: 2.10 }, defaultMaterial: "fabric_cream", buildPanels: fromLibraryTemplate("bed_queen_padded") },
  { id: "bed_king_padded", name: "King Bed (Upholstered Headboard)", category: "bed", subtypes: ["bed", "king_bed", "upholstered_bed"], styles: ["modern"], tags: ["upholstered", "king", "library"], defaultDims: { w: 1.80, h: 1.20, d: 2.10 }, defaultMaterial: "fabric_taupe", buildPanels: fromLibraryTemplate("bed_king_padded") },
  { id: "bed_full_classic", name: "Full / Double Bed (Classic Wood)", category: "bed", subtypes: ["bed", "double_bed", "full_bed"], styles: ["classic", "scandinavian"], tags: ["wood", "double", "library"], defaultDims: { w: 1.40, h: 1.05, d: 2.00 }, defaultMaterial: "oak", buildPanels: fromLibraryTemplate("bed_full_classic") },
  { id: "bed_platform_low", name: "Low Platform Bed", category: "bed", subtypes: ["bed", "platform_bed"], styles: ["scandinavian", "minimalist"], tags: ["low", "platform", "library"], defaultDims: { w: 1.60, h: 0.92, d: 2.00 }, defaultMaterial: "oak", buildPanels: fromLibraryTemplate("bed_platform_low") },
  { id: "bed_daybed", name: "Daybed (Back + Side)", category: "bed", subtypes: ["bed", "daybed", "twin_bed"], styles: ["modern", "scandinavian"], tags: ["daybed", "library"], defaultDims: { w: 2.00, h: 0.88, d: 0.98 }, defaultMaterial: "fabric_sage", buildPanels: fromLibraryTemplate("bed_daybed") },
  { id: "bed_canopy_four_post", name: "Four-Poster Canopy Bed", category: "bed", subtypes: ["bed", "canopy_bed", "four_poster"], styles: ["classic", "luxury"], tags: ["canopy", "library"], defaultDims: { w: 1.65, h: 2.20, d: 2.15 }, defaultMaterial: "oak", buildPanels: fromLibraryTemplate("bed_canopy_four_post") },
  { id: "bed_twin_xl", name: "Twin XL Bed", category: "bed", subtypes: ["bed", "twin_bed", "twin_xl"], styles: ["modern"], tags: ["twin", "xl", "library"], defaultDims: { w: 0.99, h: 1.00, d: 2.03 }, defaultMaterial: "oak", buildPanels: fromLibraryTemplate("bed_twin_xl") },

  // ════ L. DESKS (6) ═════════════════════════════════════
  { id: "desk_compact", name: "Compact Desk", category: "table", subtypes: ["desk", "writing_desk", "computer_desk"], styles: ["modern", "minimalist"], tags: ["compact", "office"], defaultDims: { w: 1.00, h: 0.75, d: 0.50 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => buildTable(w, h, d, m, TABLE_RECT) },
  { id: "desk_drawer", name: "Desk with Drawer", category: "table", subtypes: ["desk", "writing_desk"], styles: ["modern", "scandinavian"], tags: ["drawer", "office"], defaultDims: { w: 1.20, h: 0.75, d: 0.55 }, defaultMaterial: "oak", buildPanels: (w, h, d, m) => { resetPid(); const t = buildTable(w, h, d, m, TABLE_RECT); t.push(p("Drawer", "vertical", "drawer_box", [0.25, 0.62, d / 2 - 0.01], [0.40, 0.08, 0.02], m)); t.push(p("Handle", "horizontal", "bar_handle", [0.25, 0.62, d / 2 + 0.02], [0.10, 0.02, 0.02], "black_metal")); return t; } },

  // ════ M. LIGHTING (10) ═════════════════════════════════
  { id: "lamp_floor_arc", name: "Arc Floor Lamp", category: "lamp", subtypes: ["floor_lamp"], styles: ["modern"], tags: ["arc", "tall"], defaultDims: { w: 0.40, h: 1.80, d: 0.40 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildLamp(w, h, d, m) },
  { id: "lamp_table_ceramic", name: "Ceramic Table Lamp", category: "lamp", subtypes: ["table_lamp"], styles: ["modern", "contemporary"], tags: ["ceramic", "small"], defaultDims: { w: 0.25, h: 0.50, d: 0.25 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildLamp(w, h, d, m) },

  // ════ N. RUGS (6) ══════════════════════════════════════
  { id: "rug_rect_neutral", name: "Rectangular Neutral Rug", category: "rug", subtypes: ["rug", "area_rug"], styles: ["modern", "scandinavian"], tags: ["rectangular", "neutral"], defaultDims: { w: 2.00, h: 0.01, d: 1.40 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => buildRug(w, h, d, m) },
  { id: "rug_round_neutral", name: "Round Neutral Rug", category: "rug", subtypes: ["rug", "area_rug"], styles: ["modern"], tags: ["round", "neutral"], defaultDims: { w: 1.50, h: 0.01, d: 1.50 }, defaultMaterial: "fabric_taupe", buildPanels: (w, h, d, m) => { resetPid(); return [p("Rug", "horizontal", "circle_panel", [0, 0.005, 0], [w, 0.01, d], m)]; } },

  // ════ O. SOFT ACCESSORIES (6) ══════════════════════════
  { id: "pillow_square", name: "Square Throw Pillow", category: "accessory", subtypes: ["pillow", "throw_pillow"], styles: ["modern"], tags: ["square", "accent"], defaultDims: { w: 0.45, h: 0.45, d: 0.13 }, defaultMaterial: "fabric_taupe", buildPanels: (w, h, d, m) => buildPillow(w, h, d, m) },
  { id: "pillow_lumbar", name: "Lumbar Pillow", category: "accessory", subtypes: ["pillow", "lumbar_pillow"], styles: ["modern"], tags: ["lumbar", "long"], defaultDims: { w: 0.55, h: 0.30, d: 0.12 }, defaultMaterial: "fabric_sage", buildPanels: (w, h, d, m) => buildPillow(w, h, d, m) },
  { id: "throw_folded", name: "Folded Throw Blanket", category: "accessory", subtypes: ["throw", "blanket"], styles: ["modern"], tags: ["folded"], defaultDims: { w: 0.50, h: 0.08, d: 0.35 }, defaultMaterial: "fabric_taupe", buildPanels: (w, h, d, m) => buildThrow(w, h, d, m) },
  { id: "bolster", name: "Bolster Cushion", category: "accessory", subtypes: ["bolster", "cushion"], styles: ["modern"], tags: ["cylindrical"], defaultDims: { w: 0.50, h: 0.18, d: 0.18 }, defaultMaterial: "fabric_cream", buildPanels: (w, h, d, m) => { resetPid(); return [p("Bolster", "horizontal", "cushion_bolster", [0, h / 2, 0], [w, h, d], m)]; } },

  // ════ P. OUTDOOR / PATIO ═══════════════════════════════
  { id: "outdoor_dining_table", name: "Outdoor Dining Table", category: "outdoor", subtypes: ["outdoor_table", "patio_table", "dining_table"], styles: ["modern", "contemporary"], tags: ["teak", "patio", "dining"], defaultDims: { w: 1.80, h: 0.75, d: 0.90 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_dining_table") },
  { id: "outdoor_coffee_table", name: "Outdoor Coffee Table", category: "outdoor", subtypes: ["coffee_table", "patio_table", "low_table"], styles: ["modern", "scandinavian"], tags: ["teak", "patio"], defaultDims: { w: 1.10, h: 0.42, d: 0.60 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_coffee_table") },
  { id: "outdoor_bench", name: "Outdoor Bench", category: "outdoor", subtypes: ["bench", "garden_bench", "patio_bench"], styles: ["modern", "rustic"], tags: ["teak", "seating"], defaultDims: { w: 1.40, h: 0.45, d: 0.40 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_bench") },
  { id: "outdoor_chaise_lounge", name: "Outdoor Chaise Lounge", category: "outdoor", subtypes: ["chaise", "lounger", "sun_lounger"], styles: ["modern", "contemporary"], tags: ["patio", "pool"], defaultDims: { w: 0.75, h: 0.85, d: 2.00 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_chaise_lounge") },
  { id: "outdoor_dining_chair", name: "Outdoor Dining Chair", category: "outdoor", subtypes: ["outdoor_chair", "patio_chair", "dining_chair"], styles: ["modern"], tags: ["stackable", "teak"], defaultDims: { w: 0.56, h: 0.88, d: 0.58 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_dining_chair") },
  { id: "outdoor_bar_table", name: "Outdoor Bar Table", category: "outdoor", subtypes: ["bar_table", "pub_table", "high_table"], styles: ["modern"], tags: ["bar", "patio"], defaultDims: { w: 0.75, h: 1.05, d: 0.75 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_bar_table") },
  { id: "outdoor_bar_stool", name: "Outdoor Bar Stool", category: "outdoor", subtypes: ["bar_stool", "counter_stool"], styles: ["modern", "industrial"], tags: ["bar", "metal"], defaultDims: { w: 0.40, h: 0.75, d: 0.40 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_bar_stool") },
  { id: "outdoor_planter_box", name: "Outdoor Planter Box", category: "outdoor", subtypes: ["planter", "garden_box"], styles: ["modern", "rustic"], tags: ["garden", "wood"], defaultDims: { w: 0.90, h: 0.40, d: 0.40 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_planter_box") },
  { id: "outdoor_sofa_2seat", name: "Outdoor 2-Seat Sofa", category: "outdoor", subtypes: ["outdoor_sofa", "patio_sofa", "loveseat"], styles: ["modern", "contemporary"], tags: ["wicker_style", "cushions"], defaultDims: { w: 1.60, h: 0.82, d: 0.82 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_sofa_2seat") },
  { id: "outdoor_side_table", name: "Outdoor Side Table", category: "outdoor", subtypes: ["side_table", "accent_table", "patio_table"], styles: ["modern"], tags: ["round", "small"], defaultDims: { w: 0.50, h: 0.52, d: 0.50 }, defaultMaterial: "teak", buildPanels: fromLibraryTemplate("outdoor_side_table") },
];

// ═════════════════════════════════════════════════════════
// TEMPLATE MATCHING
// ═════════════════════════════════════════════════════════

export function matchTemplate(classification: FurnitureClassification): {
  template: TemplateVariant;
  panels: PanelData[];
  dims: { w: number; h: number; d: number };
} {
  const { category, subtype, style, material } = classification;
  const cat = category.toLowerCase();
  const sub = subtype.toLowerCase().replace(/[-\s]/g, "_");
  const sty = style.toLowerCase();

  let bestTemplate = TEMPLATE_REGISTRY[0];
  let bestScore = -1;

  for (const tmpl of TEMPLATE_REGISTRY) {
    let score = 0;

    // Category match
    if (tmpl.category === cat) score += 100;
    else if ((cat === "sofa" || cat === "couch") && tmpl.category === "sofa") score += 100;
    else if ((cat === "chair" || cat === "armchair") && tmpl.category === "chair") score += 80;
    else if (cat === "sofa" && tmpl.category === "chair") score += 30;
    else if (cat === "desk" && tmpl.category === "table") score += 60;
    else if (
      (cat === "outdoor" || cat === "patio" || cat === "garden" || cat === "deck" || cat === "terrace") &&
      tmpl.category === "outdoor"
    )
      score += 100;
    else continue;

    // Subtype match
    for (const st of tmpl.subtypes) {
      if (sub.includes(st) || st.includes(sub)) { score += 50; break; }
    }

    // Style match
    for (const s of tmpl.styles) {
      if (sty.includes(s) || s.includes(sty)) { score += 25; break; }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = tmpl;
    }
  }

  const dims = { ...bestTemplate.defaultDims };

  // Apply estimated dims from classification if reasonable
  if (classification.estimatedDims) {
    const ed = classification.estimatedDims;
    if (ed.w > 100 && ed.w < 5000) dims.w = ed.w / 1000;
    if (ed.h > 100 && ed.h < 3000) dims.h = ed.h / 1000;
    if (ed.d > 100 && ed.d < 5000) dims.d = ed.d / 1000;
  }

  // Determine material
  const mat = material || bestTemplate.defaultMaterial;

  const panels = bestTemplate.buildPanels(dims.w, dims.h, dims.d, mat);

  // Apply softness from classification to all upholstery panels
  const softnessStr = (classification as Record<string, unknown>).softness as string | undefined;
  if (softnessStr) {
    const softnessMap: Record<string, number> = { firm: 0.15, medium: 0.45, plush: 0.85 };
    const softnessVal = softnessMap[softnessStr] ?? 0.45;
    for (const panel of panels) {
      const shape = panel.shape ?? "box";
      if (shape === "cushion" || shape === "cushion_firm" || shape === "padded_block") {
        panel.shapeParams = { ...(panel.shapeParams ?? {}), softness: softnessVal };
      }
    }
  }

  return { template: bestTemplate, panels, dims };
}
