// ─── Furniture Template Library ──────────────────────────
import type { PanelData, PanelShape } from "./furnitureData";

export interface LibraryTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  dims: { w: number; h: number; d: number };
  buildPanels: (dims: { w: number; h: number; d: number }) => PanelData[];
}

export const LIBRARY_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "seating", label: "Sofas & Seating", icon: "🛋️" },
  { id: "chairs", label: "Chairs", icon: "🪑" },
  { id: "tables", label: "Tables", icon: "🍽️" },
  { id: "desks", label: "Desks", icon: "🖥️" },
  { id: "cabinets", label: "Cabinets", icon: "🗄️" },
  { id: "bookshelves", label: "Bookshelves", icon: "📚" },
  { id: "wardrobes", label: "Wardrobes", icon: "👔" },
  { id: "dressers", label: "Dressers & Stands", icon: "📺" },
  { id: "beds", label: "Beds", icon: "🛏️" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "bathroom", label: "Bathroom", icon: "🚿" },
  { id: "outdoor", label: "Outdoor", icon: "🌿" },
];

// ─── Helpers ────────────────────────────────────────────

let _pid = 0;
function pid(): string { return `p${++_pid}`; }

function box(
  label: string,
  type: PanelData["type"],
  pos: [number, number, number],
  size: [number, number, number],
  mat = "oak",
): PanelData {
  return { id: pid(), type, label, position: pos, size, materialId: mat };
}

/** Plush puffy cushion — throw pillows, loose sofa cushions (puff=0.85) */
function cushion(
  label: string,
  type: PanelData["type"],
  pos: [number, number, number],
  size: [number, number, number],
  mat = "fabric_cream",
  rotation?: [number, number, number],
): PanelData {
  return { id: pid(), type, shape: "cushion" as PanelShape, label, position: pos, size, materialId: mat, ...(rotation ? { rotation } : {}) };
}

/** Firm cushion — structured seat/back cushions (puff=0.35) */
function firmCushion(
  label: string,
  type: PanelData["type"],
  pos: [number, number, number],
  size: [number, number, number],
  mat = "fabric_cream",
  rotation?: [number, number, number],
): PanelData {
  return { id: pid(), type, shape: "cushion_firm" as PanelShape, label, position: pos, size, materialId: mat, ...(rotation ? { rotation } : {}) };
}

/** Padded block — arms, backrests, ottomans (puff=0.18) */
function padded(
  label: string,
  type: PanelData["type"],
  pos: [number, number, number],
  size: [number, number, number],
  mat = "fabric_cream",
  rotation?: [number, number, number],
): PanelData {
  return { id: pid(), type, shape: "padded_block" as PanelShape, label, position: pos, size, materialId: mat, ...(rotation ? { rotation } : {}) };
}

/** Hidden structural base */
function plinth(
  label: string,
  pos: [number, number, number],
  size: [number, number, number],
  mat = "melamine_black",
): PanelData {
  return { id: pid(), type: "horizontal", shape: "rounded_rect" as PanelShape, label, position: pos, size, materialId: mat, shapeParams: { cornerRadius: 0.002 } };
}

function cyl(
  label: string,
  pos: [number, number, number],
  diameter: number,
  height: number,
  mat = "black_metal",
): PanelData {
  return {
    id: pid(),
    type: "vertical",
    shape: "cylinder" as PanelShape,
    label,
    position: pos,
    size: [diameter, height, diameter],
    materialId: mat,
  };
}

function cone(
  label: string,
  pos: [number, number, number],
  diameter: number,
  height: number,
  mat = "oak",
): PanelData {
  return {
    id: pid(),
    type: "vertical",
    shape: "cone" as PanelShape,
    label,
    position: pos,
    size: [diameter, height, diameter],
    materialId: mat,
  };
}

function sphere(
  label: string,
  pos: [number, number, number],
  diameter: number,
  mat = "chrome",
): PanelData {
  return {
    id: pid(),
    type: "vertical",
    shape: "sphere" as PanelShape,
    label,
    position: pos,
    size: [diameter, diameter, diameter],
    materialId: mat,
  };
}

// Standard thicknesses (meters)
const T = 0.018;   // panel thickness
const TB = 0.006;  // back panel thickness
const TC = 0.030;  // countertop thickness

/** 4 cylindrical legs inset from corners */
function fourLegsInset(w: number, h: number, d: number, legH: number, dia = 0.04, inset = 0.06, mat = "black_metal"): PanelData[] {
  const y = legH / 2;
  return [
    cyl("Leg FL", [-w/2 + inset, y, -d/2 + inset], dia, legH, mat),
    cyl("Leg FR", [w/2 - inset, y, -d/2 + inset], dia, legH, mat),
    cyl("Leg BL", [-w/2 + inset, y, d/2 - inset], dia, legH, mat),
    cyl("Leg BR", [w/2 - inset, y, d/2 - inset], dia, legH, mat),
  ];
}

/** Plush retro office swivel chair: plaid cushions, 5-star base, gas column, arm tubes + bamboo pads. Caller must set `_pid = 0`. */
function buildOfficePlaidRetroChair(
  dims: { w: number; h: number; d: number },
  variant: "blue" | "olive",
): PanelData[] {
  const w = dims.w / 1000;
  const h = dims.h / 1000;
  const d = dims.d / 1000;
  const fabric = variant === "blue" ? "fabric_plaid_blue" : "fabric_plaid_olive";
  const frame = variant === "blue" ? "paint_slate_blue" : "paint_olive_metal";
  const seatPanY = 0.488;
  const cushionT = 0.098;
  const seatCY = seatPanY + cushionT / 2;
  const sw = Math.min(w * 0.8, 0.56);
  const sd = Math.min(d * 0.74, 0.52);
  const backH = Math.max(0.38, Math.min(0.54, h - seatPanY - cushionT - 0.09));
  const backD = 0.092;
  const backZ = -sd / 2 + backD / 2 + 0.016;
  const backY = seatPanY + cushionT + backH / 2;
  const hubH = 0.1;
  const hubY = hubH / 2;
  const liftBot = hubH + 0.025;
  const liftTop = seatPanY - 0.058;
  const liftH = Math.max(0.24, liftTop - liftBot);
  const liftCy = liftBot + liftH / 2;
  const mechY = seatPanY - 0.034;
  const R = Math.min(0.3, Math.min(w, d) * 0.44);
  const armRestY = seatCY + 0.042;
  const armUprightH = armRestY - seatPanY + 0.055;
  const armUprightCY = seatPanY + armUprightH / 2 - 0.02;
  const ax = sw / 2 + 0.024;

  const out: PanelData[] = [
    cyl("Base Hub", [0, hubY, 0], 0.076, hubH, frame),
    cyl("Gas Lift", [0, liftCy, 0], 0.05, liftH, frame),
    cyl("Seat Mechanism", [0, mechY, 0], 0.142, 0.036, frame),
  ];

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    out.push(cyl(`Star Leg ${i + 1}`, [x, 0.056, z], 0.024, 0.098, frame));
    out.push(cyl(`Caster ${i + 1}`, [x, 0.011, z], 0.034, 0.018, "black_metal"));
  }

  out.push(
    box("Arm Upright L", "vertical", [-ax, armUprightCY, 0.055], [0.022, armUprightH, 0.022], frame),
    box("Arm Upright R", "vertical", [ax, armUprightCY, 0.055], [0.022, armUprightH, 0.022], frame),
    box("Arm Bar L", "horizontal", [-ax + 0.072, armRestY - 0.008, 0.125], [0.13, 0.02, 0.02], frame),
    box("Arm Bar R", "horizontal", [ax - 0.072, armRestY - 0.008, 0.125], [0.13, 0.02, 0.02], frame),
    box("Arm Pad L", "horizontal", [-ax, armRestY, 0.125], [0.05, 0.015, 0.068], "bamboo"),
    box("Arm Pad R", "horizontal", [ax, armRestY, 0.125], [0.05, 0.015, 0.068], "bamboo"),
    box("Tilt Lever", "horizontal", [0.055, seatPanY - 0.018, sd / 2 - 0.028], [0.065, 0.011, 0.014], "black_metal"),
    {
      id: pid(),
      type: "horizontal",
      shape: "cushion" as PanelShape,
      label: "Seat Cushion",
      position: [0, seatCY, 0.028],
      size: [sw, cushionT, sd],
      materialId: fabric,
    },
    {
      id: pid(),
      type: "vertical",
      shape: "cushion" as PanelShape,
      label: "Seat Back",
      position: [0, backY, backZ],
      size: [sw - 0.024, backH, backD],
      materialId: fabric,
    },
  );

  return out;
}

// ─── Templates ──────────────────────────────────────────

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [

  // ════════════════════════════════════════════════════════
  // TABLES
  // ════════════════════════════════════════════════════════

  {
    id: "table_dining_4leg",
    name: "Dining Table (4 Leg)",
    category: "tables",
    icon: "🍽️",
    description: "Simple dining table with 4 cylindrical legs and rectangular top",
    dims: { w: 1600, h: 750, d: 900 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legD = 0.05, legH = h - TC;
      const inset = 0.06;
      return [
        box("Top", "horizontal", [0, h - TC / 2, 0], [w, TC, d]),
        cyl("Leg FL", [-w / 2 + inset, legH / 2, d / 2 - inset], legD, legH),
        cyl("Leg FR", [w / 2 - inset, legH / 2, d / 2 - inset], legD, legH),
        cyl("Leg BL", [-w / 2 + inset, legH / 2, -d / 2 + inset], legD, legH),
        cyl("Leg BR", [w / 2 - inset, legH / 2, -d / 2 + inset], legD, legH),
      ];
    },
  },

  {
    id: "table_desk_side_shelf",
    name: "Desk with Side Shelf",
    category: "tables",
    icon: "🖥️",
    description: "Desk with a side shelf unit on one side",
    dims: { w: 1400, h: 750, d: 700 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const shelfW = 0.40;
      return [
        // Desktop
        box("Top", "horizontal", [0, h - T / 2, 0], [w, T, d]),
        // Left side panel (full height)
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        // Right side panel (full height)
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        // Shelf 1 (lower)
        box("Shelf 1", "horizontal", [-w / 2 + shelfW / 2 + T, h * 0.3, 0], [shelfW, T, d]),
        // Shelf 2 (upper, near desktop)
        box("Shelf 2", "horizontal", [-w / 2 + shelfW / 2 + T, h * 0.6, 0], [shelfW, T, d]),
      ];
    },
  },

  {
    id: "table_desk_back_shelf",
    name: "Desk with Back Shelf",
    category: "tables",
    icon: "📚",
    description: "Desk with a back shelf attachment rising above the desktop",
    dims: { w: 1400, h: 1200, d: 700 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const deskH = 0.75;
      const shelfD = 0.25;
      const legD = 0.05;
      return [
        // Desktop
        box("Top", "horizontal", [0, deskH - T / 2, 0], [w, T, d]),
        // 4 legs
        cyl("Leg FL", [-w / 2 + 0.06, (deskH - T) / 2, d / 2 - 0.06], legD, deskH - T),
        cyl("Leg FR", [w / 2 - 0.06, (deskH - T) / 2, d / 2 - 0.06], legD, deskH - T),
        cyl("Leg BL", [-w / 2 + 0.06, (deskH - T) / 2, -d / 2 + 0.06], legD, deskH - T),
        cyl("Leg BR", [w / 2 - 0.06, (deskH - T) / 2, -d / 2 + 0.06], legD, deskH - T),
        // Back shelf uprights
        box("Left Upright", "vertical", [-w / 2 + T / 2, (deskH + h) / 2, -d / 2 + shelfD / 2], [T, h - deskH, shelfD]),
        box("Right Upright", "vertical", [w / 2 - T / 2, (deskH + h) / 2, -d / 2 + shelfD / 2], [T, h - deskH, shelfD]),
        // 3 shelves above desktop
        box("Shelf 1", "horizontal", [0, deskH + (h - deskH) * 0.33, -d / 2 + shelfD / 2], [w - T * 2, T, shelfD]),
        box("Shelf 2", "horizontal", [0, deskH + (h - deskH) * 0.66, -d / 2 + shelfD / 2], [w - T * 2, T, shelfD]),
        box("Shelf 3", "horizontal", [0, h - T / 2, -d / 2 + shelfD / 2], [w - T * 2, T, shelfD]),
      ];
    },
  },

  {
    id: "table_coffee_slab",
    name: "Coffee Table (Slab)",
    category: "tables",
    icon: "☕",
    description: "Coffee table with thick top and 2 vertical slab sides",
    dims: { w: 1200, h: 450, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const topT = 0.04;
      return [
        box("Top", "horizontal", [0, h - topT / 2, 0], [w, topT, d]),
        box("Left Slab", "vertical", [-w / 2 + T + 0.02, (h - topT) / 2, 0], [T * 2, h - topT, d * 0.85]),
        box("Right Slab", "vertical", [w / 2 - T - 0.02, (h - topT) / 2, 0], [T * 2, h - topT, d * 0.85]),
      ];
    },
  },

  {
    id: "table_coffee_4leg",
    name: "Coffee Table (4 Leg)",
    category: "tables",
    icon: "☕",
    description: "Coffee table with 4 short cylindrical legs",
    dims: { w: 1200, h: 450, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legD = 0.04, legH = h - TC;
      const inset = 0.05;
      return [
        box("Top", "horizontal", [0, h - TC / 2, 0], [w, TC, d]),
        cyl("Leg FL", [-w / 2 + inset, legH / 2, d / 2 - inset], legD, legH),
        cyl("Leg FR", [w / 2 - inset, legH / 2, d / 2 - inset], legD, legH),
        cyl("Leg BL", [-w / 2 + inset, legH / 2, -d / 2 + inset], legD, legH),
        cyl("Leg BR", [w / 2 - inset, legH / 2, -d / 2 + inset], legD, legH),
      ];
    },
  },

  {
    id: "table_conference",
    name: "Conference Table",
    category: "tables",
    icon: "🤝",
    description: "Long conference table with 2 wide panel legs",
    dims: { w: 3000, h: 750, d: 1200 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const topT = 0.035;
      const legW = 0.08, legD = d * 0.6, legH = h - topT;
      const inset = w * 0.2;
      return [
        box("Top", "horizontal", [0, h - topT / 2, 0], [w, topT, d]),
        box("Left Panel Leg", "vertical", [-w / 2 + inset, legH / 2, 0], [legW, legH, legD]),
        box("Right Panel Leg", "vertical", [w / 2 - inset, legH / 2, 0], [legW, legH, legD]),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // CABINETS
  // ════════════════════════════════════════════════════════

  {
    id: "cabinet_tall_2door",
    name: "Tall Cabinet (2 Door)",
    category: "cabinets",
    icon: "🗄️",
    description: "Tall cabinet with 2 doors, 2 internal shelves",
    dims: { w: 800, h: 1800, d: 400 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const doorW = iw / 2;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        box("Shelf 1", "horizontal", [0, h * 0.35, 0], [iw, T, d - TB]),
        box("Shelf 2", "horizontal", [0, h * 0.65, 0], [iw, T, d - TB]),
        box("Left Door", "vertical", [-doorW / 2, h / 2, d / 2 - T / 2], [doorW, h - T * 2, T]),
        box("Right Door", "vertical", [doorW / 2, h / 2, d / 2 - T / 2], [doorW, h - T * 2, T]),
      ];
    },
  },

  {
    id: "cabinet_wall_1door",
    name: "Wall Cabinet (1 Door)",
    category: "cabinets",
    icon: "🗄️",
    description: "Small wall-mounted cabinet with 1 door and 1 shelf",
    dims: { w: 600, h: 600, d: 300 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        box("Shelf", "horizontal", [0, h / 2, 0], [iw, T, d - TB]),
        box("Door", "vertical", [0, h / 2, d / 2 - T / 2], [iw, h - T * 2, T]),
      ];
    },
  },

  {
    id: "cabinet_open_shelving",
    name: "Open Shelving Unit",
    category: "cabinets",
    icon: "📚",
    description: "Open shelving with 5 shelves and back panel, no doors",
    dims: { w: 800, h: 1800, d: 300 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const panels: PanelData[] = [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
      ];
      for (let i = 1; i <= 5; i++) {
        const y = T + (h - T * 2) * (i / 6);
        panels.push(box(`Shelf ${i}`, "horizontal", [0, y, 0], [iw, T, d - TB]));
      }
      return panels;
    },
  },

  {
    id: "cabinet_glass_door",
    name: "Display Cabinet (Glass)",
    category: "cabinets",
    icon: "✨",
    description: "Tall display cabinet with glass door",
    dims: { w: 800, h: 1800, d: 400 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        box("Shelf 1", "horizontal", [0, h * 0.33, 0], [iw, T, d - TB]),
        box("Shelf 2", "horizontal", [0, h * 0.66, 0], [iw, T, d - TB]),
        box("Glass Door", "vertical", [0, h / 2, d / 2 - T / 2], [iw, h - T * 2, T * 0.5], "glass"),
      ];
    },
  },

  {
    id: "cabinet_corner",
    name: "Corner Cabinet",
    category: "cabinets",
    icon: "📐",
    description: "L-shaped corner cabinet with angled door",
    dims: { w: 800, h: 1800, d: 800 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [
        // Two back walls forming L
        box("Back Wall 1", "back", [-w / 2 + TB / 2, h / 2, 0], [TB, h, d], "plywood"),
        box("Back Wall 2", "back", [0, h / 2, -d / 2 + TB / 2], [w, h, TB], "plywood"),
        // Top & bottom
        box("Top", "horizontal", [0, h - T / 2, 0], [w, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [w, T, d]),
        // Shelf
        box("Shelf", "horizontal", [0, h * 0.5, 0], [w - TB, T, d - TB]),
        // Front side panels
        box("Front Side Left", "vertical", [-w / 2 + 0.15, h / 2, d / 2 - T / 2], [0.15, h, T]),
        box("Front Side Right", "vertical", [w / 2 - T / 2, h / 2, -d / 2 + 0.15], [T, h, 0.15]),
        // Angled door
        box("Door", "vertical", [0, h / 2, d / 4], [w * 0.55, h - T * 2, T]),
      ];
    },
  },

  {
    id: "cabinet_drawers",
    name: "Cabinet with 4 Drawers",
    category: "cabinets",
    icon: "🗃️",
    description: "Cabinet with 4 drawer fronts",
    dims: { w: 600, h: 1200, d: 500 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const ih = h - T * 2;
      const drawerH = ih / 4;
      const panels: PanelData[] = [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, ih, TB], "plywood"),
      ];
      for (let i = 0; i < 4; i++) {
        const y = T + drawerH * (i + 0.5);
        panels.push(box(`Drawer ${i + 1}`, "vertical", [0, y, d / 2 - T / 2], [iw, drawerH - 0.003, T]));
      }
      return panels;
    },
  },

  // ════════════════════════════════════════════════════════
  // WARDROBES
  // ════════════════════════════════════════════════════════

  {
    id: "wardrobe_2door",
    name: "2-Door Wardrobe",
    category: "wardrobes",
    icon: "👔",
    description: "Standard 2-door wardrobe with hanging rail and upper shelf",
    dims: { w: 1000, h: 2200, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const doorW = iw / 2;
      const railY = h * 0.75;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        // Upper shelf
        box("Upper Shelf", "horizontal", [0, h * 0.82, 0], [iw, T, d - TB]),
        // Hanging rail
        cyl("Hanging Rail", [0, railY, 0], 0.025, iw, "chrome"),
        // 2 doors
        box("Left Door", "vertical", [-doorW / 2, h / 2, d / 2 - T / 2], [doorW, h - T * 2, T]),
        box("Right Door", "vertical", [doorW / 2, h / 2, d / 2 - T / 2], [doorW, h - T * 2, T]),
      ];
    },
  },

  {
    id: "wardrobe_3door",
    name: "3-Door Wardrobe",
    category: "wardrobes",
    icon: "👔",
    description: "Wide 3-door wardrobe with internal divider and 2 hanging sections",
    dims: { w: 1500, h: 2200, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const doorW = iw / 3;
      const railY = h * 0.75;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        // Internal divider
        box("Divider", "vertical", [0, h / 2, 0], [T, h - T * 2, d - TB]),
        // Upper shelves
        box("Upper Shelf L", "horizontal", [-iw / 4, h * 0.82, 0], [iw / 2 - T, T, d - TB]),
        box("Upper Shelf R", "horizontal", [iw / 4, h * 0.82, 0], [iw / 2 - T, T, d - TB]),
        // Hanging rails
        cyl("Hanging Rail L", [-iw / 4, railY, 0], 0.025, iw / 2 - T, "chrome"),
        cyl("Hanging Rail R", [iw / 4, railY, 0], 0.025, iw / 2 - T, "chrome"),
        // 3 doors
        box("Left Door", "vertical", [-doorW, h / 2, d / 2 - T / 2], [doorW, h - T * 2, T]),
        box("Center Door", "vertical", [0, h / 2, d / 2 - T / 2], [doorW, h - T * 2, T]),
        box("Right Door", "vertical", [doorW, h / 2, d / 2 - T / 2], [doorW, h - T * 2, T]),
      ];
    },
  },

  {
    id: "wardrobe_sliding",
    name: "Sliding Door Wardrobe",
    category: "wardrobes",
    icon: "👔",
    description: "Wardrobe with 2 sliding doors that overlap at center",
    dims: { w: 1800, h: 2200, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const doorW = iw * 0.52;
      const railY = h * 0.75;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        box("Upper Shelf", "horizontal", [0, h * 0.82, 0], [iw, T, d - TB]),
        cyl("Hanging Rail", [0, railY, 0], 0.025, iw, "chrome"),
        // Sliding doors (slightly overlapping, front/back offset)
        box("Sliding Door Left", "vertical", [-iw / 4, h / 2, d / 2 - T], [doorW, h - T * 2, T]),
        box("Sliding Door Right", "vertical", [iw / 4, h / 2, d / 2 - T / 2], [doorW, h - T * 2, T]),
      ];
    },
  },

  {
    id: "wardrobe_open",
    name: "Open Wardrobe",
    category: "wardrobes",
    icon: "👔",
    description: "Open wardrobe with visible hanging rail, shelves, and shoe shelf",
    dims: { w: 1200, h: 2000, d: 500 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        // Shoe shelf at bottom
        box("Shoe Shelf", "horizontal", [0, 0.15, 0], [iw, T, d - TB]),
        // Middle shelf
        box("Middle Shelf", "horizontal", [0, h * 0.45, 0], [iw, T, d - TB]),
        // Upper shelf
        box("Upper Shelf", "horizontal", [0, h * 0.82, 0], [iw, T, d - TB]),
        // Hanging rail
        cyl("Hanging Rail", [0, h * 0.70, 0], 0.025, iw, "chrome"),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // DRESSERS & STANDS
  // ════════════════════════════════════════════════════════

  {
    id: "dresser_tv_unit",
    name: "TV Unit",
    category: "dressers",
    icon: "📺",
    description: "Long low TV cabinet with 2 compartments and 2 doors",
    dims: { w: 1800, h: 500, d: 400 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = 0.08;
      const bodyH = h - legH;
      const iw = w - T * 2;
      const doorW = iw / 2 - T / 2;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, legH + bodyH / 2, 0], [T, bodyH, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, legH + bodyH / 2, 0], [T, bodyH, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, legH + T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, legH + bodyH / 2, -d / 2 + TB / 2], [iw, bodyH - T * 2, TB], "plywood"),
        // Center divider
        box("Divider", "vertical", [0, legH + bodyH / 2, 0], [T, bodyH - T * 2, d - TB]),
        // Shelf in each compartment
        box("Shelf L", "horizontal", [-iw / 4, legH + bodyH * 0.5, 0], [iw / 2 - T, T, d - TB]),
        box("Shelf R", "horizontal", [iw / 4, legH + bodyH * 0.5, 0], [iw / 2 - T, T, d - TB]),
        // Doors
        box("Left Door", "vertical", [-iw / 4, legH + bodyH / 2, d / 2 - T / 2], [doorW, bodyH - T * 2, T]),
        box("Right Door", "vertical", [iw / 4, legH + bodyH / 2, d / 2 - T / 2], [doorW, bodyH - T * 2, T]),
        // Short legs
        cyl("Leg FL", [-w / 2 + 0.05, legH / 2, d / 2 - 0.05], 0.03, legH),
        cyl("Leg FR", [w / 2 - 0.05, legH / 2, d / 2 - 0.05], 0.03, legH),
        cyl("Leg BL", [-w / 2 + 0.05, legH / 2, -d / 2 + 0.05], 0.03, legH),
        cyl("Leg BR", [w / 2 - 0.05, legH / 2, -d / 2 + 0.05], 0.03, legH),
      ];
    },
  },

  {
    id: "dresser_3drawer",
    name: "3-Drawer Dresser",
    category: "dressers",
    icon: "🗄️",
    description: "Dresser with 3 drawers and short legs",
    dims: { w: 900, h: 800, d: 500 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = 0.10;
      const bodyH = h - legH;
      const iw = w - T * 2;
      const ih = bodyH - T * 2;
      const drawerH = ih / 3;
      const panels: PanelData[] = [
        box("Left Side", "vertical", [-w / 2 + T / 2, legH + bodyH / 2, 0], [T, bodyH, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, legH + bodyH / 2, 0], [T, bodyH, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, legH + T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, legH + bodyH / 2, -d / 2 + TB / 2], [iw, ih, TB], "plywood"),
      ];
      for (let i = 0; i < 3; i++) {
        const y = legH + T + drawerH * (i + 0.5);
        panels.push(box(`Drawer ${i + 1}`, "vertical", [0, y, d / 2 - T / 2], [iw, drawerH - 0.003, T]));
      }
      // Legs
      panels.push(cyl("Leg FL", [-w / 2 + 0.05, legH / 2, d / 2 - 0.05], 0.03, legH));
      panels.push(cyl("Leg FR", [w / 2 - 0.05, legH / 2, d / 2 - 0.05], 0.03, legH));
      panels.push(cyl("Leg BL", [-w / 2 + 0.05, legH / 2, -d / 2 + 0.05], 0.03, legH));
      panels.push(cyl("Leg BR", [w / 2 - 0.05, legH / 2, -d / 2 + 0.05], 0.03, legH));
      return panels;
    },
  },

  {
    id: "dresser_4drawer",
    name: "4-Drawer Dresser",
    category: "dressers",
    icon: "🗄️",
    description: "Taller dresser with 4 drawers and short legs",
    dims: { w: 900, h: 1000, d: 500 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = 0.10;
      const bodyH = h - legH;
      const iw = w - T * 2;
      const ih = bodyH - T * 2;
      const drawerH = ih / 4;
      const panels: PanelData[] = [
        box("Left Side", "vertical", [-w / 2 + T / 2, legH + bodyH / 2, 0], [T, bodyH, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, legH + bodyH / 2, 0], [T, bodyH, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, legH + T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, legH + bodyH / 2, -d / 2 + TB / 2], [iw, ih, TB], "plywood"),
      ];
      for (let i = 0; i < 4; i++) {
        const y = legH + T + drawerH * (i + 0.5);
        panels.push(box(`Drawer ${i + 1}`, "vertical", [0, y, d / 2 - T / 2], [iw, drawerH - 0.003, T]));
      }
      panels.push(cyl("Leg FL", [-w / 2 + 0.05, legH / 2, d / 2 - 0.05], 0.03, legH));
      panels.push(cyl("Leg FR", [w / 2 - 0.05, legH / 2, d / 2 - 0.05], 0.03, legH));
      panels.push(cyl("Leg BL", [-w / 2 + 0.05, legH / 2, -d / 2 + 0.05], 0.03, legH));
      panels.push(cyl("Leg BR", [w / 2 - 0.05, legH / 2, -d / 2 + 0.05], 0.03, legH));
      return panels;
    },
  },

  {
    id: "nightstand_1drawer",
    name: "Nightstand (1 Drawer)",
    category: "dressers",
    icon: "🛏️",
    description: "Nightstand with 1 drawer on top and open shelf below",
    dims: { w: 500, h: 550, d: 400 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = 0.10;
      const bodyH = h - legH;
      const iw = w - T * 2;
      const drawerH = bodyH * 0.35;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, legH + bodyH / 2, 0], [T, bodyH, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, legH + bodyH / 2, 0], [T, bodyH, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, legH + T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, legH + bodyH / 2, -d / 2 + TB / 2], [iw, bodyH - T * 2, TB], "plywood"),
        // Shelf divider between drawer and open area
        box("Shelf", "horizontal", [0, h - drawerH - T / 2, 0], [iw, T, d - TB]),
        // Drawer front
        box("Drawer 1", "vertical", [0, h - drawerH / 2, d / 2 - T / 2], [iw, drawerH - 0.003, T]),
        // 4 short legs
        cyl("Leg FL", [-w / 2 + 0.04, legH / 2, d / 2 - 0.04], 0.025, legH),
        cyl("Leg FR", [w / 2 - 0.04, legH / 2, d / 2 - 0.04], 0.025, legH),
        cyl("Leg BL", [-w / 2 + 0.04, legH / 2, -d / 2 + 0.04], 0.025, legH),
        cyl("Leg BR", [w / 2 - 0.04, legH / 2, -d / 2 + 0.04], 0.025, legH),
      ];
    },
  },

  {
    id: "nightstand_open",
    name: "Nightstand (Open)",
    category: "dressers",
    icon: "🛏️",
    description: "Simple nightstand with 2 open shelves, no drawers",
    dims: { w: 500, h: 550, d: 400 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        box("Shelf 1", "horizontal", [0, h * 0.35, 0], [iw, T, d - TB]),
        box("Shelf 2", "horizontal", [0, h * 0.65, 0], [iw, T, d - TB]),
      ];
    },
  },

  {
    id: "dresser_entryway",
    name: "Entryway Stand",
    category: "dressers",
    icon: "🚪",
    description: "Tall narrow unit with hooks at top and cabinet at bottom",
    dims: { w: 600, h: 1800, d: 350 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const cabinetH = 0.6;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        // Cabinet shelf (above cabinet bottom)
        box("Cabinet Shelf", "horizontal", [0, cabinetH * 0.5, 0], [iw, T, d - TB]),
        // Cabinet top divider
        box("Cabinet Top", "horizontal", [0, cabinetH, 0], [iw, T, d - TB]),
        // Cabinet door
        box("Cabinet Door", "vertical", [0, cabinetH / 2, d / 2 - T / 2], [iw, cabinetH - T, T]),
        // Hooks at top (cylinder pegs)
        cyl("Hook 1", [-w / 4, h * 0.85, d / 2 - 0.02], 0.02, 0.06, "chrome"),
        cyl("Hook 2", [0, h * 0.85, d / 2 - 0.02], 0.02, 0.06, "chrome"),
        cyl("Hook 3", [w / 4, h * 0.85, d / 2 - 0.02], 0.02, 0.06, "chrome"),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // BEDS
  // ════════════════════════════════════════════════════════

  {
    id: "bed_double",
    name: "Double Bed",
    category: "beds",
    icon: "🛏️",
    description: "Double bed with headboard, footboard, side rails, and slat base",
    dims: { w: 1600, h: 1100, d: 2100 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const baseH = 0.30;
      const railH = 0.12;
      const headH = h;
      const footH = h * 0.45;
      const slatT = 0.02;
      return [
        // Headboard
        box("Headboard", "vertical", [0, headH / 2, -d / 2 + T / 2], [w, headH, T * 1.5]),
        // Footboard
        box("Footboard", "vertical", [0, footH / 2, d / 2 - T / 2], [w, footH, T * 1.5]),
        // Side rails
        box("Left Rail", "vertical", [-w / 2 + T / 2, baseH + railH / 2, 0], [T, railH, d - T * 2]),
        box("Right Rail", "vertical", [w / 2 - T / 2, baseH + railH / 2, 0], [T, railH, d - T * 2]),
        // Slat base
        box("Slat Base", "horizontal", [0, baseH, 0], [w - T * 2, slatT, d - T * 2], "plywood"),
      ];
    },
  },

  {
    id: "bed_single",
    name: "Single Bed",
    category: "beds",
    icon: "🛏️",
    description: "Single bed with headboard, footboard, and slat base",
    dims: { w: 900, h: 1000, d: 2000 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const baseH = 0.30;
      const railH = 0.12;
      const headH = h;
      const footH = h * 0.45;
      const slatT = 0.02;
      return [
        box("Headboard", "vertical", [0, headH / 2, -d / 2 + T / 2], [w, headH, T * 1.5]),
        box("Footboard", "vertical", [0, footH / 2, d / 2 - T / 2], [w, footH, T * 1.5]),
        box("Left Rail", "vertical", [-w / 2 + T / 2, baseH + railH / 2, 0], [T, railH, d - T * 2]),
        box("Right Rail", "vertical", [w / 2 - T / 2, baseH + railH / 2, 0], [T, railH, d - T * 2]),
        box("Slat Base", "horizontal", [0, baseH, 0], [w - T * 2, slatT, d - T * 2], "plywood"),
      ];
    },
  },

  {
    id: "bed_storage",
    name: "Storage Bed",
    category: "beds",
    icon: "🛏️",
    description: "Single bed with storage drawers in the base",
    dims: { w: 900, h: 1000, d: 2000 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const baseH = 0.35;
      const headH = h;
      const footH = h * 0.45;
      const slatT = 0.02;
      const drawerW = d / 2 - 0.02;
      return [
        box("Headboard", "vertical", [0, headH / 2, -d / 2 + T / 2], [w, headH, T * 1.5]),
        box("Footboard", "vertical", [0, footH / 2, d / 2 - T / 2], [w, footH, T * 1.5]),
        // Box base
        box("Base Left", "vertical", [-w / 2 + T / 2, baseH / 2, 0], [T, baseH, d - T * 2]),
        box("Base Right", "vertical", [w / 2 - T / 2, baseH / 2, 0], [T, baseH, d - T * 2]),
        box("Base Bottom", "horizontal", [0, T / 2, 0], [w - T * 2, T, d - T * 2], "plywood"),
        box("Slat Base", "horizontal", [0, baseH, 0], [w - T * 2, slatT, d - T * 2], "plywood"),
        // 2 drawer fronts on one side
        box("Drawer 1", "vertical", [-w / 2 - T / 2, baseH * 0.5, -d / 4], [T, baseH - 0.03, drawerW]),
        box("Drawer 2", "vertical", [-w / 2 - T / 2, baseH * 0.5, d / 4], [T, baseH - 0.03, drawerW]),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // KITCHEN
  // ════════════════════════════════════════════════════════

  {
    id: "kitchen_base_1door",
    name: "Kitchen Base (1 Door)",
    category: "kitchen",
    icon: "🍳",
    description: "Kitchen base cabinet with 1 door, 1 shelf, and countertop",
    dims: { w: 600, h: 900, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const bodyH = h - TC;
      return [
        // Countertop
        box("Countertop", "horizontal", [0, h - TC / 2, 0], [w, TC, d], "marble_white"),
        box("Left Side", "vertical", [-w / 2 + T / 2, bodyH / 2, 0], [T, bodyH, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, bodyH / 2, 0], [T, bodyH, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, bodyH / 2, -d / 2 + TB / 2], [iw, bodyH - T, TB], "plywood"),
        box("Shelf", "horizontal", [0, bodyH * 0.45, 0], [iw, T, d - TB]),
        box("Door", "vertical", [0, bodyH / 2, d / 2 - T / 2], [iw, bodyH - T, T]),
      ];
    },
  },

  {
    id: "kitchen_base_2door",
    name: "Kitchen Base (2 Door)",
    category: "kitchen",
    icon: "🍳",
    description: "Kitchen base cabinet with 2 doors, divider, and countertop",
    dims: { w: 800, h: 900, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const bodyH = h - TC;
      const doorW = (iw - T) / 2;
      return [
        box("Countertop", "horizontal", [0, h - TC / 2, 0], [w, TC, d], "marble_white"),
        box("Left Side", "vertical", [-w / 2 + T / 2, bodyH / 2, 0], [T, bodyH, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, bodyH / 2, 0], [T, bodyH, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, bodyH / 2, -d / 2 + TB / 2], [iw, bodyH - T, TB], "plywood"),
        box("Divider", "vertical", [0, bodyH / 2, 0], [T, bodyH - T * 2, d - TB]),
        box("Left Door", "vertical", [-iw / 4, bodyH / 2, d / 2 - T / 2], [doorW, bodyH - T, T]),
        box("Right Door", "vertical", [iw / 4, bodyH / 2, d / 2 - T / 2], [doorW, bodyH - T, T]),
      ];
    },
  },

  {
    id: "kitchen_base_drawers",
    name: "Kitchen Base (Drawers)",
    category: "kitchen",
    icon: "🍳",
    description: "Kitchen base cabinet with 3 drawers and countertop",
    dims: { w: 600, h: 900, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const bodyH = h - TC;
      const ih = bodyH - T * 2;
      const drawerH = ih / 3;
      const panels: PanelData[] = [
        box("Countertop", "horizontal", [0, h - TC / 2, 0], [w, TC, d], "marble_white"),
        box("Left Side", "vertical", [-w / 2 + T / 2, bodyH / 2, 0], [T, bodyH, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, bodyH / 2, 0], [T, bodyH, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, bodyH / 2, -d / 2 + TB / 2], [iw, ih, TB], "plywood"),
      ];
      for (let i = 0; i < 3; i++) {
        const y = T + drawerH * (i + 0.5);
        panels.push(box(`Drawer ${i + 1}`, "vertical", [0, y, d / 2 - T / 2], [iw, drawerH - 0.003, T]));
      }
      return panels;
    },
  },

  {
    id: "kitchen_wall",
    name: "Kitchen Wall Cabinet",
    category: "kitchen",
    icon: "🍳",
    description: "Wall-mounted kitchen cabinet with 1 hinged door",
    dims: { w: 600, h: 700, d: 350 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        box("Shelf", "horizontal", [0, h * 0.5, 0], [iw, T, d - TB]),
        box("Door", "vertical", [0, h / 2, d / 2 - T / 2], [iw, h - T * 2, T]),
      ];
    },
  },

  {
    id: "kitchen_under_oven",
    name: "Under-Oven Cabinet",
    category: "kitchen",
    icon: "🍳",
    description: "Cabinet with open top slot for oven and storage below",
    dims: { w: 600, h: 900, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const iw = w - T * 2;
      const ovenSlotH = 0.45;
      const storageH = h - ovenSlotH;
      return [
        box("Left Side", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d]),
        box("Right Side", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d]),
        box("Top", "horizontal", [0, h - T / 2, 0], [iw, T, d]),
        box("Bottom", "horizontal", [0, T / 2, 0], [iw, T, d]),
        box("Back", "back", [0, h / 2, -d / 2 + TB / 2], [iw, h - T * 2, TB], "plywood"),
        // Oven shelf (divides oven slot from storage)
        box("Oven Shelf", "horizontal", [0, storageH, 0], [iw, T, d - TB]),
        // Storage shelf
        box("Storage Shelf", "horizontal", [0, storageH * 0.5, 0], [iw, T, d - TB]),
        // Storage door
        box("Door", "vertical", [0, storageH / 2, d / 2 - T / 2], [iw, storageH - T, T]),
      ];
    },
  },

  {
    id: "kitchen_corner",
    name: "Kitchen Corner Cabinet",
    category: "kitchen",
    icon: "🍳",
    description: "L-shaped corner base cabinet with lazy susan shelf",
    dims: { w: 900, h: 900, d: 900 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const bodyH = h - TC;
      return [
        // Countertop
        box("Countertop", "horizontal", [0, h - TC / 2, 0], [w, TC, d], "marble_white"),
        // L-shaped walls
        box("Back Wall 1", "back", [-w / 2 + TB / 2, bodyH / 2, 0], [TB, bodyH, d], "plywood"),
        box("Back Wall 2", "back", [0, bodyH / 2, -d / 2 + TB / 2], [w, bodyH, TB], "plywood"),
        box("Bottom", "horizontal", [0, T / 2, 0], [w - TB, T, d - TB]),
        // Front panels
        box("Front Side Left", "vertical", [-w / 2 + 0.12, bodyH / 2, d / 2 - T / 2], [0.12, bodyH, T]),
        box("Front Side Right", "vertical", [w / 2 - T / 2, bodyH / 2, -d / 2 + 0.12], [T, bodyH, 0.12]),
        // Lazy susan shelf (circular platform)
        cyl("Lazy Susan Shelf", [0, bodyH * 0.45, 0], w * 0.6, T, "oak"),
        // Door
        box("Door", "vertical", [0.05, bodyH / 2, d / 4], [w * 0.5, bodyH - T * 2, T]),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // SEATING
  // ════════════════════════════════════════════════════════

  {
    id: "sofa_2seat",
    name: "2-Seater Sofa",
    category: "seating",
    icon: "🛋️",
    description: "Loveseat with 2 seat/back cushions, padded arms, throw pillows",
    dims: { w: 1600, h: 850, d: 900 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const mat = "fabric_cream";
      // Structure
      const legH = 0.06, baseH = 0.15;
      const baseTop = legH + baseH;
      const armW = 0.16, armH = 0.38;
      const backFrameT = 0.13, backFrameH = 0.40;
      // Cushions
      const cushT = 0.14, seatD = 0.60;
      const seatTopY = baseTop + cushT;
      const innerW = w - armW * 2;
      const cushW = innerW / 2 - 0.008;
      const seatY = baseTop + cushT / 2;
      const seatZ = d / 2 - seatD / 2 - 0.02;
      // Back cushions (tilted ~10° backward)
      const backCushH = 0.40, backCushT = 0.20;
      const backY = seatTopY + backCushH / 2 + 0.02;
      const backZ = -d / 2 + backFrameT / 2 + backCushT / 2 + 0.02;
      const backTilt: [number, number, number] = [-0.17, 0, 0]; // ~10°
      return [
        // Hidden base frame
        plinth("Base frame", [0, legH + baseH / 2, 0], [innerW, baseH, d - 0.04]),
        // Back rest frame (tilted slightly)
        padded("Back rest", "vertical", [0, baseTop + backFrameH / 2, -d / 2 + backFrameT / 2], [innerW, backFrameH, backFrameT], mat, [-0.09, 0, 0]),
        // Arms
        padded("Left Arm", "vertical", [-w / 2 + armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat),
        padded("Right Arm", "vertical", [w / 2 - armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat),
        // Seat cushions (firm, structured)
        firmCushion("Seat cushion L", "horizontal", [-cushW / 2 - 0.004, seatY, seatZ], [cushW, cushT, seatD], mat),
        firmCushion("Seat cushion R", "horizontal", [cushW / 2 + 0.004, seatY, seatZ], [cushW, cushT, seatD], mat),
        // Back cushions (puffy, tilted backward)
        cushion("Back cushion L", "vertical", [-cushW / 2 - 0.004, backY, backZ], [cushW - 0.02, backCushH, backCushT], mat, backTilt),
        cushion("Back cushion R", "vertical", [cushW / 2 + 0.004, backY, backZ], [cushW - 0.02, backCushH, backCushT], mat, backTilt),
        // Legs
        cyl("Leg FL", [-w / 2 + 0.10, legH / 2, d / 2 - 0.10], 0.035, legH, "oak"),
        cyl("Leg FR", [w / 2 - 0.10, legH / 2, d / 2 - 0.10], 0.035, legH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], 0.035, legH, "oak"),
        cyl("Leg BR", [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], 0.035, legH, "oak"),
        // Throw pillows
        cushion("Pillow L", "vertical", [-innerW / 3, seatTopY + 0.18, seatZ - 0.08], [0.40, 0.40, 0.13], "fabric_taupe", [-0.35, 0.15, 0]),
        cushion("Pillow R", "vertical", [innerW / 3, seatTopY + 0.18, seatZ - 0.08], [0.40, 0.40, 0.13], "fabric_taupe", [-0.35, -0.12, 0]),
      ];
    },
  },

  {
    id: "sofa_3seat",
    name: "3-Seater Sofa",
    category: "seating",
    icon: "🛋️",
    description: "3-seater with individual cushions, padded arms, and throw pillows",
    dims: { w: 2100, h: 850, d: 900 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const mat = "fabric_cream";
      const legH = 0.06, baseH = 0.15;
      const baseTop = legH + baseH;
      const armW = 0.16, armH = 0.38;
      const backFrameT = 0.13, backFrameH = 0.40;
      const cushT = 0.14, seatD = 0.60;
      const seatTopY = baseTop + cushT;
      const innerW = w - armW * 2;
      const cushW = innerW / 3 - 0.008;
      const seatY = baseTop + cushT / 2;
      const seatZ = d / 2 - seatD / 2 - 0.02;
      const backCushH = 0.40, backCushT = 0.20;
      const backY = seatTopY + backCushH / 2 + 0.02;
      const backZ = -d / 2 + backFrameT / 2 + backCushT / 2 + 0.02;
      const backTilt: [number, number, number] = [-0.17, 0, 0];
      const gap = 0.006;
      const cx = [-(cushW + gap), 0, cushW + gap];
      return [
        plinth("Base frame", [0, legH + baseH / 2, 0], [innerW, baseH, d - 0.04]),
        padded("Back rest", "vertical", [0, baseTop + backFrameH / 2, -d / 2 + backFrameT / 2], [innerW, backFrameH, backFrameT], mat, [-0.09, 0, 0]),
        padded("Left Arm", "vertical", [-w / 2 + armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat),
        padded("Right Arm", "vertical", [w / 2 - armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat),
        ...cx.map((x, i) => firmCushion(`Seat cushion ${["L","C","R"][i]}`, "horizontal", [x, seatY, seatZ], [cushW, cushT, seatD], mat)),
        ...cx.map((x, i) => cushion(`Back cushion ${["L","C","R"][i]}`, "vertical", [x, backY, backZ], [cushW - 0.02, backCushH, backCushT], mat, backTilt)),
        cyl("Leg FL", [-w / 2 + 0.10, legH / 2, d / 2 - 0.10], 0.035, legH, "oak"),
        cyl("Leg FR", [w / 2 - 0.10, legH / 2, d / 2 - 0.10], 0.035, legH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], 0.035, legH, "oak"),
        cyl("Leg BR", [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], 0.035, legH, "oak"),
        // Throw pillows at each end
        cushion("Pillow L", "vertical", [-innerW / 2.5, seatTopY + 0.18, seatZ - 0.08], [0.42, 0.42, 0.13], "fabric_taupe", [-0.35, 0.12, 0]),
        cushion("Pillow R", "vertical", [innerW / 2.5, seatTopY + 0.18, seatZ - 0.08], [0.42, 0.42, 0.13], "fabric_brown", [-0.35, -0.10, 0]),
        cushion("Pillow C", "vertical", [0, seatTopY + 0.20, seatZ - 0.10], [0.38, 0.38, 0.12], "fabric_charcoal", [-0.40, 0.05, 0]),
      ];
    },
  },

  {
    id: "sofa_l_shape",
    name: "L-Shaped Sectional",
    category: "seating",
    icon: "🛋️",
    description: "L-shaped sectional with chaise, cushions, and throw pillows",
    dims: { w: 2700, h: 850, d: 1800 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const mat = "fabric_cream";
      const legH = 0.05, baseH = 0.15;
      const baseTop = legH + baseH;
      const armW = 0.16, armH = 0.38;
      const backFrameT = 0.13, backFrameH = 0.40;
      const cushT = 0.14, mainSeatD = 0.60;
      const seatTopY = baseTop + cushT;
      const mainD = 0.90; // main section depth
      const chaiseW = 0.90;
      const mainInnerW = w - chaiseW - armW;
      const mainCushW = mainInnerW / 2 - 0.008;
      const seatY = baseTop + cushT / 2;
      const backCushH = 0.40, backCushT = 0.20;
      const backY = seatTopY + backCushH / 2 + 0.02;
      const backTilt: [number, number, number] = [-0.17, 0, 0];
      const mainCX = -(w - mainInnerW) / 2 + armW / 2;
      const mainSeatZ = -d / 2 + mainD / 2 + 0.02;
      const mainBackZ = -d / 2 + backFrameT / 2 + backCushT / 2 + 0.02;
      const chaiseCX = w / 2 - chaiseW / 2;
      return [
        // Bases
        plinth("Main Base", [mainCX, legH + baseH / 2, -d / 2 + mainD / 2], [mainInnerW + armW, baseH, mainD - 0.06]),
        plinth("Chaise Base", [chaiseCX, legH + baseH / 2, 0], [chaiseW - 0.06, baseH, d - 0.06]),
        // Back rests
        padded("Main Back", "vertical", [mainCX, baseTop + backFrameH / 2, -d / 2 + backFrameT / 2], [mainInnerW, backFrameH, backFrameT], mat, [-0.09, 0, 0]),
        padded("Chaise Back", "vertical", [w / 2 - backFrameT / 2, baseTop + backFrameH / 2, 0], [backFrameT, backFrameH, d - 0.06], mat),
        // Arm
        padded("Left Arm", "vertical", [-w / 2 + armW / 2, baseTop + armH / 2, -d / 2 + mainD / 2], [armW, armH, mainD - 0.04], mat),
        // Main seat cushions
        firmCushion("Seat L", "horizontal", [mainCX - mainCushW / 2 - 0.004, seatY, mainSeatZ], [mainCushW, cushT, mainSeatD], mat),
        firmCushion("Seat R", "horizontal", [mainCX + mainCushW / 2 + 0.004, seatY, mainSeatZ], [mainCushW, cushT, mainSeatD], mat),
        // Main back cushions
        cushion("Back L", "vertical", [mainCX - mainCushW / 2, backY, mainBackZ], [mainCushW - 0.02, backCushH, backCushT], mat, backTilt),
        cushion("Back R", "vertical", [mainCX + mainCushW / 2, backY, mainBackZ], [mainCushW - 0.02, backCushH, backCushT], mat, backTilt),
        // Chaise cushion
        firmCushion("Chaise seat", "horizontal", [chaiseCX, seatY, 0], [chaiseW - 0.08, cushT, d - 0.20], mat),
        // Legs
        cyl("Leg FL", [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], 0.03, legH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.10, legH / 2, -d / 2 + mainD - 0.10], 0.03, legH, "oak"),
        cyl("Leg FR", [w / 2 - 0.10, legH / 2, d / 2 - 0.10], 0.03, legH, "oak"),
        cyl("Leg BR", [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], 0.03, legH, "oak"),
        // Throw pillows
        cushion("Pillow 1", "vertical", [mainCX - mainCushW / 2, seatTopY + 0.18, mainSeatZ - 0.10], [0.40, 0.40, 0.12], "fabric_taupe", [-0.30, 0.15, 0]),
        cushion("Pillow 2", "vertical", [chaiseCX, seatTopY + 0.16, -0.20], [0.38, 0.38, 0.12], "fabric_brown", [-0.25, -0.10, 0]),
      ];
    },
  },

  {
    id: "sofa_bed",
    name: "Sofa Bed",
    category: "seating",
    icon: "🛋️",
    description: "Sofa bed with deep cushions, lower back, and throw pillows",
    dims: { w: 2000, h: 750, d: 1000 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const mat = "fabric_cream";
      const legH = 0.05, baseH = 0.15;
      const baseTop = legH + baseH;
      const armW = 0.16, armH = 0.34;
      const backFrameT = 0.12, backFrameH = 0.33;
      const cushT = 0.15, seatD = 0.70; // deeper seat
      const seatTopY = baseTop + cushT;
      const innerW = w - armW * 2;
      const cushW = innerW / 2 - 0.008;
      const seatY = baseTop + cushT / 2;
      const seatZ = d / 2 - seatD / 2 - 0.02;
      const backCushH = 0.30, backCushT = 0.18;
      const backY = seatTopY + backCushH / 2 + 0.02;
      const backZ = -d / 2 + backFrameT / 2 + backCushT / 2 + 0.02;
      const backTilt: [number, number, number] = [-0.20, 0, 0]; // more reclined
      return [
        plinth("Base frame", [0, legH + baseH / 2, 0], [innerW, baseH, d - 0.04]),
        padded("Back rest", "vertical", [0, baseTop + backFrameH / 2, -d / 2 + backFrameT / 2], [innerW, backFrameH, backFrameT], mat, [-0.12, 0, 0]),
        padded("Left Arm", "vertical", [-w / 2 + armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat),
        padded("Right Arm", "vertical", [w / 2 - armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat),
        firmCushion("Seat cushion L", "horizontal", [-cushW / 2 - 0.004, seatY, seatZ], [cushW, cushT, seatD], mat),
        firmCushion("Seat cushion R", "horizontal", [cushW / 2 + 0.004, seatY, seatZ], [cushW, cushT, seatD], mat),
        cushion("Back cushion L", "vertical", [-cushW / 2 - 0.004, backY, backZ], [cushW - 0.02, backCushH, backCushT], mat, backTilt),
        cushion("Back cushion R", "vertical", [cushW / 2 + 0.004, backY, backZ], [cushW - 0.02, backCushH, backCushT], mat, backTilt),
        cyl("Leg FL", [-w / 2 + 0.10, legH / 2, d / 2 - 0.10], 0.03, legH, "black_metal"),
        cyl("Leg FR", [w / 2 - 0.10, legH / 2, d / 2 - 0.10], 0.03, legH, "black_metal"),
        cyl("Leg BL", [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], 0.03, legH, "black_metal"),
        cyl("Leg BR", [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], 0.03, legH, "black_metal"),
        cushion("Pillow L", "vertical", [-innerW / 3, seatTopY + 0.16, seatZ - 0.10], [0.42, 0.42, 0.13], "fabric_taupe", [-0.30, 0.10, 0]),
        cushion("Pillow R", "vertical", [innerW / 3, seatTopY + 0.16, seatZ - 0.10], [0.42, 0.42, 0.13], "fabric_brown", [-0.30, -0.08, 0]),
      ];
    },
  },

  {
    id: "armchair_classic",
    name: "Classic Armchair",
    category: "seating",
    icon: "💺",
    description: "Classic armchair with puffy cushion, padded arms, and throw pillow",
    dims: { w: 850, h: 850, d: 850 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const mat = "leather_brown";
      const legH = 0.08, baseH = 0.14;
      const baseTop = legH + baseH;
      const armW = 0.18, armH = 0.36;
      const backFrameT = 0.12, backFrameH = 0.38;
      const cushT = 0.16, seatD = 0.58;
      const seatTopY = baseTop + cushT;
      const innerW = w - armW * 2;
      const seatY = baseTop + cushT / 2;
      const seatZ = d / 2 - seatD / 2 - 0.02;
      const backCushH = 0.38, backCushT = 0.20;
      const backY = seatTopY + backCushH / 2 + 0.02;
      const backZ = -d / 2 + backFrameT / 2 + backCushT / 2 + 0.02;
      const backTilt: [number, number, number] = [-0.17, 0, 0];
      return [
        plinth("Base frame", [0, legH + baseH / 2, 0], [innerW, baseH, d - 0.04]),
        padded("Back rest", "vertical", [0, baseTop + backFrameH / 2, -d / 2 + backFrameT / 2], [innerW, backFrameH, backFrameT], mat, [-0.09, 0, 0]),
        padded("Left Arm", "vertical", [-w / 2 + armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat),
        padded("Right Arm", "vertical", [w / 2 - armW / 2, baseTop + armH / 2, 0], [armW, armH, d - 0.04], mat),
        cushion("Seat", "horizontal", [0, seatY, seatZ], [innerW, cushT, seatD], mat),
        cushion("Back cushion", "vertical", [0, backY, backZ], [innerW - 0.02, backCushH, backCushT], mat, backTilt),
        cyl("Leg FL", [-w / 2 + 0.10, legH / 2, d / 2 - 0.10], 0.04, legH, "oak"),
        cyl("Leg FR", [w / 2 - 0.10, legH / 2, d / 2 - 0.10], 0.04, legH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], 0.04, legH, "oak"),
        cyl("Leg BR", [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], 0.04, legH, "oak"),
        cushion("Pillow", "vertical", [0, seatTopY + 0.16, seatZ - 0.06], [0.35, 0.35, 0.12], "fabric_taupe", [-0.40, 0.10, 0]),
      ];
    },
  },

  {
    id: "armchair_modern",
    name: "Modern Accent Chair",
    category: "seating",
    icon: "💺",
    description: "Mid-century accent chair with firm cushions and tapered legs",
    dims: { w: 700, h: 800, d: 750 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const mat = "velvet_navy";
      const legH = 0.14, baseH = 0.10;
      const baseTop = legH + baseH;
      const armW = 0.08, armH = 0.22;
      const backFrameT = 0.08, backFrameH = 0.34;
      const cushT = 0.12, seatD = 0.52;
      const seatTopY = baseTop + cushT;
      const innerW = w - armW * 2;
      const seatY = baseTop + cushT / 2;
      const seatZ = d / 2 - seatD / 2 - 0.02;
      const backCushH = 0.34, backCushT = 0.14;
      const backY = seatTopY + backCushH / 2 + 0.02;
      const backZ = -d / 2 + backFrameT / 2 + backCushT / 2 + 0.02;
      const backTilt: [number, number, number] = [-0.15, 0, 0];
      return [
        plinth("Base frame", [0, legH + baseH / 2, 0], [innerW + 0.04, baseH, d - 0.06]),
        padded("Back rest", "vertical", [0, baseTop + backFrameH / 2, -d / 2 + backFrameT / 2], [innerW, backFrameH, backFrameT], mat, [-0.09, 0, 0]),
        padded("Left Arm", "vertical", [-w / 2 + armW / 2, baseTop + armH / 2, 0], [armW, armH, d * 0.65], mat),
        padded("Right Arm", "vertical", [w / 2 - armW / 2, baseTop + armH / 2, 0], [armW, armH, d * 0.65], mat),
        firmCushion("Seat", "horizontal", [0, seatY, seatZ], [innerW, cushT, seatD], mat),
        firmCushion("Back cushion", "vertical", [0, backY, backZ], [innerW - 0.02, backCushH, backCushT], mat, backTilt),
        cone("Leg FL", [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], 0.025, legH, "oak"),
        cone("Leg FR", [w / 2 - 0.08, legH / 2, d / 2 - 0.08], 0.025, legH, "oak"),
        cone("Leg BL", [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], 0.025, legH, "oak"),
        cone("Leg BR", [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], 0.025, legH, "oak"),
      ];
    },
  },

  {
    id: "executive_office_chair",
    name: "Executive Office Chair",
    category: "chairs",
    icon: "🪑",
    description: "Executive office chair with headrest, padded arms, chrome star base, and casters",
    dims: { w: 680, h: 1250, d: 700 },
    buildPanels: (dims) => {
      _pid = 0;
      const mat = "leather_black";
      const metalMat = "chrome";
      const darkMat = "black_metal";

      // Seat — thick padded cushion
      const seatY = 0.48, seatT = 0.10;
      const seatW = 0.52, seatD = 0.50;

      // Backrest — tall, padded, slightly tilted
      const backW = 0.48, backH = 0.52, backT = 0.08;
      const backY = seatY + seatT / 2 + backH / 2 + 0.02;
      const backZ = -0.20;

      // Headrest — small cushion above backrest
      const headW = 0.30, headH = 0.14, headT = 0.07;
      const headY = backY + backH / 2 + headH / 2 + 0.02;

      // Arms — angled support + long padded top
      const armX = 0.27;
      const armSupportH = 0.16;
      const armSupportY = seatY + 0.02;
      const armPadY = seatY + seatT / 2 + 0.02;

      // Gas lift
      const liftH = 0.22;
      const liftY = seatY - seatT / 2 - liftH / 2;

      // Base
      const baseY = liftY - liftH / 2 - 0.02;
      const baseSize = 0.62;

      // Caster positions (5-point star)
      const casterR = baseSize / 2 + 0.02;
      const casterY = 0.035;
      const casterAngles = [0, 72, 144, 216, 288].map(a => a * Math.PI / 180);

      return [
        // Seat cushion
        firmCushion("Seat", "horizontal", [0, seatY, 0.02], [seatW, seatT, seatD], mat),
        // Backrest — tall padded, tilted back
        firmCushion("Backrest", "vertical", [0, backY, backZ], [backW, backH, backT], mat, [-0.12, 0, 0]),
        // Headrest
        cushion("Headrest", "horizontal", [0, headY, backZ + 0.02], [headW, headH, headT], mat),
        // Left arm — curved support + long padded rest
        box("Left arm support", "vertical", [-armX, armSupportY, 0.04], [0.035, armSupportH, 0.04], darkMat),
        padded("Left arm pad", "horizontal", [-armX, armPadY, 0.04], [0.07, 0.035, 0.30], mat),
        // Right arm
        box("Right arm support", "vertical", [armX, armSupportY, 0.04], [0.035, armSupportH, 0.04], darkMat),
        padded("Right arm pad", "horizontal", [armX, armPadY, 0.04], [0.07, 0.035, 0.30], mat),
        // Gas lift cylinder
        cyl("Gas lift", [0, liftY, 0], 0.06, liftH, darkMat),
        // Chrome star base
        { id: pid(), type: "horizontal" as const, shape: "x_base" as PanelShape, label: "Star base", position: [0, baseY, 0] as [number,number,number], size: [baseSize, 0.04, baseSize] as [number,number,number], materialId: metalMat },
        // 5 casters
        ...casterAngles.map((angle, i) => (
          { id: pid(), type: "vertical" as const, shape: "sphere" as PanelShape, label: `Caster ${i + 1}`, position: [Math.cos(angle) * casterR, casterY, Math.sin(angle) * casterR] as [number,number,number], size: [0.06, 0.06, 0.06] as [number,number,number], materialId: darkMat }
        )),
      ];
    },
  },

  {
    id: "barrel_tub_chair",
    name: "Curved Barrel Chair",
    category: "chairs",
    icon: "💺",
    description: "Wraparound upholstered tub chair with exposed wood legs and stretchers",
    dims: { w: 750, h: 750, d: 720 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const mat = "fabric_cream";
      const woodMat = "oak";
      const legH = 0.18;
      const shellH = h - legH;
      const shellT = 0.06; // shell thickness
      const seatH = 0.07;
      const seatTopY = legH + shellH * 0.35;
      const seatD = d * 0.70;
      const seatW = w * 0.65;

      return [
        // Wraparound shell — the curved back+sides as one padded block
        padded("Shell", "vertical", [0, legH + shellH / 2, -0.02], [w - 0.02, shellH, d - 0.04], mat),
        // Inner cavity cutout effect — darker recessed interior
        padded("Inner back", "vertical", [0, legH + shellH * 0.55, -d / 2 + shellT + 0.10], [w - shellT * 2 - 0.06, shellH * 0.65, 0.04], mat),
        // Seat cushion — thick, deep
        cushion("Seat cushion", "horizontal", [0, seatTopY, 0.04], [seatW, seatH, seatD], mat),
        // Wood frame — 4 legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], 0.03, legH, woodMat),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, d / 2 - 0.08], 0.03, legH, woodMat),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], 0.03, legH, woodMat),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], 0.03, legH, woodMat),
        // Stretcher rails connecting legs
        box("Stretcher front", "horizontal", [0, legH * 0.5, d / 2 - 0.08], [w - 0.20, 0.02, 0.02], woodMat),
        box("Stretcher left", "horizontal", [-w / 2 + 0.08, legH * 0.5, 0], [0.02, 0.02, d - 0.20], woodMat),
        box("Stretcher right", "horizontal", [w / 2 - 0.08, legH * 0.5, 0], [0.02, 0.02, d - 0.20], woodMat),
        box("Stretcher back", "horizontal", [0, legH * 0.5, -d / 2 + 0.08], [w - 0.20, 0.02, 0.02], woodMat),
      ];
    },
  },

  {
    id: "wingback_chair",
    name: "Mid-Century Wingback Chair",
    category: "chairs",
    icon: "💺",
    description: "Compact wingback armchair with tapered walnut legs, tufted back, and wrap-around arms",
    dims: { w: 720, h: 950, d: 740 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const mat = "fabric_sage";
      const legH = 0.16;
      const seatH = 0.06, seatTopY = 0.42;
      const seatY = seatTopY - seatH / 2;
      const seatD = d * 0.72, seatW = w * 0.70;
      const armW = 0.10, armH = 0.32;
      const armTop = seatTopY + armH;
      const backH = h - seatTopY + 0.04, backT = 0.08;
      const backW = w * 0.78;
      const wingD = d * 0.35;
      return [
        firmCushion("Seat cushion", "horizontal", [0, seatY, 0.04], [seatW, seatH, seatD], mat),
        firmCushion("Backrest", "vertical", [0, seatTopY + backH / 2 - 0.02, -d / 2 + backT / 2 + 0.02], [backW, backH, backT], mat, [-0.10, 0, 0]),
        padded("Left Arm", "vertical", [-w / 2 + armW / 2 + 0.01, seatTopY + armH / 2 - 0.02, -0.02], [armW, armH, wingD], mat),
        padded("Right Arm", "vertical", [w / 2 - armW / 2 - 0.01, seatTopY + armH / 2 - 0.02, -0.02], [armW, armH, wingD], mat),
        padded("Left Wing", "vertical", [-w / 2 + 0.04, armTop + 0.06, -d / 2 + 0.12], [0.06, 0.18, 0.16], mat),
        padded("Right Wing", "vertical", [w / 2 - 0.04, armTop + 0.06, -d / 2 + 0.12], [0.06, 0.18, 0.16], mat),
        plinth("Frame", [0, seatTopY - seatH - 0.04, 0], [w - 0.06, 0.06, d - 0.06], mat),
        cyl("Leg FL", [-w / 2 + 0.10, legH / 2, d / 2 - 0.10], 0.04, legH, "walnut"),
        cyl("Leg FR", [w / 2 - 0.10, legH / 2, d / 2 - 0.10], 0.04, legH, "walnut"),
        cyl("Leg BL", [-w / 2 + 0.10, legH / 2, -d / 2 + 0.10], 0.04, legH, "walnut"),
        cyl("Leg BR", [w / 2 - 0.10, legH / 2, -d / 2 + 0.10], 0.04, legH, "walnut"),
      ];
    },
  },

  {
    id: "armchair_bamboo_lounge",
    name: "Bamboo Frame Lounge Chair",
    category: "chairs",
    icon: "🪑",
    description:
      "Round bamboo-style wood frame with dowel legs, low perimeter rails, arm poles, back crossbar, and thick tufted seat + back cushions",
    dims: { w: 720, h: 820, d: 700 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000;
      const h = dims.h / 1000;
      const d = dims.d / 1000;
      const wood = "bamboo";
      const fab = "fabric_cream";
      const poleD = 0.036;
      const railT = 0.028;
      const inset = 0.056;
      const xw = w / 2 - inset;
      const zF = d / 2 - inset;
      const zB = -d / 2 + inset;
      const seatFrameY = 0.328;
      const seatCushionT = 0.105;
      const seatY = seatFrameY + seatCushionT / 2;
      const armY = 0.535;
      const innerW = Math.max(0.34, w - inset * 2 - poleD * 2 - 0.02);
      const innerD = Math.max(0.38, d - inset * 2 - poleD * 2 - 0.12);
      const seatZ = 0.035;
      const backDepth = 0.082;
      const backH = Math.max(0.28, h - seatFrameY - seatCushionT - 0.07);
      const backY = seatFrameY + seatCushionT + backH / 2;
      const backZ = zB + backDepth / 2 + 0.012;
      const postH = h - poleD * 1.15;
      const postCy = h / 2;
      const railLenX = w - inset * 2;
      const railLenZ = d - inset * 2;

      return [
        // ── Corner posts (continuous dowels, floor → top) ──
        cyl("Post FL", [-xw, postCy, zF], poleD, postH, wood),
        cyl("Post FR", [xw, postCy, zF], poleD, postH, wood),
        cyl("Post BL", [-xw, postCy, zB], poleD, postH, wood),
        cyl("Post BR", [xw, postCy, zB], poleD, postH, wood),
        // ── Low perimeter frame (near floor) ──
        box("Base Rail Front", "horizontal", [0, railT * 1.1, zF], [railLenX, railT, railT], wood),
        box("Base Rail Back", "horizontal", [0, railT * 1.1, zB], [railLenX, railT, railT], wood),
        box("Base Rail Left", "horizontal", [-xw, railT * 1.1, 0], [railT, railT, railLenZ], wood),
        box("Base Rail Right", "horizontal", [xw, railT * 1.1, 0], [railT, railT, railLenZ], wood),
        // ── Seat support ring ──
        box("Seat Rail Front", "horizontal", [0, seatFrameY - railT * 0.35, zF], [railLenX, railT, railT], wood),
        box("Seat Rail Back", "horizontal", [0, seatFrameY - railT * 0.35, zB], [railLenX, railT, railT], wood),
        box("Seat Rail Left", "horizontal", [-xw, seatFrameY - railT * 0.35, 0], [railT, railT, railLenZ], wood),
        box("Seat Rail Right", "horizontal", [xw, seatFrameY - railT * 0.35, 0], [railT, railT, railLenZ], wood),
        // ── Arm rails (side dowels, lounge height) ──
        box("Arm Rail Left", "horizontal", [-xw, armY, 0], [poleD, poleD, railLenZ - poleD], wood),
        box("Arm Rail Right", "horizontal", [xw, armY, 0], [poleD, poleD, railLenZ - poleD], wood),
        // ── Back top crossbar ──
        box("Back Top Rail", "horizontal", [0, h - railT * 1.35, zB], [railLenX, railT, railT], wood),
        // ── Cushions (biscuit tufting via labels + shape) ──
        {
          id: pid(),
          type: "horizontal",
          shape: "cushion" as PanelShape,
          label: "Seat Cushion",
          position: [0, seatY, seatZ],
          size: [innerW, seatCushionT, innerD],
          materialId: fab,
        },
        {
          id: pid(),
          type: "vertical",
          shape: "cushion" as PanelShape,
          label: "Seat Back",
          position: [0, backY, backZ],
          size: [innerW - 0.02, backH, backDepth],
          materialId: fab,
        },
      ];
    },
  },

  {
    id: "chair_dining",
    name: "Dining Chair",
    category: "seating",
    icon: "🪑",
    description: "Dining chair with seat, back, and 4 legs",
    dims: { w: 450, h: 900, d: 500 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const seatH = 0.45;
      const legD = 0.03;
      return [
        box("Seat", "horizontal", [0, seatH, 0], [w, T, d]),
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + T / 2], [w, h - seatH, T]),
        cyl("Leg FL", [-w / 2 + 0.04, seatH / 2, d / 2 - 0.04], legD, seatH),
        cyl("Leg FR", [w / 2 - 0.04, seatH / 2, d / 2 - 0.04], legD, seatH),
        cyl("Leg BL", [-w / 2 + 0.04, seatH / 2, -d / 2 + 0.04], legD, seatH),
        cyl("Leg BR", [w / 2 - 0.04, seatH / 2, -d / 2 + 0.04], legD, seatH),
      ];
    },
  },

  {
    id: "chair_bistro_cane",
    name: "Bistro Chair (Cane Back)",
    category: "chairs",
    icon: "🪑",
    description:
      "Bentwood-style side chair: light wood frame, arched crest, woven cane insert, inset upholstered seat (no tufting)",
    dims: { w: 440, h: 900, d: 470 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000;
      const h = dims.h / 1000;
      const d = dims.d / 1000;
      const wood = "birch";
      const cane = "cane_natural";
      const seatFab = "fabric_ivory";
      const legD = 0.024;
      const inset = 0.042;
      const xLegF = w / 2 - inset;
      const zF = d / 2 - inset;
      const xLegB = w / 2 - inset + 0.006;
      const zB = -d / 2 + inset;
      const seatH = 0.468;
      const cushionT = 0.034;
      const cushionY = seatH + cushionT / 2 - 0.006;
      const backZ = -d / 2 + 0.018;
      const stileW = 0.022;
      const stileH = 0.395;
      const stileY = seatH - 0.02 + stileH / 2;
      const crestY = stileY + stileH / 2 + 0.055;
      const caneW = Math.min(0.36, w - 0.1);
      const caneH = 0.31;
      const caneY = seatH + 0.04 + caneH / 2;
      const stretchY = 0.198;
      const railT = 0.018;
      const legLen = seatH - legD * 0.35;
      const legCy = legLen / 2 + legD * 0.2;

      return [
        cyl("Leg FL", [-xLegF, legCy, zF], legD, legLen, wood),
        cyl("Leg FR", [xLegF, legCy, zF], legD, legLen, wood),
        cyl("Leg BL", [-xLegB, legCy, zB], legD, legLen, wood),
        cyl("Leg BR", [xLegB, legCy, zB], legD, legLen, wood),
        box("Stretcher Front", "horizontal", [0, stretchY, zF], [w - inset * 2, railT, railT], wood),
        box("Stretcher Back", "horizontal", [0, stretchY, zB], [w - inset * 2 + 0.012, railT, railT], wood),
        box("Stretcher Left", "horizontal", [-xLegF, stretchY, 0], [railT, railT, d - inset * 2], wood),
        box("Stretcher Right", "horizontal", [xLegF, stretchY, 0], [railT, railT, d - inset * 2], wood),
        box("Stretcher H Front", "horizontal", [0, stretchY + 0.052, (zF + zB) * 0.5], [w * 0.38, railT * 0.9, railT], wood),
        box("Back Stile Left", "vertical", [-w / 2 + stileW * 0.65, stileY, backZ], [stileW, stileH, stileW * 1.1], wood),
        box("Back Stile Right", "vertical", [w / 2 - stileW * 0.65, stileY, backZ], [stileW, stileH, stileW * 1.1], wood),
        {
          id: pid(),
          type: "vertical",
          shape: "rounded_rect" as PanelShape,
          shapeParams: { cornerRadius: 0.042 },
          label: "Cane Insert",
          position: [0, caneY, backZ],
          size: [caneW, caneH, 0.014],
          materialId: cane,
        },
        {
          id: pid(),
          type: "vertical",
          shape: "arc" as PanelShape,
          shapeParams: { arcAngle: 168 },
          label: "Back Crest",
          position: [0, crestY, backZ],
          rotation: [0, 0, Math.PI / 2],
          size: [Math.min(0.4, w - 0.06), 0.34, 0.022],
          materialId: wood,
        },
        box("Back Lower Rail", "horizontal", [0, seatH + 0.028, backZ], [w - 0.08, railT, stileW * 1.05], wood),
        box("Seat Frame Front", "horizontal", [0, seatH - railT * 0.4, zF - railT * 0.35], [w - 0.02, railT, railT], wood),
        box("Seat Frame Back", "horizontal", [0, seatH - railT * 0.4, zB + railT * 1.2], [w - 0.02, railT, railT], wood),
        box("Seat Frame Left", "horizontal", [-w / 2 + railT * 0.9, seatH - railT * 0.4, 0], [railT, railT, d - 0.06], wood),
        box("Seat Frame Right", "horizontal", [w / 2 - railT * 0.9, seatH - railT * 0.4, 0], [railT, railT, d - 0.06], wood),
        {
          id: pid(),
          type: "horizontal",
          shape: "cushion" as PanelShape,
          label: "Bistro inset seat",
          position: [0, cushionY, 0.02],
          size: [w - 0.055, cushionT, d - 0.085],
          materialId: seatFab,
        },
      ];
    },
  },

  {
    id: "chair_bar_stool",
    name: "Bar Stool",
    category: "seating",
    icon: "🍸",
    description: "Bar stool with round seat, pedestal, and base disc",
    dims: { w: 400, h: 750, d: 400 },
    buildPanels: (dims) => {
      _pid = 0;
      const _w = dims.w / 1000, h = dims.h / 1000, _d = dims.d / 1000;
      const seatD = Math.min(_w, _d) * 0.85;
      return [
        // Round seat
        cyl("Seat", [0, h - 0.03, 0], seatD, 0.04, "leather_black"),
        // Pedestal
        cyl("Pedestal", [0, h / 2, 0], 0.05, h - 0.07, "chrome"),
        // Base disc
        cyl("Base", [0, 0.015, 0], seatD * 0.9, 0.03, "chrome"),
      ];
    },
  },

  {
    id: "chair_office",
    name: "Office Chair",
    category: "seating",
    icon: "💺",
    description: "Office chair with seat, back, pedestal, and wide base",
    dims: { w: 650, h: 1100, d: 650 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const seatH = 0.48;
      const seatW = w * 0.75, seatD = d * 0.7;
      return [
        // Seat
        box("Seat", "horizontal", [0, seatH, 0.03], [seatW, 0.06, seatD], "fabric_cream"),
        // Back
        box("Back", "vertical", [0, (seatH + h) / 2, -seatD / 2 + 0.03], [seatW * 0.9, h - seatH - 0.06, 0.05], "fabric_cream"),
        // Pedestal
        cyl("Pedestal", [0, seatH / 2, 0], 0.05, seatH, "chrome"),
        // Star base
        box("Base Arm 1", "horizontal", [0, 0.03, 0], [w, 0.03, 0.04], "black_metal"),
        box("Base Arm 2", "horizontal", [0, 0.03, 0], [0.04, 0.03, d], "black_metal"),
      ];
    },
  },

  {
    id: "chair_office_plaid_blue",
    name: "Office Chair (Plaid Blue)",
    category: "chairs",
    icon: "💺",
    description:
      "Retro plush task chair: blue & cream check fabric, slate painted frame, 5-star base with casters, bamboo arm pads",
    dims: { w: 640, h: 1040, d: 640 },
    buildPanels: (dims) => {
      _pid = 0;
      return buildOfficePlaidRetroChair(dims, "blue");
    },
  },

  {
    id: "chair_office_plaid_olive",
    name: "Office Chair (Plaid Olive)",
    category: "chairs",
    icon: "💺",
    description:
      "Retro plush task chair: olive & beige check fabric, olive painted frame, 5-star base with casters, bamboo arm pads",
    dims: { w: 640, h: 1040, d: 640 },
    buildPanels: (dims) => {
      _pid = 0;
      return buildOfficePlaidRetroChair(dims, "olive");
    },
  },

  {
    id: "stool_simple",
    name: "Simple Stool",
    category: "seating",
    icon: "🪑",
    description: "Simple stool with square top and 4 legs, no back",
    dims: { w: 350, h: 450, d: 350 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = h - T;
      return [
        box("Seat", "horizontal", [0, h - T / 2, 0], [w, T, d]),
        cyl("Leg FL", [-w / 2 + 0.04, legH / 2, d / 2 - 0.04], 0.025, legH),
        cyl("Leg FR", [w / 2 - 0.04, legH / 2, d / 2 - 0.04], 0.025, legH),
        cyl("Leg BL", [-w / 2 + 0.04, legH / 2, -d / 2 + 0.04], 0.025, legH),
        cyl("Leg BR", [w / 2 - 0.04, legH / 2, -d / 2 + 0.04], 0.025, legH),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // APPLIANCES
  // ════════════════════════════════════════════════════════

  {
    id: "appliance_fridge",
    name: "Fridge",
    category: "appliances",
    icon: "🧊",
    description: "Tall fridge with upper fridge door and lower freezer door",
    dims: { w: 700, h: 1800, d: 700 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const freezerH = h * 0.35;
      const fridgeH = h - freezerH;
      return [
        // Main body
        box("Body Left", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d], "melamine_white"),
        box("Body Right", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d], "melamine_white"),
        box("Body Top", "horizontal", [0, h - T / 2, 0], [w - T * 2, T, d], "melamine_white"),
        box("Body Back", "back", [0, h / 2, -d / 2 + TB / 2], [w - T * 2, h - T, TB], "melamine_white"),
        box("Body Bottom", "horizontal", [0, T / 2, 0], [w - T * 2, T, d], "melamine_white"),
        // Divider between fridge and freezer
        box("Divider", "horizontal", [0, freezerH, 0], [w - T * 2, T, d - TB], "melamine_white"),
        // Fridge door (upper)
        box("Fridge Door", "vertical", [0, freezerH + fridgeH / 2, d / 2 - T / 2], [w - T * 2, fridgeH - T, T], "melamine_white"),
        // Freezer door (lower)
        box("Freezer Door", "vertical", [0, T + freezerH / 2 - T / 2, d / 2 - T / 2], [w - T * 2, freezerH - T * 2, T], "melamine_white"),
      ];
    },
  },

  {
    id: "appliance_oven",
    name: "Oven",
    category: "appliances",
    icon: "🔥",
    description: "Oven box with glass door front",
    dims: { w: 600, h: 600, d: 550 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [
        box("Body Left", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d], "melamine_black"),
        box("Body Right", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d], "melamine_black"),
        box("Body Top", "horizontal", [0, h - T / 2, 0], [w - T * 2, T, d], "melamine_black"),
        box("Body Bottom", "horizontal", [0, T / 2, 0], [w - T * 2, T, d], "melamine_black"),
        box("Body Back", "back", [0, h / 2, -d / 2 + TB / 2], [w - T * 2, h - T * 2, TB], "melamine_black"),
        // Glass door
        box("Oven Door", "vertical", [0, h / 2, d / 2 - T / 2], [w - T * 2, h - T * 2, T * 0.5], "tinted_glass"),
        // Handle
        cyl("Handle", [0, h * 0.85, d / 2 + 0.01], 0.015, w * 0.6, "chrome"),
      ];
    },
  },

  {
    id: "appliance_washing",
    name: "Washing Machine",
    category: "appliances",
    icon: "🧺",
    description: "Washing machine box with round glass front window",
    dims: { w: 600, h: 850, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [
        // Body box
        box("Body Left", "vertical", [-w / 2 + T / 2, h / 2, 0], [T, h, d], "melamine_white"),
        box("Body Right", "vertical", [w / 2 - T / 2, h / 2, 0], [T, h, d], "melamine_white"),
        box("Body Top", "horizontal", [0, h - T / 2, 0], [w - T * 2, T, d], "melamine_white"),
        box("Body Bottom", "horizontal", [0, T / 2, 0], [w - T * 2, T, d], "melamine_white"),
        box("Body Back", "back", [0, h / 2, -d / 2 + TB / 2], [w - T * 2, h - T * 2, TB], "melamine_white"),
        // Front panel
        box("Front Panel", "vertical", [0, h / 2, d / 2 - T / 2], [w - T * 2, h - T * 2, T], "melamine_white"),
        // Round glass window (cylinder inset on front)
        cyl("Glass Window", [0, h * 0.45, d / 2], 0.30, 0.01, "glass"),
        // Control panel area
        box("Control Panel", "vertical", [0, h * 0.85, d / 2 - T / 2 + 0.001], [w * 0.6, h * 0.10, 0.005], "melamine_gray"),
      ];
    },
  },

  {
    id: "appliance_stove_gas",
    name: "Gas Stove",
    category: "appliances",
    icon: "🔥",
    description: "Flat stovetop with 4 cylindrical burners",
    dims: { w: 600, h: 50, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const burnerD = 0.08;
      const burnerH = h * 0.6;
      const ox = w * 0.22, oz = d * 0.22;
      return [
        // Flat top
        box("Stovetop", "horizontal", [0, h / 2, 0], [w, h, d], "melamine_black"),
        // 4 burners
        cyl("Burner FL", [-ox, h + burnerH / 2, oz], burnerD, burnerH, "steel"),
        cyl("Burner FR", [ox, h + burnerH / 2, oz], burnerD, burnerH, "steel"),
        cyl("Burner BL", [-ox, h + burnerH / 2, -oz], burnerD * 0.8, burnerH, "steel"),
        cyl("Burner BR", [ox, h + burnerH / 2, -oz], burnerD * 0.8, burnerH, "steel"),
      ];
    },
  },

  {
    id: "appliance_sink",
    name: "Kitchen Sink",
    category: "appliances",
    icon: "🚰",
    description: "Countertop with recessed basin",
    dims: { w: 800, h: 200, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const rimW = 0.04;
      const basinW = w * 0.6, basinD = d * 0.6, basinH = h - 0.02;
      return [
        // Countertop slab
        box("Countertop", "horizontal", [0, h - 0.01, 0], [w, 0.02, d], "marble_white"),
        // Basin walls (rim panels)
        box("Basin Front", "vertical", [0, h / 2 - 0.01, basinD / 2], [basinW, basinH, rimW], "steel"),
        box("Basin Back", "vertical", [0, h / 2 - 0.01, -basinD / 2], [basinW, basinH, rimW], "steel"),
        box("Basin Left", "vertical", [-basinW / 2, h / 2 - 0.01, 0], [rimW, basinH, basinD], "steel"),
        box("Basin Right", "vertical", [basinW / 2, h / 2 - 0.01, 0], [rimW, basinH, basinD], "steel"),
        // Basin bottom
        box("Basin Bottom", "horizontal", [0, 0.01, 0], [basinW - rimW, 0.01, basinD - rimW], "steel"),
        // Faucet
        cyl("Faucet", [0, h + 0.15, -d * 0.3], 0.02, 0.30, "chrome"),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // ROOM ELEMENTS
  // ════════════════════════════════════════════════════════

  {
    id: "room_door",
    name: "Standard Door",
    category: "room",
    icon: "🚪",
    description: "Standard door with frame (3 frame panels + door panel)",
    dims: { w: 900, h: 2100, d: 100 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const frameW = 0.06;
      const doorW = w - frameW * 2;
      const doorH = h - frameW;
      return [
        // Frame top
        box("Frame Top", "horizontal", [0, h - frameW / 2, 0], [w, frameW, d]),
        // Frame left
        box("Frame Left", "vertical", [-w / 2 + frameW / 2, h / 2, 0], [frameW, h, d]),
        // Frame right
        box("Frame Right", "vertical", [w / 2 - frameW / 2, h / 2, 0], [frameW, h, d]),
        // Door panel
        box("Door", "vertical", [0, doorH / 2, 0], [doorW, doorH, d * 0.6]),
      ];
    },
  },

  {
    id: "room_window",
    name: "Window",
    category: "room",
    icon: "🪟",
    description: "Window with frame and glass panel",
    dims: { w: 1200, h: 1000, d: 80 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const frameW = 0.05;
      return [
        // Frame
        box("Frame Top", "horizontal", [0, h - frameW / 2, 0], [w, frameW, d]),
        box("Frame Bottom", "horizontal", [0, frameW / 2, 0], [w, frameW, d]),
        box("Frame Left", "vertical", [-w / 2 + frameW / 2, h / 2, 0], [frameW, h - frameW * 2, d]),
        box("Frame Right", "vertical", [w / 2 - frameW / 2, h / 2, 0], [frameW, h - frameW * 2, d]),
        // Glass
        box("Glass", "vertical", [0, h / 2, 0], [w - frameW * 2, h - frameW * 2, d * 0.3], "glass"),
      ];
    },
  },

  {
    id: "room_radiator",
    name: "Radiator",
    category: "room",
    icon: "🔥",
    description: "Heating radiator with vertical fin panels",
    dims: { w: 800, h: 600, d: 100 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const finCount = Math.max(4, Math.round(w / 0.08));
      const finW = 0.008;
      const gap = (w - finW * finCount) / (finCount - 1);
      const panels: PanelData[] = [];
      for (let i = 0; i < finCount; i++) {
        const x = -w / 2 + finW / 2 + i * (finW + gap);
        panels.push(box(`Fin ${i + 1}`, "vertical", [x, h / 2, 0], [finW, h, d], "melamine_white"));
      }
      // Top and bottom rails
      panels.push(box("Top Rail", "horizontal", [0, h - 0.015, 0], [w, 0.03, d * 0.6], "melamine_white"));
      panels.push(box("Bottom Rail", "horizontal", [0, 0.015, 0], [w, 0.03, d * 0.6], "melamine_white"));
      return panels;
    },
  },

  {
    id: "room_toilet",
    name: "Toilet",
    category: "room",
    icon: "🚽",
    description: "Simplified toilet with base and bowl (box shapes)",
    dims: { w: 400, h: 750, d: 650 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [
        // Base/pedestal
        box("Base", "vertical", [0, 0.15, d * 0.1], [w * 0.7, 0.30, d * 0.6], "ceramic_white"),
        // Bowl
        box("Bowl", "horizontal", [0, 0.35, d * 0.15], [w * 0.8, 0.12, d * 0.5], "ceramic_white"),
        // Tank
        box("Tank", "vertical", [0, h * 0.55, -d / 2 + 0.10], [w * 0.75, h * 0.45, 0.18], "ceramic_white"),
        // Lid
        box("Lid", "horizontal", [0, h * 0.78, -d / 2 + 0.10], [w * 0.75, 0.02, 0.18], "ceramic_white"),
        // Seat
        box("Seat", "horizontal", [0, 0.42, d * 0.15], [w * 0.8, 0.02, d * 0.5], "melamine_white"),
      ];
    },
  },

  {
    id: "room_bathtub",
    name: "Bathtub",
    category: "room",
    icon: "🛁",
    description: "Bathtub with rim panels forming the tub shape",
    dims: { w: 1700, h: 600, d: 750 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const rimT = 0.05;
      const wallH = h;
      return [
        // Bottom
        box("Bottom", "horizontal", [0, rimT / 2, 0], [w - rimT * 2, rimT, d - rimT * 2], "ceramic_white"),
        // Walls
        box("Front Wall", "vertical", [0, wallH / 2, d / 2 - rimT / 2], [w, wallH, rimT], "ceramic_white"),
        box("Back Wall", "vertical", [0, wallH / 2, -d / 2 + rimT / 2], [w, wallH, rimT], "ceramic_white"),
        box("Left Wall", "vertical", [-w / 2 + rimT / 2, wallH / 2, 0], [rimT, wallH, d - rimT * 2], "ceramic_white"),
        box("Right Wall", "vertical", [w / 2 - rimT / 2, wallH / 2, 0], [rimT, wallH, d - rimT * 2], "ceramic_white"),
        // Rim (top edge)
        box("Rim Front", "horizontal", [0, h - 0.02, d / 2 - rimT / 2], [w, 0.04, rimT + 0.02], "ceramic_white"),
        box("Rim Back", "horizontal", [0, h - 0.02, -d / 2 + rimT / 2], [w, 0.04, rimT + 0.02], "ceramic_white"),
        // Faucet
        cyl("Faucet", [w * 0.35, h + 0.10, -d / 2 + rimT + 0.05], 0.025, 0.20, "chrome"),
      ];
    },
  },

  {
    id: "room_tv",
    name: "TV / Monitor",
    category: "room",
    icon: "📺",
    description: "Thin flat panel TV on a stand",
    dims: { w: 1200, h: 750, d: 80 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const screenT = 0.015;
      const standW = 0.30, standH = 0.05, standD = 0.20;
      const neckW = 0.06, neckH = 0.08;
      return [
        // Screen
        box("Screen", "vertical", [0, standH + neckH + (h - standH - neckH) / 2, 0], [w, h - standH - neckH, screenT], "melamine_black"),
        // Neck
        box("Neck", "vertical", [0, standH + neckH / 2, 0], [neckW, neckH, d], "melamine_black"),
        // Stand base
        box("Stand", "horizontal", [0, standH / 2, 0], [standW, standH, standD], "melamine_black"),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // DETAILS
  // ════════════════════════════════════════════════════════

  {
    id: "detail_cube",
    name: "Cube / Box",
    category: "details",
    icon: "📦",
    description: "Simple cube or box shape",
    dims: { w: 300, h: 300, d: 300 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [box("Box", "vertical", [0, h / 2, 0], [w, h, d])];
    },
  },

  {
    id: "detail_cylinder",
    name: "Cylinder",
    category: "details",
    icon: "🔵",
    description: "Simple cylinder shape",
    dims: { w: 200, h: 400, d: 200 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000;
      return [cyl("Cylinder", [0, h / 2, 0], w, h, "oak")];
    },
  },

  {
    id: "detail_countertop",
    name: "Countertop Slab",
    category: "details",
    icon: "🪨",
    description: "Wide thick countertop slab in marble",
    dims: { w: 1200, h: 35, d: 600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [box("Countertop", "horizontal", [0, h / 2, 0], [w, h, d], "marble_white")];
    },
  },

  {
    id: "detail_glass_panel",
    name: "Glass Panel",
    category: "details",
    icon: "🪟",
    description: "Flat glass panel",
    dims: { w: 600, h: 800, d: 10 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [box("Glass Panel", "vertical", [0, h / 2, 0], [w, h, d], "glass")];
    },
  },

  {
    id: "detail_mirror",
    name: "Mirror Panel",
    category: "details",
    icon: "🪞",
    description: "Mirror panel for walls or furniture",
    dims: { w: 600, h: 800, d: 10 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [box("Mirror", "vertical", [0, h / 2, 0], [w, h, d], "mirror")];
    },
  },

  {
    id: "detail_leg_round_thin",
    name: "Thin Round Leg",
    category: "details",
    icon: "🦯",
    description: "Thin round leg, 25mm diameter, 700mm tall",
    dims: { w: 25, h: 700, d: 25 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000;
      return [cyl("Thin Leg", [0, h / 2, 0], w, h)];
    },
  },

  {
    id: "detail_leg_round_thick",
    name: "Thick Round Leg",
    category: "details",
    icon: "🦯",
    description: "Thick round leg, 50mm diameter, 700mm tall",
    dims: { w: 50, h: 700, d: 50 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000;
      return [cyl("Thick Leg", [0, h / 2, 0], w, h)];
    },
  },

  {
    id: "detail_leg_square",
    name: "Square Leg",
    category: "details",
    icon: "🦯",
    description: "Square leg, 40x40mm cross-section, 700mm tall",
    dims: { w: 40, h: 700, d: 40 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      return [box("Square Leg", "vertical", [0, h / 2, 0], [w, h, d])];
    },
  },

  {
    id: "detail_leg_tapered",
    name: "Tapered Leg",
    category: "details",
    icon: "🦯",
    description: "Tapered leg (cone shape), 700mm tall",
    dims: { w: 50, h: 700, d: 50 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000;
      return [cone("Tapered Leg", [0, h / 2, 0], w, h)];
    },
  },

  {
    id: "detail_handle_bar",
    name: "Bar Handle",
    category: "details",
    icon: "➖",
    description: "Small bar handle (cylinder)",
    dims: { w: 15, h: 128, d: 15 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000;
      return [cyl("Bar Handle", [0, h / 2, 0], w, h, "chrome")];
    },
  },

  {
    id: "detail_handle_knob",
    name: "Knob Handle",
    category: "details",
    icon: "⚫",
    description: "Sphere knob handle",
    dims: { w: 30, h: 30, d: 30 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000;
      return [sphere("Knob Handle", [0, w / 2, 0], w)];
    },
  },

  // ════════════════════════════════════════════════════════
  // ADDITIONAL SEATING VARIANTS
  // ════════════════════════════════════════════════════════

  {
    id: "sofa_loveseat",
    name: "Loveseat Sofa",
    category: "seating",
    icon: "🛋️",
    description: "Compact 2-seater loveseat with cushions and short legs",
    dims: { w: 1400, h: 850, d: 900 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = 0.10;
      const seatH = 0.42; // deck top (sitting surface), not cushion center
      const armW = 0.10, armH = 0.58;
      const backT = 0.12;
      const cushW = (w - armW * 2) / 2;
      const cushD = d - backT - 0.05;
      const seatCushH = 0.12;
      const backCushH = 0.32;
      const seatCushionY = seatH + seatCushH / 2;
      const backCushionY = seatH + seatCushH - 0.018 + backCushH / 2;
      return [
        // Base fills from leg top to seat deck (no air gap under cushions)
        box("Base", "horizontal", [0, (legH + seatH) / 2, 0.03], [w - armW * 2, seatH - legH, cushD], "fabric_cream"),
        // Back
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_cream"),
        // Arms
        box("Left Arm", "vertical", [-w / 2 + armW / 2, (legH + armH) / 2 + legH / 2, 0], [armW, armH, d], "fabric_cream"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, (legH + armH) / 2 + legH / 2, 0], [armW, armH, d], "fabric_cream"),
        // Seat cushions (centered above deck)
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion L", position: [-cushW / 2, seatCushionY, 0.03] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion R", position: [cushW / 2, seatCushionY, 0.03] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        // Back cushions (rest on seat cushions)
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion L", position: [-cushW / 2, backCushionY, -d / 2 + backT + 0.06] as [number, number, number], size: [cushW - 0.02, backCushH, 0.12] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion R", position: [cushW / 2, backCushionY, -d / 2 + backT + 0.06] as [number, number, number], size: [cushW - 0.02, backCushH, 0.12] as [number, number, number], materialId: "fabric_cream" },
        // Legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], 0.035, legH),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, d / 2 - 0.08], 0.035, legH),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], 0.035, legH),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], 0.035, legH),
      ];
    },
  },

  {
    id: "armchair_recliner",
    name: "Recliner Armchair",
    category: "seating",
    icon: "💺",
    description: "Recliner armchair with thick seat, tall back, and footrest",
    dims: { w: 850, h: 1000, d: 900 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const baseH = 0.12;
      const seatH = 0.46;
      const armW = 0.14, armH = 0.60;
      const backT = 0.14;
      const footW = w - armW * 2, footH = 0.30, footD = 0.28;
      return [
        // Wide base
        box("Base", "horizontal", [0, baseH / 2, 0], [w, baseH, d], "leather_brown"),
        // Thick seat
        box("Seat", "horizontal", [0, seatH / 2 + baseH, 0.02], [w - armW * 2, seatH - baseH, d - backT - 0.05], "leather_brown"),
        // Tall back
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "leather_brown"),
        // Arms
        box("Left Arm", "vertical", [-w / 2 + armW / 2, (baseH + armH) / 2 + baseH / 2, 0], [armW, armH, d], "leather_brown"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, (baseH + armH) / 2 + baseH / 2, 0], [armW, armH, d], "leather_brown"),
        // Extended footrest panel
        box("Footrest", "horizontal", [0, seatH * 0.55, d / 2 + footD / 2 - 0.05], [footW, 0.06, footD], "leather_brown"),
      ];
    },
  },

  {
    id: "armchair_wing",
    name: "Wing Chair",
    category: "seating",
    icon: "💺",
    description: "Wing chair with tall back and angled side wings",
    dims: { w: 800, h: 1100, d: 850 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = 0.15;
      const seatH = 0.46;
      const armW = 0.06;
      const backT = 0.10;
      const wingH = h - seatH - 0.10;
      const wingD = 0.25;
      return [
        // Seat cushion
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion", position: [0, seatH + 0.05, 0.03] as [number, number, number], size: [w - armW * 2 - 0.04, 0.10, d - backT - 0.08] as [number, number, number], materialId: "fabric_cream" },
        // Seat frame
        box("Seat Frame", "horizontal", [0, seatH / 2 + legH, 0.02], [w - armW * 2, seatH - legH, d - backT - 0.05], "fabric_cream"),
        // Tall back
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_cream"),
        // Left wing (vertical panel angled outward)
        box("Left Wing", "vertical", [-w / 2 + armW / 2, seatH + wingH / 2, -d / 2 + backT + wingD / 2], [armW, wingH, wingD], "fabric_cream"),
        // Right wing (vertical panel angled outward)
        box("Right Wing", "vertical", [w / 2 - armW / 2, seatH + wingH / 2, -d / 2 + backT + wingD / 2], [armW, wingH, wingD], "fabric_cream"),
        // Legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], 0.035, legH),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, d / 2 - 0.08], 0.035, legH),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], 0.035, legH),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], 0.035, legH),
      ];
    },
  },

  {
    id: "stool_round",
    name: "Round Stool",
    category: "seating",
    icon: "🪑",
    description: "Round padded stool with 4 legs",
    dims: { w: 400, h: 480, d: 400 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const seatD = Math.min(w, d);
      const legH = h - 0.06;
      return [
        // Round padded seat (cylinder)
        cyl("Seat", [0, h - 0.03, 0], seatD * 0.90, 0.06, "fabric_cream"),
        // 4 legs
        cyl("Leg FL", [-w / 2 + 0.07, legH / 2, d / 2 - 0.07], 0.025, legH),
        cyl("Leg FR", [w / 2 - 0.07, legH / 2, d / 2 - 0.07], 0.025, legH),
        cyl("Leg BL", [-w / 2 + 0.07, legH / 2, -d / 2 + 0.07], 0.025, legH),
        cyl("Leg BR", [w / 2 - 0.07, legH / 2, -d / 2 + 0.07], 0.025, legH),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // ADDITIONAL TABLE VARIANTS
  // ════════════════════════════════════════════════════════

  {
    id: "table_desk_drawers",
    name: "Desk with Drawers",
    category: "tables",
    icon: "🖥️",
    description: "Desk with left drawer pedestal (3 drawers) and legs on right",
    dims: { w: 1400, h: 750, d: 700 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const pedW = 0.42;
      const drawerH = (h - T) / 3;
      const legD = 0.05;
      const legH = h - T;
      return [
        // Desktop
        box("Top", "horizontal", [0, h - T / 2, 0], [w, T, d]),
        // Left pedestal side panels
        box("Pedestal Left", "vertical", [-w / 2 + T / 2, (h - T) / 2, 0], [T, h - T, d]),
        box("Pedestal Right", "vertical", [-w / 2 + pedW - T / 2, (h - T) / 2, 0], [T, h - T, d]),
        box("Pedestal Back", "back", [-w / 2 + pedW / 2, (h - T) / 2, -d / 2 + TB / 2], [pedW - T * 2, h - T, TB]),
        box("Pedestal Bottom", "horizontal", [-w / 2 + pedW / 2, T / 2, 0], [pedW - T * 2, T, d - T]),
        // 3 drawer fronts
        { id: pid(), type: "vertical" as const, shape: "drawer_box" as PanelShape, label: "Drawer 1", position: [-w / 2 + pedW / 2, drawerH * 0.5, d / 2 - T / 2] as [number, number, number], size: [pedW - T * 2 - 0.004, drawerH - 0.006, T] as [number, number, number], materialId: "oak" },
        { id: pid(), type: "vertical" as const, shape: "drawer_box" as PanelShape, label: "Drawer 2", position: [-w / 2 + pedW / 2, drawerH * 1.5, d / 2 - T / 2] as [number, number, number], size: [pedW - T * 2 - 0.004, drawerH - 0.006, T] as [number, number, number], materialId: "oak" },
        { id: pid(), type: "vertical" as const, shape: "drawer_box" as PanelShape, label: "Drawer 3", position: [-w / 2 + pedW / 2, drawerH * 2.5, d / 2 - T / 2] as [number, number, number], size: [pedW - T * 2 - 0.004, drawerH - 0.006, T] as [number, number, number], materialId: "oak" },
        // Right side legs
        cyl("Leg FR", [w / 2 - 0.06, legH / 2, d / 2 - 0.06], legD, legH),
        cyl("Leg BR", [w / 2 - 0.06, legH / 2, -d / 2 + 0.06], legD, legH),
      ];
    },
  },

  // ════════════════════════════════════════════════════════
  // KENNEY-MATCHED SOFAS & SEATING
  // ════════════════════════════════════════════════════════

  {
    id: "sofa_corner",
    name: "Corner Sectional Sofa",
    category: "seating",
    icon: "🛋️",
    description: "L-shaped corner sectional sofa with cushions and 8 short legs",
    dims: { w: 2200, h: 850, d: 2200 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const seatH = 0.42, legH = 0.08;
      const armW = 0.10, armH = 0.58;
      const backT = 0.12;
      const mainW = w, mainD = 0.90;
      const sideW = 0.90, sideD = dp;
      const cushW = (mainW - armW - sideW) / 3;
      const cushWs = (sideD - armW - mainD) / 2;
      const seatCushH = 0.12;
      const seatCushionY = seatH + seatCushH / 2;
      return [
        // Main section base (to seat deck)
        box("Main Base", "horizontal", [-(w - sideW) / 2, (legH + seatH) / 2, -dp / 2 + mainD / 2], [mainW - sideW, seatH - legH, mainD - backT], "fabric_cream"),
        // Main back
        box("Main Back", "vertical", [-(w - sideW) / 2, (seatH + h) / 2, -dp / 2 + backT / 2], [mainW - sideW, h - seatH, backT], "fabric_cream"),
        // Main left arm
        box("Left Arm", "vertical", [-w / 2 + armW / 2, (legH + armH) / 2 + legH / 2, -dp / 2 + mainD / 2], [armW, armH, mainD], "fabric_cream"),
        // Corner section base
        box("Corner Base", "horizontal", [w / 2 - sideW / 2, (legH + seatH) / 2, 0], [sideW, seatH - legH, sideD - backT], "fabric_cream"),
        // Corner back (along the right side)
        box("Corner Back", "vertical", [w / 2 - backT / 2, (seatH + h) / 2, 0], [backT, h - seatH, sideD], "fabric_cream"),
        // Corner front arm
        box("Front Arm", "vertical", [w / 2 - sideW / 2, (legH + armH) / 2 + legH / 2, dp / 2 - armW / 2], [sideW, armH, armW], "fabric_cream"),
        // Main seat cushions (3)
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 1", position: [-w / 2 + armW + cushW * 0.5, seatCushionY, -dp / 2 + mainD / 2] as [number, number, number], size: [cushW - 0.02, seatCushH, mainD - backT - 0.04] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 2", position: [-w / 2 + armW + cushW * 1.5, seatCushionY, -dp / 2 + mainD / 2] as [number, number, number], size: [cushW - 0.02, seatCushH, mainD - backT - 0.04] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 3", position: [-w / 2 + armW + cushW * 2.5, seatCushionY, -dp / 2 + mainD / 2] as [number, number, number], size: [cushW - 0.02, seatCushH, mainD - backT - 0.04] as [number, number, number], materialId: "fabric_cream" },
        // Corner seat cushions (2)
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Corner Cushion 1", position: [w / 2 - sideW / 2, seatCushionY, -dp / 2 + mainD + cushWs * 0.5] as [number, number, number], size: [sideW - backT - 0.04, seatCushH, cushWs - 0.02] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Corner Cushion 2", position: [w / 2 - sideW / 2, seatCushionY, -dp / 2 + mainD + cushWs * 1.5] as [number, number, number], size: [sideW - backT - 0.04, seatCushH, cushWs - 0.02] as [number, number, number], materialId: "fabric_cream" },
        // 8 legs
        cyl("Leg 1", [-w / 2 + 0.06, legH / 2, -dp / 2 + 0.06], 0.035, legH),
        cyl("Leg 2", [-w / 2 + 0.06, legH / 2, -dp / 2 + mainD - 0.06], 0.035, legH),
        cyl("Leg 3", [w / 2 - sideW - 0.06, legH / 2, -dp / 2 + 0.06], 0.035, legH),
        cyl("Leg 4", [w / 2 - sideW - 0.06, legH / 2, -dp / 2 + mainD - 0.06], 0.035, legH),
        cyl("Leg 5", [w / 2 - 0.06, legH / 2, -dp / 2 + 0.06], 0.035, legH),
        cyl("Leg 6", [w / 2 - 0.06, legH / 2, dp / 2 - 0.06], 0.035, legH),
        cyl("Leg 7", [w / 2 - sideW + 0.06, legH / 2, dp / 2 - 0.06], 0.035, legH),
        cyl("Leg 8", [w / 2 - sideW + 0.06, legH / 2, -dp / 2 + mainD + 0.06], 0.035, legH),
      ];
    },
  },

  {
    id: "sofa_design",
    name: "Modern Design Sofa",
    category: "seating",
    icon: "🛋️",
    description: "Low-profile modern sofa with thin arms and metal legs",
    dims: { w: 1800, h: 700, d: 850 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = 0.15, seatH = 0.36;
      const armW = 0.05, armH = 0.40;
      const backT = 0.06, backH = h - seatH;
      const cushW = (w - armW * 2) / 3;
      const cushD = dp - backT - 0.06;
      const seatCushH = 0.1;
      const seatCushionY = seatH + seatCushH / 2;
      return [
        // Seat deck to cushion bottom (was thin strip with large air gap)
        box("Frame", "horizontal", [0, (legH + seatH) / 2, 0.02], [w - armW * 2, seatH - legH, cushD], "oak"),
        // Low back
        box("Back", "vertical", [0, seatH + backH / 2, -dp / 2 + backT / 2], [w - armW * 2, backH, backT], "fabric_cream"),
        // Thin arms
        box("Left Arm", "vertical", [-w / 2 + armW / 2, legH + armH / 2, 0], [armW, armH, dp * 0.8], "fabric_cream"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, legH + armH / 2, 0], [armW, armH, dp * 0.8], "fabric_cream"),
        // 3 seat cushions
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 1", position: [-cushW, seatCushionY, 0.02] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 2", position: [0, seatCushionY, 0.02] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 3", position: [cushW, seatCushionY, 0.02] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        // 4 tapered metal legs
        cone("Leg FL", [-w / 2 + 0.10, legH / 2, dp / 2 - 0.10], 0.03, legH, "black_metal"),
        cone("Leg FR", [w / 2 - 0.10, legH / 2, dp / 2 - 0.10], 0.03, legH, "black_metal"),
        cone("Leg BL", [-w / 2 + 0.10, legH / 2, -dp / 2 + 0.10], 0.03, legH, "black_metal"),
        cone("Leg BR", [w / 2 - 0.10, legH / 2, -dp / 2 + 0.10], 0.03, legH, "black_metal"),
      ];
    },
  },

  {
    id: "sofa_design_corner",
    name: "Design Corner Sofa",
    category: "seating",
    icon: "🛋️",
    description: "L-shaped modern design corner sofa with thin profile and metal legs",
    dims: { w: 2400, h: 700, d: 2400 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = 0.15, seatH = 0.36;
      const armW = 0.05, armH = 0.40;
      const backT = 0.06, backH = h - seatH;
      const mainD = 0.85, sideW = 0.85;
      const seatCushH = 0.1;
      const seatCushionY = seatH + seatCushH / 2;
      return [
        // Main section frame (full deck height)
        box("Main Frame", "horizontal", [-(w - sideW) / 2, (legH + seatH) / 2, -dp / 2 + mainD / 2], [w - sideW, seatH - legH, mainD - backT], "oak"),
        // Main back
        box("Main Back", "vertical", [-(w - sideW) / 2, seatH + backH / 2, -dp / 2 + backT / 2], [w - sideW, backH, backT], "fabric_cream"),
        // Left arm
        box("Left Arm", "vertical", [-w / 2 + armW / 2, legH + armH / 2, -dp / 2 + mainD / 2], [armW, armH, mainD * 0.8], "fabric_cream"),
        // Corner section frame
        box("Corner Frame", "horizontal", [w / 2 - sideW / 2, (legH + seatH) / 2, 0], [sideW, seatH - legH, dp - backT], "oak"),
        // Corner back (right side)
        box("Corner Back", "vertical", [w / 2 - backT / 2, seatH + backH / 2, 0], [backT, backH, dp], "fabric_cream"),
        // Front arm
        box("Front Arm", "vertical", [w / 2 - sideW / 2, legH + armH / 2, dp / 2 - armW / 2], [sideW * 0.8, armH, armW], "fabric_cream"),
        // Main cushions
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Main Cushion 1", position: [-(w - sideW) / 2 - 0.30, seatCushionY, -dp / 2 + mainD / 2] as [number, number, number], size: [0.58, seatCushH, mainD - backT - 0.06] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Main Cushion 2", position: [-(w - sideW) / 2 + 0.30, seatCushionY, -dp / 2 + mainD / 2] as [number, number, number], size: [0.58, seatCushH, mainD - backT - 0.06] as [number, number, number], materialId: "fabric_cream" },
        // Corner cushion
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Corner Cushion", position: [w / 2 - sideW / 2, seatCushionY, 0] as [number, number, number], size: [sideW - backT - 0.04, seatCushH, dp - mainD - armW] as [number, number, number], materialId: "fabric_cream" },
        // 6 tapered metal legs
        cone("Leg 1", [-w / 2 + 0.10, legH / 2, -dp / 2 + 0.10], 0.03, legH, "black_metal"),
        cone("Leg 2", [-w / 2 + 0.10, legH / 2, -dp / 2 + mainD - 0.10], 0.03, legH, "black_metal"),
        cone("Leg 3", [w / 2 - sideW - 0.10, legH / 2, -dp / 2 + 0.10], 0.03, legH, "black_metal"),
        cone("Leg 4", [w / 2 - 0.10, legH / 2, -dp / 2 + 0.10], 0.03, legH, "black_metal"),
        cone("Leg 5", [w / 2 - 0.10, legH / 2, dp / 2 - 0.10], 0.03, legH, "black_metal"),
        cone("Leg 6", [w / 2 - sideW + 0.10, legH / 2, dp / 2 - 0.10], 0.03, legH, "black_metal"),
      ];
    },
  },

  {
    id: "sofa_long",
    name: "4-Seater Long Sofa",
    category: "seating",
    icon: "🛋️",
    description: "Extra-wide 4-seater sofa with 4 cushions and short legs",
    dims: { w: 2600, h: 850, d: 900 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = 0.10, seatH = 0.42;
      const armW = 0.10, armH = 0.58;
      const backT = 0.12;
      const cushW = (w - armW * 2) / 4;
      const cushD = dp - backT - 0.05;
      const seatCushH = 0.12;
      const backCushH = 0.32;
      const seatCushionY = seatH + seatCushH / 2;
      const backCushionY = seatH + seatCushH - 0.018 + backCushH / 2;
      return [
        box("Base", "horizontal", [0, (legH + seatH) / 2, 0.03], [w - armW * 2, seatH - legH, cushD], "fabric_cream"),
        // Back
        box("Back", "vertical", [0, (seatH + h) / 2, -dp / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_cream"),
        // Arms
        box("Left Arm", "vertical", [-w / 2 + armW / 2, (legH + armH) / 2 + legH / 2, 0], [armW, armH, dp], "fabric_cream"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, (legH + armH) / 2 + legH / 2, 0], [armW, armH, dp], "fabric_cream"),
        // 4 seat cushions
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 1", position: [-w / 2 + armW + cushW * 0.5, seatCushionY, 0.03] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 2", position: [-w / 2 + armW + cushW * 1.5, seatCushionY, 0.03] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 3", position: [-w / 2 + armW + cushW * 2.5, seatCushionY, 0.03] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion 4", position: [-w / 2 + armW + cushW * 3.5, seatCushionY, 0.03] as [number, number, number], size: [cushW - 0.02, seatCushH, cushD] as [number, number, number], materialId: "fabric_cream" },
        // 4 back cushions
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion 1", position: [-w / 2 + armW + cushW * 0.5, backCushionY, -dp / 2 + backT + 0.06] as [number, number, number], size: [cushW - 0.02, backCushH, 0.12] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion 2", position: [-w / 2 + armW + cushW * 1.5, backCushionY, -dp / 2 + backT + 0.06] as [number, number, number], size: [cushW - 0.02, backCushH, 0.12] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion 3", position: [-w / 2 + armW + cushW * 2.5, backCushionY, -dp / 2 + backT + 0.06] as [number, number, number], size: [cushW - 0.02, backCushH, 0.12] as [number, number, number], materialId: "fabric_cream" },
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion 4", position: [-w / 2 + armW + cushW * 3.5, backCushionY, -dp / 2 + backT + 0.06] as [number, number, number], size: [cushW - 0.02, backCushH, 0.12] as [number, number, number], materialId: "fabric_cream" },
        // Legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, dp / 2 - 0.08], 0.035, legH),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, dp / 2 - 0.08], 0.035, legH),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -dp / 2 + 0.08], 0.035, legH),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -dp / 2 + 0.08], 0.035, legH),
      ];
    },
  },

  {
    id: "sofa_ottoman",
    name: "Ottoman / Footrest",
    category: "seating",
    icon: "🛋️",
    description: "Low padded ottoman with single cushion top and 4 short legs",
    dims: { w: 600, h: 400, d: 600 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = 0.08;
      return [
        // Base box
        box("Base", "horizontal", [0, legH + (h - legH - 0.12) / 2, 0], [w - 0.02, h - legH - 0.12, dp - 0.02], "fabric_cream"),
        // Top cushion
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Cushion", position: [0, h - 0.06, 0] as [number, number, number], size: [w - 0.02, 0.12, dp - 0.02] as [number, number, number], materialId: "fabric_cream" },
        // 4 legs
        cyl("Leg FL", [-w / 2 + 0.06, legH / 2, dp / 2 - 0.06], 0.03, legH),
        cyl("Leg FR", [w / 2 - 0.06, legH / 2, dp / 2 - 0.06], 0.03, legH),
        cyl("Leg BL", [-w / 2 + 0.06, legH / 2, -dp / 2 + 0.06], 0.03, legH),
        cyl("Leg BR", [w / 2 - 0.06, legH / 2, -dp / 2 + 0.06], 0.03, legH),
      ];
    },
  },

  {
    id: "armchair_lounge",
    name: "Lounge Chair",
    category: "seating",
    icon: "💺",
    description: "Reclined-back lounge chair with wide seat and short legs",
    dims: { w: 750, h: 800, d: 850 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = 0.10, seatH = 0.40;
      const armW = 0.10, armH = 0.50;
      const backT = 0.12;
      return [
        // Wide seat
        box("Seat", "horizontal", [0, seatH / 2 + legH, 0.04], [w - armW * 2, seatH - legH, dp - backT - 0.06], "fabric_cream"),
        // Reclined back (slightly tilted via deeper thickness)
        box("Back", "vertical", [0, (seatH + h) / 2, -dp / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_cream"),
        // Arms
        box("Left Arm", "vertical", [-w / 2 + armW / 2, (legH + armH) / 2 + legH / 2, 0.02], [armW, armH, dp * 0.85], "fabric_cream"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, (legH + armH) / 2 + legH / 2, 0.02], [armW, armH, dp * 0.85], "fabric_cream"),
        // Seat cushion (deck = seatH)
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion", position: [0, seatH + 0.05, 0.04] as [number, number, number], size: [w - armW * 2 - 0.04, 0.10, dp - backT - 0.10] as [number, number, number], materialId: "fabric_cream" },
        // Legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, dp / 2 - 0.08], 0.035, legH),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, dp / 2 - 0.08], 0.035, legH),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -dp / 2 + 0.08], 0.035, legH),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -dp / 2 + 0.08], 0.035, legH),
      ];
    },
  },

  {
    id: "armchair_relax",
    name: "Relax Lounge Chair",
    category: "seating",
    icon: "💺",
    description: "Deep recline lounge chair with attached ottoman section",
    dims: { w: 750, h: 900, d: 1000 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = 0.10, seatH = 0.38;
      const armW = 0.10, armH = 0.50;
      const backT = 0.14;
      const chairD = 0.60, ottomanD = dp - chairD - 0.05;
      return [
        // Chair seat
        box("Seat", "horizontal", [0, seatH / 2 + legH, -dp / 2 + chairD / 2], [w - armW * 2, seatH - legH, chairD - backT], "fabric_cream"),
        // Tall reclined back
        box("Back", "vertical", [0, (seatH + h) / 2, -dp / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_cream"),
        // Arms
        box("Left Arm", "vertical", [-w / 2 + armW / 2, (legH + armH) / 2 + legH / 2, -dp / 2 + chairD / 2], [armW, armH, chairD], "fabric_cream"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, (legH + armH) / 2 + legH / 2, -dp / 2 + chairD / 2], [armW, armH, chairD], "fabric_cream"),
        // Seat cushion
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion", position: [0, seatH + 0.05, -dp / 2 + chairD / 2] as [number, number, number], size: [w - armW * 2 - 0.04, 0.10, chairD - backT - 0.06] as [number, number, number], materialId: "fabric_cream" },
        // Ottoman section
        box("Ottoman Base", "horizontal", [0, seatH / 2 + legH, dp / 2 - ottomanD / 2], [w - armW * 2, seatH - legH, ottomanD], "fabric_cream"),
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Ottoman Cushion", position: [0, seatH + 0.05, dp / 2 - ottomanD / 2] as [number, number, number], size: [w - armW * 2 - 0.04, 0.10, ottomanD - 0.04] as [number, number, number], materialId: "fabric_cream" },
        // Legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, dp / 2 - 0.08], 0.035, legH),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, dp / 2 - 0.08], 0.035, legH),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -dp / 2 + 0.08], 0.035, legH),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -dp / 2 + 0.08], 0.035, legH),
      ];
    },
  },

  {
    id: "armchair_design",
    name: "Design Accent Chair",
    category: "seating",
    icon: "💺",
    description: "Minimal design accent chair with thin seat/back and visible legs",
    dims: { w: 650, h: 750, d: 700 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = 0.38, seatH = 0.40;
      const backT = 0.04, backH = h - seatH;
      return [
        // Thin seat (top ≈ seatH)
        box("Seat", "horizontal", [0, seatH - 0.025, 0.03], [w * 0.85, 0.05, dp - 0.12], "fabric_cream"),
        // Thin back
        box("Back", "vertical", [0, seatH + backH / 2, -dp / 2 + backT / 2], [w * 0.85, backH, backT], "fabric_cream"),
        // Seat cushion on deck
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion", position: [0, seatH + 0.04, 0.03] as [number, number, number], size: [w * 0.80, 0.08, dp - 0.16] as [number, number, number], materialId: "fabric_cream" },
        // 4 visible tapered legs
        cone("Leg FL", [-w / 2 + 0.08, legH / 2, dp / 2 - 0.08], 0.025, legH, "black_metal"),
        cone("Leg FR", [w / 2 - 0.08, legH / 2, dp / 2 - 0.08], 0.025, legH, "black_metal"),
        cone("Leg BL", [-w / 2 + 0.08, legH / 2, -dp / 2 + 0.08], 0.025, legH, "black_metal"),
        cone("Leg BR", [w / 2 - 0.08, legH / 2, -dp / 2 + 0.08], 0.025, legH, "black_metal"),
      ];
    },
  },

  {
    id: "chair_cushion",
    name: "Chair with Cushion",
    category: "seating",
    icon: "🪑",
    description: "Basic wood chair with fabric seat cushion",
    dims: { w: 450, h: 900, d: 500 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const seatH = 0.45, legD = 0.03;
      return [
        // Wood seat
        box("Seat", "horizontal", [0, seatH, 0], [w, T, dp], "oak"),
        // Fabric cushion on top
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion", position: [0, seatH + T / 2 + 0.025, 0] as [number, number, number], size: [w - 0.04, 0.05, dp - 0.04] as [number, number, number], materialId: "fabric_cream" },
        // Back
        box("Back", "vertical", [0, (seatH + h) / 2, -dp / 2 + T / 2], [w, h - seatH, T], "oak"),
        // 4 legs
        cyl("Leg FL", [-w / 2 + 0.04, seatH / 2, dp / 2 - 0.04], legD, seatH, "oak"),
        cyl("Leg FR", [w / 2 - 0.04, seatH / 2, dp / 2 - 0.04], legD, seatH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.04, seatH / 2, -dp / 2 + 0.04], legD, seatH, "oak"),
        cyl("Leg BR", [w / 2 - 0.04, seatH / 2, -dp / 2 + 0.04], legD, seatH, "oak"),
      ];
    },
  },

  {
    id: "chair_modern_cushion",
    name: "Modern Cushion Chair",
    category: "seating",
    icon: "🪑",
    description: "Shell-style seat on thin metal legs",
    dims: { w: 500, h: 800, d: 500 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const seatH = 0.44, legD = 0.02;
      const shellH = h - seatH;
      return [
        // Shell seat (rounded)
        { id: pid(), type: "horizontal" as const, shape: "rounded_rect" as PanelShape, label: "Shell Seat", position: [0, seatH, 0.02] as [number, number, number], size: [w - 0.04, 0.06, dp - 0.06] as [number, number, number], materialId: "fabric_cream" },
        // Shell back (curved)
        { id: pid(), type: "vertical" as const, shape: "rounded_rect" as PanelShape, label: "Shell Back", position: [0, seatH + shellH / 2, -dp / 2 + 0.03] as [number, number, number], size: [w - 0.06, shellH, 0.04] as [number, number, number], materialId: "fabric_cream" },
        // Seat cushion
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Cushion", position: [0, seatH + 0.05, 0.02] as [number, number, number], size: [w - 0.10, 0.06, dp - 0.12] as [number, number, number], materialId: "fabric_cream" },
        // 4 thin metal legs
        cyl("Leg FL", [-w / 2 + 0.06, seatH / 2, dp / 2 - 0.06], legD, seatH),
        cyl("Leg FR", [w / 2 - 0.06, seatH / 2, dp / 2 - 0.06], legD, seatH),
        cyl("Leg BL", [-w / 2 + 0.06, seatH / 2, -dp / 2 + 0.06], legD, seatH),
        cyl("Leg BR", [w / 2 - 0.06, seatH / 2, -dp / 2 + 0.06], legD, seatH),
      ];
    },
  },

  {
    id: "chair_modern_frame",
    name: "Modern Frame Chair",
    category: "seating",
    icon: "🪑",
    description: "Wire/tube frame chair with cushion seat",
    dims: { w: 550, h: 850, d: 550 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const seatH = 0.45, tubeD = 0.025;
      return [
        // Metal frame - seat rails
        box("Frame Front", "horizontal", [0, seatH, dp / 2 - 0.02], [w, tubeD, tubeD], "black_metal"),
        box("Frame Back", "horizontal", [0, seatH, -dp / 2 + 0.02], [w, tubeD, tubeD], "black_metal"),
        box("Frame Left", "horizontal", [-w / 2 + 0.02, seatH, 0], [tubeD, tubeD, dp], "black_metal"),
        box("Frame Right", "horizontal", [w / 2 - 0.02, seatH, 0], [tubeD, tubeD, dp], "black_metal"),
        // Seat cushion
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion", position: [0, seatH + 0.05, 0] as [number, number, number], size: [w - 0.08, 0.08, dp - 0.08] as [number, number, number], materialId: "fabric_cream" },
        // Back frame
        box("Back Frame L", "vertical", [-w / 2 + 0.02, (seatH + h) / 2, -dp / 2 + 0.02], [tubeD, h - seatH, tubeD], "black_metal"),
        box("Back Frame R", "vertical", [w / 2 - 0.02, (seatH + h) / 2, -dp / 2 + 0.02], [tubeD, h - seatH, tubeD], "black_metal"),
        box("Back Frame Top", "horizontal", [0, h - tubeD / 2, -dp / 2 + 0.02], [w - 0.04, tubeD, tubeD], "black_metal"),
        // Back cushion
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion", position: [0, seatH + (h - seatH) / 2, -dp / 2 + 0.05] as [number, number, number], size: [w - 0.10, h - seatH - 0.08, 0.06] as [number, number, number], materialId: "fabric_cream" },
        // 4 tube legs
        cyl("Leg FL", [-w / 2 + 0.02, seatH / 2, dp / 2 - 0.02], tubeD, seatH),
        cyl("Leg FR", [w / 2 - 0.02, seatH / 2, dp / 2 - 0.02], tubeD, seatH),
        cyl("Leg BL", [-w / 2 + 0.02, seatH / 2, -dp / 2 + 0.02], tubeD, seatH),
        cyl("Leg BR", [w / 2 - 0.02, seatH / 2, -dp / 2 + 0.02], tubeD, seatH),
      ];
    },
  },

  {
    id: "chair_rounded",
    name: "Rounded Dining Chair",
    category: "seating",
    icon: "🪑",
    description: "Dining chair with curved back and round seat",
    dims: { w: 480, h: 850, d: 480 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const seatH = 0.45, legD = 0.028;
      const seatDiam = Math.min(w, dp) * 0.90;
      return [
        // Round seat (cylinder)
        cyl("Seat", [0, seatH, 0], seatDiam, 0.04, "oak"),
        // Curved back (rounded_rect)
        { id: pid(), type: "vertical" as const, shape: "rounded_rect" as PanelShape, label: "Back", position: [0, (seatH + h) / 2, -dp / 2 + 0.02] as [number, number, number], size: [w * 0.85, h - seatH, 0.02] as [number, number, number], materialId: "oak" },
        // 4 legs
        cyl("Leg FL", [-w / 2 + 0.07, seatH / 2, dp / 2 - 0.07], legD, seatH, "oak"),
        cyl("Leg FR", [w / 2 - 0.07, seatH / 2, dp / 2 - 0.07], legD, seatH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.07, seatH / 2, -dp / 2 + 0.07], legD, seatH, "oak"),
        cyl("Leg BR", [w / 2 - 0.07, seatH / 2, -dp / 2 + 0.07], legD, seatH, "oak"),
      ];
    },
  },

  {
    id: "stool_bar_square",
    name: "Square Bar Stool",
    category: "seating",
    icon: "🪑",
    description: "Bar stool with square seat and 4 tall legs",
    dims: { w: 400, h: 750, d: 400 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = h - T;
      const legD = 0.028;
      return [
        // Square seat
        box("Seat", "horizontal", [0, h - T / 2, 0], [w, T, dp], "oak"),
        // Footrest bar
        box("Footrest", "horizontal", [0, legH * 0.35, 0], [w - 0.06, 0.02, 0.02], "black_metal"),
        // 4 tall legs
        cyl("Leg FL", [-w / 2 + 0.05, legH / 2, dp / 2 - 0.05], legD, legH),
        cyl("Leg FR", [w / 2 - 0.05, legH / 2, dp / 2 - 0.05], legD, legH),
        cyl("Leg BL", [-w / 2 + 0.05, legH / 2, -dp / 2 + 0.05], legD, legH),
        cyl("Leg BR", [w / 2 - 0.05, legH / 2, -dp / 2 + 0.05], legD, legH),
      ];
    },
  },

  {
    id: "bench_simple",
    name: "Simple Bench",
    category: "seating",
    icon: "🪑",
    description: "Long bench with no back and 4 legs",
    dims: { w: 1200, h: 450, d: 400 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const legH = h - T;
      const legD = 0.04;
      return [
        // Seat plank
        box("Seat", "horizontal", [0, h - T / 2, 0], [w, T, dp], "oak"),
        // 4 legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, dp / 2 - 0.06], legD, legH, "oak"),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, dp / 2 - 0.06], legD, legH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -dp / 2 + 0.06], legD, legH, "oak"),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -dp / 2 + 0.06], legD, legH, "oak"),
      ];
    },
  },

  {
    id: "bench_cushion",
    name: "Bench with Cushion",
    category: "seating",
    icon: "🪑",
    description: "Long bench with fabric seat cushion and 4 legs",
    dims: { w: 1200, h: 480, d: 400 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const cushH = 0.06;
      const legH = h - T - cushH;
      const legD = 0.04;
      return [
        // Seat plank
        box("Seat", "horizontal", [0, h - cushH - T / 2, 0], [w, T, dp], "oak"),
        // Fabric cushion
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Cushion", position: [0, h - cushH / 2, 0] as [number, number, number], size: [w - 0.04, cushH, dp - 0.04] as [number, number, number], materialId: "fabric_cream" },
        // 4 legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, dp / 2 - 0.06], legD, legH, "oak"),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, dp / 2 - 0.06], legD, legH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -dp / 2 + 0.06], legD, legH, "oak"),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -dp / 2 + 0.06], legD, legH, "oak"),
      ];
    },
  },

  {
    id: "bench_cushion_low",
    name: "Low Bench with Cushion",
    category: "seating",
    icon: "🪑",
    description: "Low bench with fabric seat cushion and 4 short legs",
    dims: { w: 1200, h: 380, d: 400 },
    buildPanels: (d) => {
      _pid = 0;
      const w = d.w / 1000, h = d.h / 1000, dp = d.d / 1000;
      const cushH = 0.06;
      const legH = h - T - cushH;
      const legD = 0.04;
      return [
        // Seat plank
        box("Seat", "horizontal", [0, h - cushH - T / 2, 0], [w, T, dp], "oak"),
        // Fabric cushion
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Cushion", position: [0, h - cushH / 2, 0] as [number, number, number], size: [w - 0.04, cushH, dp - 0.04] as [number, number, number], materialId: "fabric_cream" },
        // 4 short legs
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, dp / 2 - 0.06], legD, legH, "oak"),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, dp / 2 - 0.06], legD, legH, "oak"),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -dp / 2 + 0.06], legD, legH, "oak"),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -dp / 2 + 0.06], legD, legH, "oak"),
      ];
    },
  },

  // ═══════════════ TABLES (Kenney matches) ═══════════════

  // Kenney: table (basic 4-leg)
  {
    id: "table_basic", name: "Basic Table", category: "tables", icon: "🍽️",
    description: "Simple 4-leg table", dims: { w: 1000, h: 750, d: 600 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - 0.015, 0], [w, TC, dp]),
        ...fourLegsInset(w, h, dp, h - TC, 0.04, 0.06),
      ];
    },
  },
  // Kenney: tableCloth
  {
    id: "table_cloth", name: "Table with Cloth", category: "tables", icon: "🍽️",
    description: "Table with draped cloth", dims: { w: 1000, h: 750, d: 600 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - 0.015, 0], [w, TC, dp]),
        box("Cloth", "horizontal", [0, h - 0.005, 0], [w + 0.10, 0.005, dp + 0.10], "melamine_white"),
        ...fourLegsInset(w, h, dp, h - TC, 0.04, 0.06),
      ];
    },
  },
  // Kenney: tableCross
  {
    id: "table_cross", name: "Cross-Leg Table", category: "tables", icon: "🍽️",
    description: "Table with X-crossed legs", dims: { w: 1200, h: 750, d: 700 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - 0.015, 0], [w, TC, dp]),
        { id: pid(), type: "back" as const, shape: "cross_brace" as PanelShape, label: "Left X-Leg", position: [-w/2 + 0.10, (h - TC)/2, 0] as [number,number,number], size: [0.06, h - TC, dp - 0.12] as [number,number,number], materialId: "oak" },
        { id: pid(), type: "back" as const, shape: "cross_brace" as PanelShape, label: "Right X-Leg", position: [w/2 - 0.10, (h - TC)/2, 0] as [number,number,number], size: [0.06, h - TC, dp - 0.12] as [number,number,number], materialId: "oak" },
      ];
    },
  },
  // Kenney: tableGlass
  {
    id: "table_glass", name: "Glass Table", category: "tables", icon: "🍽️",
    description: "Table with glass top and metal legs", dims: { w: 1200, h: 750, d: 700 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Glass Top", "horizontal", [0, h - 0.008, 0], [w, 0.012, dp], "glass"),
        ...fourLegsInset(w, h, dp, h - 0.012, 0.04, 0.06, "chrome"),
      ];
    },
  },
  // Kenney: tableRound
  {
    id: "table_round", name: "Round Table", category: "tables", icon: "🍽️",
    description: "Round pedestal table", dims: { w: 900, h: 750, d: 900 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000;
      return [
        { id: pid(), type: "horizontal" as const, shape: "cylinder" as PanelShape, label: "Round Top", position: [0, h - 0.015, 0] as [number,number,number], size: [w, TC, w] as [number,number,number], materialId: "oak" },
        cyl("Pedestal", [0, (h - TC) / 2, 0], 0.08, h - TC, "black_metal"),
        { id: pid(), type: "horizontal" as const, shape: "cylinder" as PanelShape, label: "Base", position: [0, 0.015, 0] as [number,number,number], size: [0.45, 0.03, 0.45] as [number,number,number], materialId: "black_metal" },
      ];
    },
  },
  // Kenney: tableCoffeeGlassSquare
  {
    id: "table_coffee_glass_sq", name: "Square Glass Coffee Table", category: "tables", icon: "☕",
    description: "Low glass coffee table, square", dims: { w: 800, h: 400, d: 800 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Glass Top", "horizontal", [0, h - 0.006, 0], [w, 0.012, dp], "glass"),
        ...fourLegsInset(w, h, dp, h - 0.012, 0.035, 0.05, "chrome"),
      ];
    },
  },

  // ═══════════════ DESKS (Kenney matches) ═══════════════

  // Kenney: desk (basic)
  {
    id: "desk_basic", name: "Basic Desk", category: "desks", icon: "🖥️",
    description: "Simple desk with drawer", dims: { w: 1200, h: 750, d: 600 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Leg", "vertical", [w/2 - 0.04, h*0.4/2, -dp/2 + 0.04], [0.04, h*0.4, 0.04], "black_metal"),
        box("Right Leg 2", "vertical", [w/2 - 0.04, h*0.4/2, dp/2 - 0.04], [0.04, h*0.4, 0.04], "black_metal"),
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer", position: [-w/4, h*0.55, 0] as [number,number,number], size: [w*0.35, 0.12, dp - 0.04] as [number,number,number], materialId: "oak" },
      ];
    },
  },
  // Kenney: deskCorner
  {
    id: "desk_corner", name: "Corner Desk", category: "desks", icon: "🖥️",
    description: "L-shaped corner desk", dims: { w: 1600, h: 750, d: 1600 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      const legH = h - T;
      return [
        box("Main Top", "horizontal", [0, h - T/2, dp/4], [w, T, dp/2]),
        box("Side Top", "horizontal", [w/4, h - T/2, 0], [w/2, T, dp]),
        cyl("Leg FL", [-w/2 + 0.06, legH/2, dp/2 - 0.06], 0.04, legH, "black_metal"),
        cyl("Leg FR", [w/2 - 0.06, legH/2, dp/2 - 0.06], 0.04, legH, "black_metal"),
        cyl("Leg BL", [-w/2 + 0.06, legH/2, 0], 0.04, legH, "black_metal"),
        cyl("Leg BR", [w/2 - 0.06, legH/2, -dp/2 + 0.06], 0.04, legH, "black_metal"),
        cyl("Leg Corner", [w/4, legH/2, dp/4], 0.04, legH, "black_metal"),
      ];
    },
  },

  // ═══════════════ BOOKSHELVES (Kenney matches) ═══════════════

  // Kenney: bookcaseClosed
  {
    id: "bookcase_closed", name: "Closed Bookcase", category: "bookshelves", icon: "📚",
    description: "Tall bookcase with back panel", dims: { w: 800, h: 1800, d: 300 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      const shelves = 5;
      const panels: PanelData[] = [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
      ];
      for (let i = 1; i < shelves; i++) {
        const y = T + (h - T*2) * (i / shelves);
        panels.push(box(`Shelf ${i}`, "horizontal", [0, y, 0], [w - T*2, T, dp - TB]));
      }
      return panels;
    },
  },
  // Kenney: bookcaseClosedDoors
  {
    id: "bookcase_doors", name: "Bookcase with Doors", category: "bookshelves", icon: "📚",
    description: "Bookcase with bottom doors", dims: { w: 800, h: 1800, d: 300 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      const doorH = h * 0.35;
      const panels: PanelData[] = [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        box("Mid Shelf", "horizontal", [0, doorH, 0], [w - T*2, T, dp - TB]),
        box("Shelf 2", "horizontal", [0, doorH + (h - doorH)/3, 0], [w - T*2, T, dp - TB]),
        box("Shelf 3", "horizontal", [0, doorH + 2*(h - doorH)/3, 0], [w - T*2, T, dp - TB]),
        box("Left Door", "vertical", [-w/4, doorH/2, -dp/2 + T/2], [w/2 - T, doorH - T*2, T]),
        box("Right Door", "vertical", [w/4, doorH/2, -dp/2 + T/2], [w/2 - T, doorH - T*2, T]),
      ];
      return panels;
    },
  },
  // Kenney: bookcaseClosedWide
  {
    id: "bookcase_wide", name: "Wide Bookcase", category: "bookshelves", icon: "📚",
    description: "Wide tall bookcase", dims: { w: 1200, h: 1800, d: 300 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      const panels: PanelData[] = [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        box("Divider", "vertical", [0, h/2, 0], [T, h - T*2, dp - TB]),
      ];
      for (let i = 1; i <= 4; i++) {
        const y = T + (h - T*2) * (i / 5);
        panels.push(box(`Shelf ${i}`, "horizontal", [0, y, 0], [w - T*2, T, dp - TB]));
      }
      return panels;
    },
  },
  // Kenney: bookcaseOpenLow
  {
    id: "bookcase_low", name: "Low Open Bookcase", category: "bookshelves", icon: "📚",
    description: "Low open shelving unit", dims: { w: 800, h: 900, d: 300 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Shelf 1", "horizontal", [0, h * 0.33, 0], [w - T*2, T, dp]),
        box("Shelf 2", "horizontal", [0, h * 0.66, 0], [w - T*2, T, dp]),
      ];
    },
  },

  // ═══════════════ CHAIRS (separate category) ═══════════════

  // Kenney: chairDesk (office/desk chair on wheels)
  {
    id: "chair_desk", name: "Desk Chair", category: "chairs", icon: "💺",
    description: "Office desk chair with wheels", dims: { w: 550, h: 900, d: 550 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      const seatH = 0.48;
      return [
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat", position: [0, seatH + 0.03, 0] as [number,number,number], size: [w, 0.06, dp] as [number,number,number], materialId: "fabric_cream" },
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Backrest", position: [0, (seatH + 0.06) + (h - seatH - 0.06) / 2, dp/2 - 0.04] as [number,number,number], size: [w*0.85, h - seatH - 0.06, 0.05] as [number,number,number], materialId: "fabric_cream" },
        cyl("Pedestal", [0, seatH/2, 0], 0.06, seatH - 0.03, "chrome"),
        cyl("Base", [0, 0.015, 0], 0.50, 0.03, "black_metal"),
        box("Armrest L", "horizontal", [-w/2 + 0.04, seatH + 0.10, 0], [0.04, 0.02, dp*0.5], "black_metal"),
        box("Armrest R", "horizontal", [w/2 - 0.04, seatH + 0.10, 0], [0.04, 0.02, dp*0.5], "black_metal"),
      ];
    },
  },

  // ═══════════════ BATHROOM (Kenney matches) ═══════════════

  // Kenney: bathroomCabinet
  {
    id: "bathroom_cabinet", name: "Bathroom Cabinet", category: "bathroom", icon: "🚿",
    description: "Under-sink vanity cabinet", dims: { w: 600, h: 650, d: 400 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp], "marble_white"),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        box("Left Door", "vertical", [-w/4, h/2, -dp/2 + T/2], [w/2 - T, h - T*2, T], "melamine_white"),
        box("Right Door", "vertical", [w/4, h/2, -dp/2 + T/2], [w/2 - T, h - T*2, T], "melamine_white"),
      ];
    },
  },
  // Kenney: bathroomCabinetDrawer
  {
    id: "bathroom_drawer_cabinet", name: "Bathroom Drawer Cabinet", category: "bathroom", icon: "🚿",
    description: "Vanity with drawers", dims: { w: 600, h: 650, d: 400 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      const drawerH = (h - T*3) / 3;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp], "marble_white"),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer 1", position: [0, T + drawerH/2, 0] as [number,number,number], size: [w - T*2 - 0.01, drawerH, dp - TB - 0.01] as [number,number,number], materialId: "melamine_white" },
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer 2", position: [0, T*2 + drawerH*1.5, 0] as [number,number,number], size: [w - T*2 - 0.01, drawerH, dp - TB - 0.01] as [number,number,number], materialId: "melamine_white" },
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer 3", position: [0, T*3 + drawerH*2.5, 0] as [number,number,number], size: [w - T*2 - 0.01, drawerH, dp - TB - 0.01] as [number,number,number], materialId: "melamine_white" },
      ];
    },
  },

  // ═══════════════ KITCHEN EXTRAS (Kenney matches) ═══════════════

  // Kenney: kitchenCabinetCornerInner
  {
    id: "kitchen_corner_inner", name: "Kitchen Corner (Inner)", category: "kitchen", icon: "🍳",
    description: "Inner corner base cabinet", dims: { w: 600, h: 850, d: 600 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, h/2 - TC/2, 0], [T, h - TC, dp]),
        box("Back Side", "vertical", [0, h/2 - TC/2, dp/2 - T/2], [w, h - TC, T]),
        box("Counter", "horizontal", [0, h - TC/2, 0], [w, TC, dp], "marble_white"),
        box("Bottom", "horizontal", [0, T/2, 0], [w - T, T, dp - T]),
      ];
    },
  },
  // Kenney: kitchenCabinetCornerRound
  {
    id: "kitchen_corner_round", name: "Kitchen Corner (Rounded)", category: "kitchen", icon: "🍳",
    description: "Rounded corner cabinet", dims: { w: 600, h: 850, d: 600 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, h/2 - TC/2, 0], [T, h - TC, dp]),
        box("Back Side", "vertical", [0, h/2 - TC/2, dp/2 - T/2], [w, h - TC, T]),
        box("Counter", "horizontal", [0, h - TC/2, 0], [w, TC, dp], "marble_white"),
        box("Bottom", "horizontal", [0, T/2, 0], [w - T, T, dp - T]),
        { id: pid(), type: "vertical" as const, shape: "cylinder" as PanelShape, label: "Curved Door", position: [-w/2 + 0.02, h/2 - TC/2, -dp/2 + 0.02] as [number,number,number], size: [w*0.6, h - TC - T*2, w*0.6] as [number,number,number], materialId: "melamine_white" },
      ];
    },
  },
  // Kenney: kitchenCabinetDrawer
  {
    id: "kitchen_cabinet_drawer", name: "Kitchen Drawer Cabinet", category: "kitchen", icon: "🍳",
    description: "Base cabinet with drawers", dims: { w: 600, h: 850, d: 560 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      const bodyH = h - TC;
      const drawerH = (bodyH - T*2) / 3;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, bodyH/2, 0], [T, bodyH, dp]),
        box("Right Side", "vertical", [w/2 - T/2, bodyH/2, 0], [T, bodyH, dp]),
        box("Counter", "horizontal", [0, h - TC/2, 0], [w, TC, dp], "marble_white"),
        box("Bottom", "horizontal", [0, T/2, 0], [w - T*2, T, dp]),
        box("Back", "back", [0, bodyH/2, dp/2 - TB/2], [w - T*2, bodyH - T, TB]),
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer 1", position: [0, T + drawerH*0.5, -dp/4] as [number,number,number], size: [w - T*2 - 0.02, drawerH - 0.01, dp/2] as [number,number,number], materialId: "melamine_white" },
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer 2", position: [0, T + drawerH*1.5, -dp/4] as [number,number,number], size: [w - T*2 - 0.02, drawerH - 0.01, dp/2] as [number,number,number], materialId: "melamine_white" },
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer 3", position: [0, T + drawerH*2.5, -dp/4] as [number,number,number], size: [w - T*2 - 0.02, drawerH - 0.01, dp/2] as [number,number,number], materialId: "melamine_white" },
      ];
    },
  },
  // Kenney: kitchenCabinetUpperCorner
  {
    id: "kitchen_upper_corner", name: "Upper Corner Cabinet", category: "kitchen", icon: "🍳",
    description: "Corner wall cabinet", dims: { w: 600, h: 700, d: 300 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Back", "vertical", [0, h/2, dp/2 - T/2], [w, h, T]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Shelf", "horizontal", [0, h/2, 0], [w - T, T, dp - T]),
      ];
    },
  },
  // Kenney: kitchenCabinetUpperDouble
  {
    id: "kitchen_upper_double", name: "Upper Double Cabinet", category: "kitchen", icon: "🍳",
    description: "Wide wall cabinet with 2 doors", dims: { w: 900, h: 700, d: 300 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        box("Shelf", "horizontal", [0, h/2, 0], [w - T*2, T, dp - TB]),
        box("Left Door", "vertical", [-w/4, h/2, -dp/2 + T/2], [w/2 - T, h - T*2, T]),
        box("Right Door", "vertical", [w/4, h/2, -dp/2 + T/2], [w/2 - T, h - T*2, T]),
      ];
    },
  },
  // Kenney: kitchenCabinetUpperLow
  {
    id: "kitchen_upper_low", name: "Low Wall Cabinet", category: "kitchen", icon: "🍳",
    description: "Short wall cabinet", dims: { w: 600, h: 400, d: 300 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        box("Door", "vertical", [0, h/2, -dp/2 + T/2], [w - T*2, h - T*2, T]),
      ];
    },
  },
  // Kenney: kitchenBar
  {
    id: "kitchen_bar", name: "Kitchen Bar", category: "kitchen", icon: "🍳",
    description: "Kitchen bar/counter section", dims: { w: 600, h: 1050, d: 400 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Counter", "horizontal", [0, h - TC/2, 0], [w, TC, dp], "marble_white"),
        box("Left Side", "vertical", [-w/2 + T/2, h/2 - TC/2, 0], [T, h - TC, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2 - TC/2, 0], [T, h - TC, dp]),
        box("Back", "back", [0, h/2 - TC/2, dp/2 - TB/2], [w - T*2, h - TC, TB]),
      ];
    },
  },
  // Kenney: kitchenBarEnd
  {
    id: "kitchen_bar_end", name: "Kitchen Bar End", category: "kitchen", icon: "🍳",
    description: "Bar counter end piece with overhang", dims: { w: 600, h: 1050, d: 600 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Counter", "horizontal", [0, h - TC/2, -0.10], [w, TC, dp + 0.20], "marble_white"),
        box("Left Side", "vertical", [-w/2 + T/2, h/2 - TC/2, 0], [T, h - TC, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2 - TC/2, 0], [T, h - TC, dp]),
        box("Back", "back", [0, h/2 - TC/2, dp/2 - TB/2], [w - T*2, h - TC, TB]),
        box("Front", "vertical", [0, h/2 - TC/2, -dp/2 + T/2], [w - T*2, h - TC, T]),
      ];
    },
  },

  // ═══════════════ OUTDOOR (Kenney matches) ═══════════════

  // Kenney: sideTable
  {
    id: "side_table_basic", name: "Side Table", category: "tables", icon: "🍽️",
    description: "Small side/end table", dims: { w: 450, h: 550, d: 450 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        ...fourLegsInset(w, h, dp, h - T, 0.035, 0.05),
      ];
    },
  },
  // Kenney: sideTableDrawers
  {
    id: "side_table_drawers", name: "Side Table with Drawers", category: "dressers", icon: "📺",
    description: "Small table with 2 drawers", dims: { w: 450, h: 550, d: 400 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer 1", position: [0, h*0.35, 0] as [number,number,number], size: [w - T*2 - 0.02, (h - T*2)*0.4, dp - TB - 0.02] as [number,number,number], materialId: "oak" },
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer 2", position: [0, h*0.70, 0] as [number,number,number], size: [w - T*2 - 0.02, (h - T*2)*0.4, dp - TB - 0.02] as [number,number,number], materialId: "oak" },
      ];
    },
  },

  // ═══════════════ TV & ENTERTAINMENT ═══════════════

  // Kenney: cabinetTelevision
  {
    id: "cabinet_tv", name: "TV Cabinet", category: "dressers", icon: "📺",
    description: "Open TV stand", dims: { w: 1200, h: 500, d: 400 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Shelf", "horizontal", [0, h/2, 0], [w - T*2, T, dp - TB]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
      ];
    },
  },
  // Kenney: cabinetTelevisionDoors
  {
    id: "cabinet_tv_doors", name: "TV Cabinet with Doors", category: "dressers", icon: "📺",
    description: "TV stand with cabinet doors", dims: { w: 1200, h: 500, d: 400 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Divider L", "vertical", [-w/4, h/2, 0], [T, h - T*2, dp - TB]),
        box("Divider R", "vertical", [w/4, h/2, 0], [T, h - T*2, dp - TB]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        box("Left Door", "vertical", [-w*3/8, h/2, -dp/2 + T/2], [w/4 - T, h - T*2, T]),
        box("Right Door", "vertical", [w*3/8, h/2, -dp/2 + T/2], [w/4 - T, h - T*2, T]),
      ];
    },
  },

  // ═══════════════ BED ACCESSORIES ═══════════════

  // Kenney: cabinetBed (nightstand no drawer)
  {
    id: "nightstand_basic", name: "Basic Nightstand", category: "dressers", icon: "🛏️",
    description: "Simple bedside table", dims: { w: 400, h: 500, d: 350 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Shelf", "horizontal", [0, h*0.45, 0], [w - T*2, T, dp]),
      ];
    },
  },
  // Kenney: cabinetBedDrawer
  {
    id: "nightstand_drawer", name: "Nightstand with Drawer", category: "dressers", icon: "🛏️",
    description: "Bedside table with drawer", dims: { w: 400, h: 500, d: 350 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Bottom", "horizontal", [0, T/2, 0], [w, T, dp]),
        box("Back", "back", [0, h/2, dp/2 - TB/2], [w - T*2, h - T*2, TB]),
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer", position: [0, h*0.65, 0] as [number,number,number], size: [w - T*2 - 0.02, h*0.25, dp - TB - 0.02] as [number,number,number], materialId: "oak" },
        box("Open Shelf", "horizontal", [0, h*0.30, 0], [w - T*2, T, dp - TB]),
      ];
    },
  },
  // Kenney: cabinetBedDrawerTable
  {
    id: "nightstand_table", name: "Nightstand Table", category: "dressers", icon: "🛏️",
    description: "Modern nightstand with open shelf", dims: { w: 400, h: 550, d: 350 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      return [
        box("Top", "horizontal", [0, h - T/2, 0], [w, T, dp]),
        box("Left Side", "vertical", [-w/2 + T/2, h/2, 0], [T, h, dp]),
        box("Right Side", "vertical", [w/2 - T/2, h/2, 0], [T, h, dp]),
        box("Bottom", "horizontal", [0, 0.08, 0], [w, T, dp]),
        box("Shelf", "horizontal", [0, h*0.40, 0], [w - T*2, T, dp]),
        { id: pid(), type: "horizontal" as const, shape: "drawer_box" as PanelShape, label: "Drawer", position: [0, h*0.70, 0] as [number,number,number], size: [w - T*2 - 0.02, h*0.20, dp - 0.04] as [number,number,number], materialId: "oak" },
      ];
    },
  },

  // ═══════════════ BUNK BED ═══════════════

  {
    id: "bed_bunk", name: "Bunk Bed", category: "beds", icon: "🛏️",
    description: "Stacked double bunk bed", dims: { w: 1000, h: 1700, d: 2000 },
    buildPanels: (d) => {
      const w = d.w/1000, h = d.h/1000, dp = d.d/1000;
      const postW = 0.06;
      const bottomSlat = 0.30;
      const topSlat = h * 0.55;
      return [
        // 4 corner posts
        box("Post FL", "vertical", [-w/2 + postW/2, h/2, -dp/2 + postW/2], [postW, h, postW]),
        box("Post FR", "vertical", [w/2 - postW/2, h/2, -dp/2 + postW/2], [postW, h, postW]),
        box("Post BL", "vertical", [-w/2 + postW/2, h/2, dp/2 - postW/2], [postW, h, postW]),
        box("Post BR", "vertical", [w/2 - postW/2, h/2, dp/2 - postW/2], [postW, h, postW]),
        // Bottom bed
        box("Bottom Slats", "horizontal", [0, bottomSlat, 0], [w - postW*2, T, dp - postW*2]),
        box("Bottom Side Rail L", "horizontal", [-w/2 + postW, bottomSlat + 0.05, 0], [T, 0.10, dp - postW*2]),
        box("Bottom Side Rail R", "horizontal", [w/2 - postW, bottomSlat + 0.05, 0], [T, 0.10, dp - postW*2]),
        { id: pid(), type: "horizontal" as const, shape: "mattress" as PanelShape, label: "Bottom Mattress", position: [0, bottomSlat + 0.10, 0] as [number,number,number], size: [w - postW*2 - 0.04, 0.15, dp - postW*2 - 0.04] as [number,number,number], materialId: "melamine_white" },
        // Top bed
        box("Top Slats", "horizontal", [0, topSlat, 0], [w - postW*2, T, dp - postW*2]),
        box("Top Side Rail L", "horizontal", [-w/2 + postW, topSlat + 0.05, 0], [T, 0.10, dp - postW*2]),
        box("Top Side Rail R", "horizontal", [w/2 - postW, topSlat + 0.05, 0], [T, 0.10, dp - postW*2]),
        { id: pid(), type: "horizontal" as const, shape: "mattress" as PanelShape, label: "Top Mattress", position: [0, topSlat + 0.10, 0] as [number,number,number], size: [w - postW*2 - 0.04, 0.15, dp - postW*2 - 0.04] as [number,number,number], materialId: "melamine_white" },
        // Ladder
        box("Ladder Rail L", "vertical", [w/2 - 0.02, (bottomSlat + topSlat)/2 + 0.10, -dp/2 + 0.10], [0.03, topSlat - bottomSlat + 0.10, 0.03]),
        box("Ladder Rail R", "vertical", [w/2 - 0.02, (bottomSlat + topSlat)/2 + 0.10, -dp/2 + 0.30], [0.03, topSlat - bottomSlat + 0.10, 0.03]),
      ];
    },
  },
];
