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
  { id: "tables", label: "Tables", icon: "🪑" },
  { id: "cabinets", label: "Cabinets", icon: "🗄️" },
  { id: "wardrobes", label: "Wardrobes", icon: "👔" },
  { id: "dressers", label: "Dressers & Stands", icon: "📺" },
  { id: "beds", label: "Beds", icon: "🛏️" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "seating", label: "Seating", icon: "🛋️" },
  { id: "appliances", label: "Appliances", icon: "🧊" },
  { id: "room", label: "Room Elements", icon: "🚪" },
  { id: "details", label: "Details", icon: "🔧" },
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
    description: "2-seater sofa with base, back, and 2 arms",
    dims: { w: 1600, h: 850, d: 900 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const seatH = 0.42, seatD = d - 0.10;
      const armW = 0.10, armH = 0.60;
      const backT = 0.12;
      return [
        // Seat base
        box("Seat", "horizontal", [0, seatH / 2, 0.05], [w - armW * 2, seatH, seatD], "fabric_gray"),
        // Back
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_gray"),
        // Arms
        box("Left Arm", "vertical", [-w / 2 + armW / 2, armH / 2, 0], [armW, armH, d], "fabric_gray"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, armH / 2, 0], [armW, armH, d], "fabric_gray"),
      ];
    },
  },

  {
    id: "sofa_3seat",
    name: "3-Seater Sofa",
    category: "seating",
    icon: "🛋️",
    description: "Wide 3-seater sofa with base, back, and 2 arms",
    dims: { w: 2200, h: 850, d: 900 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const seatH = 0.42, seatD = d - 0.10;
      const armW = 0.10, armH = 0.60;
      const backT = 0.12;
      return [
        box("Seat", "horizontal", [0, seatH / 2, 0.05], [w - armW * 2, seatH, seatD], "fabric_gray"),
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_gray"),
        box("Left Arm", "vertical", [-w / 2 + armW / 2, armH / 2, 0], [armW, armH, d], "fabric_gray"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, armH / 2, 0], [armW, armH, d], "fabric_gray"),
      ];
    },
  },

  {
    id: "sofa_l_shape",
    name: "L-Shaped Sectional",
    category: "seating",
    icon: "🛋️",
    description: "L-shaped sectional sofa with chaise extension",
    dims: { w: 2600, h: 850, d: 1600 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const seatH = 0.42;
      const armW = 0.10, armH = 0.60;
      const backT = 0.12;
      const mainD = 0.90;
      const chaiseW = 0.90;
      return [
        // Main sofa seat
        box("Main Seat", "horizontal", [-(w - chaiseW) / 2 + armW / 2, seatH / 2, -d / 2 + mainD / 2], [w - chaiseW - armW, seatH, mainD], "fabric_gray"),
        // Main back
        box("Main Back", "vertical", [-(w - chaiseW) / 2, (seatH + h) / 2, -d / 2 + backT / 2], [w - chaiseW, h - seatH, backT], "fabric_gray"),
        // Chaise seat
        box("Chaise Seat", "horizontal", [w / 2 - chaiseW / 2, seatH / 2, 0], [chaiseW, seatH, d], "fabric_gray"),
        // Chaise back (along the side)
        box("Chaise Back", "vertical", [w / 2 - backT / 2, (seatH + h) / 2, 0], [backT, h - seatH, d], "fabric_gray"),
        // Left arm
        box("Left Arm", "vertical", [-w / 2 + armW / 2, armH / 2, -d / 2 + mainD / 2], [armW, armH, mainD], "fabric_gray"),
      ];
    },
  },

  {
    id: "sofa_bed",
    name: "Sofa Bed",
    category: "seating",
    icon: "🛋️",
    description: "Sofa bed with deeper seat and lower back",
    dims: { w: 2000, h: 750, d: 1000 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const seatH = 0.38;
      const armW = 0.10, armH = 0.55;
      const backT = 0.12;
      return [
        box("Seat", "horizontal", [0, seatH / 2, 0.05], [w - armW * 2, seatH, d - 0.15], "fabric_gray"),
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_gray"),
        box("Left Arm", "vertical", [-w / 2 + armW / 2, armH / 2, 0], [armW, armH, d], "fabric_gray"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, armH / 2, 0], [armW, armH, d], "fabric_gray"),
      ];
    },
  },

  {
    id: "armchair_classic",
    name: "Classic Armchair",
    category: "seating",
    icon: "💺",
    description: "Classic armchair with seat, back, wide arms, and 4 short legs",
    dims: { w: 800, h: 850, d: 800 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = 0.12;
      const seatH = 0.42;
      const armW = 0.12, armH = 0.55;
      const backT = 0.10;
      return [
        box("Seat", "horizontal", [0, seatH / 2 + legH, 0.03], [w - armW * 2, seatH - legH, d - 0.15], "leather_brown"),
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "leather_brown"),
        box("Left Arm", "vertical", [-w / 2 + armW / 2, (legH + armH) / 2 + legH / 2, 0], [armW, armH, d], "leather_brown"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, (legH + armH) / 2 + legH / 2, 0], [armW, armH, d], "leather_brown"),
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], 0.035, legH),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, d / 2 - 0.08], 0.035, legH),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], 0.035, legH),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], 0.035, legH),
      ];
    },
  },

  {
    id: "armchair_modern",
    name: "Modern Accent Chair",
    category: "seating",
    icon: "💺",
    description: "Modern accent chair with thin frame and angled legs",
    dims: { w: 700, h: 800, d: 750 },
    buildPanels: (dims) => {
      _pid = 0;
      const w = dims.w / 1000, h = dims.h / 1000, d = dims.d / 1000;
      const legH = 0.35;
      const seatH = 0.40;
      const armW = 0.05, armH = 0.22;
      const backT = 0.06;
      return [
        box("Seat", "horizontal", [0, seatH, 0.03], [w - armW * 2, 0.08, d - 0.12], "velvet_navy"),
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "velvet_navy"),
        box("Left Arm", "vertical", [-w / 2 + armW / 2, seatH + armH / 2, 0], [armW, armH, d * 0.6], "velvet_navy"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, seatH + armH / 2, 0], [armW, armH, d * 0.6], "velvet_navy"),
        // Angled legs (using cones)
        cone("Leg FL", [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], 0.025, legH, "black_metal"),
        cone("Leg FR", [w / 2 - 0.08, legH / 2, d / 2 - 0.08], 0.025, legH, "black_metal"),
        cone("Leg BL", [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], 0.025, legH, "black_metal"),
        cone("Leg BR", [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], 0.025, legH, "black_metal"),
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
        box("Seat", "horizontal", [0, seatH, 0.03], [seatW, 0.06, seatD], "fabric_gray"),
        // Back
        box("Back", "vertical", [0, (seatH + h) / 2, -seatD / 2 + 0.03], [seatW * 0.9, h - seatH - 0.06, 0.05], "fabric_gray"),
        // Pedestal
        cyl("Pedestal", [0, seatH / 2, 0], 0.05, seatH, "chrome"),
        // Star base
        box("Base Arm 1", "horizontal", [0, 0.03, 0], [w, 0.03, 0.04], "black_metal"),
        box("Base Arm 2", "horizontal", [0, 0.03, 0], [0.04, 0.03, d], "black_metal"),
      ];
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
      const seatH = 0.42;
      const armW = 0.10, armH = 0.58;
      const backT = 0.12;
      const cushW = (w - armW * 2) / 2;
      const cushD = d - backT - 0.05;
      return [
        // Base frame
        box("Base", "horizontal", [0, legH + 0.04, 0.03], [w - armW * 2, 0.08, cushD], "fabric_gray"),
        // Back
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_gray"),
        // Arms
        box("Left Arm", "vertical", [-w / 2 + armW / 2, (legH + armH) / 2 + legH / 2, 0], [armW, armH, d], "fabric_gray"),
        box("Right Arm", "vertical", [w / 2 - armW / 2, (legH + armH) / 2 + legH / 2, 0], [armW, armH, d], "fabric_gray"),
        // Seat cushions
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion L", position: [-cushW / 2, seatH, 0.03] as [number, number, number], size: [cushW - 0.02, 0.12, cushD] as [number, number, number], materialId: "fabric_gray" },
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion R", position: [cushW / 2, seatH, 0.03] as [number, number, number], size: [cushW - 0.02, 0.12, cushD] as [number, number, number], materialId: "fabric_gray" },
        // Back cushions
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion L", position: [-cushW / 2, seatH + 0.28, -d / 2 + backT + 0.06] as [number, number, number], size: [cushW - 0.02, 0.32, 0.12] as [number, number, number], materialId: "fabric_gray" },
        { id: pid(), type: "vertical" as const, shape: "cushion" as PanelShape, label: "Back Cushion R", position: [cushW / 2, seatH + 0.28, -d / 2 + backT + 0.06] as [number, number, number], size: [cushW - 0.02, 0.32, 0.12] as [number, number, number], materialId: "fabric_gray" },
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
        { id: pid(), type: "horizontal" as const, shape: "cushion" as PanelShape, label: "Seat Cushion", position: [0, seatH + 0.04, 0.03] as [number, number, number], size: [w - armW * 2 - 0.04, 0.10, d - backT - 0.08] as [number, number, number], materialId: "fabric_gray" },
        // Seat frame
        box("Seat Frame", "horizontal", [0, seatH / 2 + legH, 0.02], [w - armW * 2, seatH - legH, d - backT - 0.05], "fabric_gray"),
        // Tall back
        box("Back", "vertical", [0, (seatH + h) / 2, -d / 2 + backT / 2], [w - armW * 2, h - seatH, backT], "fabric_gray"),
        // Left wing (vertical panel angled outward)
        box("Left Wing", "vertical", [-w / 2 + armW / 2, seatH + wingH / 2, -d / 2 + backT + wingD / 2], [armW, wingH, wingD], "fabric_gray"),
        // Right wing (vertical panel angled outward)
        box("Right Wing", "vertical", [w / 2 - armW / 2, seatH + wingH / 2, -d / 2 + backT + wingD / 2], [armW, wingH, wingD], "fabric_gray"),
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
        cyl("Seat", [0, h - 0.03, 0], seatD * 0.90, 0.06, "fabric_gray"),
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
];
