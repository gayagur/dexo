import { useState } from "react";
import { X, Search } from "lucide-react";
import type { PanelData, PanelShape } from "@/lib/furnitureData";

// ─── Part definition ───────────────────────────────────

let _addPid = 9000;
function addPid(): string { return `add-${++_addPid}`; }
function p(label: string, type: PanelData["type"], pos: [number,number,number], size: [number,number,number], mat: string, shape?: PanelShape, params?: Record<string,number>): PanelData {
  return { id: addPid(), type, label, position: pos, size, materialId: mat, ...(shape && shape !== "box" ? { shape } : {}), ...(params ? { shapeParams: params } : {}) };
}
function cy(label: string, pos: [number,number,number], dia: number, h: number, mat: string): PanelData {
  return { id: addPid(), type: "vertical", shape: "cylinder" as PanelShape, label, position: pos, size: [dia, h, dia], materialId: mat };
}
function sp(label: string, pos: [number,number,number], dia: number, mat: string): PanelData {
  return { id: addPid(), type: "vertical", shape: "sphere" as PanelShape, label, position: pos, size: [dia, dia, dia], materialId: mat };
}

interface PartPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  shape: PanelShape;
  type: PanelData["type"];
  size: [number, number, number];
  materialId: string;
  shapeParams?: Record<string, number>;
  /** When true, spawns centered on the selected panel’s top (or highest horizontal surface). */
  placeOnSelected?: boolean;
  /** Multi-part items: when set, adds a GROUP with these panels instead of a single panel */
  buildPanels?: () => PanelData[];
  /** Group name when buildPanels is used */
  groupName?: string;
}

interface PartCategory {
  label: string;
  icon: string;
  items: PartPreset[];
}

const PART_CATEGORIES: PartCategory[] = [
  // ─────────────────────────────────────────────────
  // 0. QUICK — ON SELECTED SURFACE
  // ─────────────────────────────────────────────────
  {
    label: "On selected surface",
    icon: "⌖",
    items: [
      {
        id: "on_throw_pillow",
        label: "Throw pillow",
        icon: "▢",
        description: "Select a seat or top, then add",
        shape: "cushion",
        type: "horizontal",
        size: [0.4, 0.1, 0.4],
        materialId: "fabric_gray",
        placeOnSelected: true,
      },
      {
        id: "on_seat_cushion",
        label: "Seat cushion",
        icon: "▭",
        description: "Low cushion on selection",
        shape: "cushion",
        type: "horizontal",
        size: [0.48, 0.06, 0.45],
        materialId: "fabric_blue",
        placeOnSelected: true,
      },
      {
        id: "on_mattress_pad",
        label: "Mattress pad",
        icon: "▬",
        description: "Thin mattress layer",
        shape: "mattress",
        type: "horizontal",
        size: [1.0, 0.12, 1.9],
        materialId: "fabric_green",
        placeOnSelected: true,
      },
      {
        id: "on_vase",
        label: "Vase",
        icon: "◍",
        description: "Small vase on table / shelf",
        shape: "vase",
        type: "vertical",
        size: [0.07, 0.22, 0.07],
        materialId: "ceramic_white",
        placeOnSelected: true,
      },
      {
        id: "on_books",
        label: "Books",
        icon: "≡",
        description: "Book stack on surface",
        shape: "books",
        type: "horizontal",
        size: [0.18, 0.22, 0.13],
        materialId: "oak",
        placeOnSelected: true,
      },
      {
        id: "on_basket",
        label: "Basket",
        icon: "◯",
        description: "Basket on surface",
        shape: "basket",
        type: "horizontal",
        size: [0.28, 0.16, 0.22],
        materialId: "oak",
        placeOnSelected: true,
      },
      {
        id: "on_bowl",
        label: "Decor bowl",
        icon: "◠",
        description: "Shallow bowl / decor",
        shape: "half_sphere",
        type: "horizontal",
        size: [0.16, 0.07, 0.16],
        materialId: "brass",
        placeOnSelected: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 1. PANELS
  // ─────────────────────────────────────────────────
  {
    label: "Panels",
    icon: "▬",
    items: [
      {
        id: "h_panel", label: "Rectangle Panel", icon: "━",
        description: "Shelf, tabletop, seat",
        shape: "box", type: "horizontal",
        size: [0.6, 0.018, 0.4], materialId: "oak",
      },
      {
        id: "v_panel", label: "Vertical Panel", icon: "┃",
        description: "Side, divider, partition",
        shape: "box", type: "vertical",
        size: [0.018, 0.6, 0.4], materialId: "oak",
      },
      {
        id: "back_panel", label: "Back Panel", icon: "▣",
        description: "Back, backer board",
        shape: "box", type: "back",
        size: [0.6, 0.6, 0.006], materialId: "plywood",
      },
      {
        id: "rounded_rect", label: "Rounded Rectangle", icon: "▢",
        description: "Rounded corners, adjustable radius",
        shape: "rounded_rect", type: "horizontal",
        size: [0.5, 0.018, 0.35], materialId: "oak",
        shapeParams: { cornerRadius: 0.02 },
      },
      {
        id: "circle_panel", label: "Circle / Round", icon: "●",
        description: "Round tabletop, shelf",
        shape: "circle_panel", type: "horizontal",
        size: [0.5, 0.018, 0.5], materialId: "oak",
      },
      {
        id: "oval_panel", label: "Oval / Ellipse", icon: "⬮",
        description: "Oval tabletop, mirror",
        shape: "oval", type: "horizontal",
        size: [0.6, 0.018, 0.4], materialId: "oak",
      },
      {
        id: "triangle_panel", label: "Triangle", icon: "△",
        description: "Corner shelf, decorative",
        shape: "triangle", type: "horizontal",
        size: [0.4, 0.018, 0.35], materialId: "oak",
      },
      {
        id: "trapezoid_panel", label: "Trapezoid", icon: "⏢",
        description: "Tapered shelf or desk",
        shape: "trapezoid", type: "horizontal",
        size: [0.5, 0.018, 0.35], materialId: "oak",
        shapeParams: { topRatio: 0.6 },
      },
      {
        id: "l_shape_panel", label: "L-Shape", icon: "⌐",
        description: "Corner desk, L-bracket panel",
        shape: "l_shape", type: "horizontal",
        size: [0.6, 0.018, 0.6], materialId: "oak",
        shapeParams: { thickness: 0.35 },
      },
      {
        id: "u_shape_panel", label: "U-Shape", icon: "⊔",
        description: "Channel, U-bracket panel",
        shape: "u_shape", type: "horizontal",
        size: [0.5, 0.018, 0.5], materialId: "oak",
        shapeParams: { thickness: 0.25 },
      },
      {
        id: "arc_panel", label: "Arc / Curved", icon: "⌒",
        description: "Curved panel, reception front",
        shape: "arc", type: "vertical",
        size: [0.5, 0.6, 0.018], materialId: "oak",
        shapeParams: { arcAngle: 90 },
      },
      {
        id: "hexagon_panel", label: "Hexagon", icon: "⬡",
        description: "Hexagonal shelf, decorative",
        shape: "hexagon", type: "horizontal",
        size: [0.3, 0.018, 0.3], materialId: "oak",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 2. SOLIDS
  // ─────────────────────────────────────────────────
  {
    label: "Solids",
    icon: "◻",
    items: [
      {
        id: "box", label: "Box / Cube", icon: "◻",
        description: "Generic rectangular solid",
        shape: "box", type: "horizontal",
        size: [0.3, 0.3, 0.3], materialId: "oak",
      },
      {
        id: "cylinder", label: "Cylinder", icon: "⊚",
        description: "Columns, legs, rods",
        shape: "cylinder", type: "vertical",
        size: [0.1, 0.5, 0.1], materialId: "black_metal",
      },
      {
        id: "sphere", label: "Sphere", icon: "●",
        description: "Decorative ball, knob",
        shape: "sphere", type: "horizontal",
        size: [0.1, 0.1, 0.1], materialId: "brass",
      },
      {
        id: "cone", label: "Cone", icon: "▲",
        description: "Tapered leg, finial",
        shape: "cone", type: "vertical",
        size: [0.06, 0.5, 0.06], materialId: "oak",
      },
      {
        id: "half_sphere", label: "Half-Sphere (Dome)", icon: "◠",
        description: "Dome cap, decorative top",
        shape: "half_sphere", type: "horizontal",
        size: [0.2, 0.1, 0.2], materialId: "oak",
      },
      {
        id: "torus", label: "Torus (Ring)", icon: "◎",
        description: "Donut shape, ring detail",
        shape: "torus", type: "horizontal",
        size: [0.15, 0.05, 0.15], materialId: "black_metal",
        shapeParams: { tubeRadius: 0.3 },
      },
      {
        id: "pyramid", label: "Pyramid", icon: "△",
        description: "4-sided pyramid shape",
        shape: "pyramid", type: "vertical",
        size: [0.15, 0.2, 0.15], materialId: "oak",
      },
      {
        id: "wedge", label: "Wedge / Ramp", icon: "◺",
        description: "Ramp, sloped support",
        shape: "wedge", type: "horizontal",
        size: [0.3, 0.15, 0.2], materialId: "oak",
      },
      {
        id: "tube", label: "Tube (Hollow)", icon: "◍",
        description: "Pipe, hollow cylinder",
        shape: "tube", type: "vertical",
        size: [0.1, 0.4, 0.1], materialId: "black_metal",
        shapeParams: { thickness: 0.15 },
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 3. LEGS & FEET
  // ─────────────────────────────────────────────────
  {
    label: "Legs & Feet",
    icon: "⏐",
    items: [
      {
        id: "leg_round_short", label: "Round Leg (Short)", icon: "⏐",
        description: "Cabinet, sofa leg (100mm)",
        shape: "cylinder", type: "vertical",
        size: [0.04, 0.1, 0.04], materialId: "black_metal",
      },
      {
        id: "leg_round_med", label: "Round Leg (Medium)", icon: "⏐",
        description: "Desk, table leg (450mm)",
        shape: "cylinder", type: "vertical",
        size: [0.05, 0.45, 0.05], materialId: "black_metal",
      },
      {
        id: "leg_round_tall", label: "Round Leg (Tall)", icon: "⏐",
        description: "Dining table leg (720mm)",
        shape: "cylinder", type: "vertical",
        size: [0.05, 0.72, 0.05], materialId: "black_metal",
      },
      {
        id: "leg_square", label: "Square Leg", icon: "▮",
        description: "Straight square profile",
        shape: "square_leg", type: "vertical",
        size: [0.04, 0.45, 0.04], materialId: "oak",
      },
      {
        id: "leg_tapered", label: "Tapered Leg", icon: "╲",
        description: "Mid-century tapered style",
        shape: "tapered_leg", type: "vertical",
        size: [0.05, 0.45, 0.05], materialId: "walnut",
        shapeParams: { topRatio: 0.5 },
      },
      {
        id: "leg_cabriole", label: "Cabriole Leg", icon: "⌇",
        description: "Classic curved S-shape leg",
        shape: "cabriole_leg", type: "vertical",
        size: [0.06, 0.45, 0.06], materialId: "walnut",
      },
      {
        id: "leg_hairpin", label: "Hairpin Leg", icon: "⋀",
        description: "Two bent metal rods",
        shape: "hairpin_leg", type: "vertical",
        size: [0.08, 0.4, 0.08], materialId: "black_metal",
      },
      {
        id: "x_base", label: "X-Base", icon: "✕",
        description: "Crossed legs support",
        shape: "x_base", type: "vertical",
        size: [0.4, 0.4, 0.4], materialId: "black_metal",
      },
      {
        id: "pedestal", label: "Pedestal Base", icon: "⏣",
        description: "Central column support",
        shape: "pedestal", type: "vertical",
        size: [0.15, 0.5, 0.15], materialId: "black_metal",
      },
      {
        id: "bun_foot", label: "Bun Foot", icon: "◠",
        description: "Classic rounded foot",
        shape: "bun_foot", type: "vertical",
        size: [0.06, 0.04, 0.06], materialId: "walnut",
      },
      {
        id: "bracket_foot", label: "Bracket Foot", icon: "⌐",
        description: "Two-sided angled foot",
        shape: "bracket_foot", type: "vertical",
        size: [0.06, 0.05, 0.06], materialId: "oak",
      },
      {
        id: "plinth_base", label: "Plinth / Base", icon: "▬",
        description: "Solid rectangular base",
        shape: "plinth", type: "horizontal",
        size: [0.5, 0.04, 0.4], materialId: "oak",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 4. DOORS & DRAWERS
  // ─────────────────────────────────────────────────
  {
    label: "Doors & Drawers",
    icon: "\uD83D\uDEAA",
    items: [
      {
        id: "flat_door", label: "Flat Door", icon: "▯",
        description: "Simple flat panel door",
        shape: "box", type: "vertical",
        size: [0.45, 0.7, 0.018], materialId: "melamine_white",
      },
      {
        id: "shaker_door", label: "Shaker Door", icon: "▣",
        description: "Frame + recessed panel",
        shape: "shaker_door", type: "vertical",
        size: [0.45, 0.7, 0.018], materialId: "oak",
      },
      {
        id: "glass_insert_door", label: "Glass Insert Door", icon: "◇",
        description: "Frame with glass center",
        shape: "glass_insert_door", type: "vertical",
        size: [0.45, 0.7, 0.018], materialId: "oak",
      },
      {
        id: "louvered_door", label: "Louvered Door", icon: "☰",
        description: "Frame with angled slats",
        shape: "louvered_door", type: "vertical",
        size: [0.45, 0.7, 0.018], materialId: "oak",
      },
      {
        id: "drawer_box", label: "Drawer Box", icon: "☐",
        description: "Full box with front panel",
        shape: "drawer_box", type: "horizontal",
        size: [0.4, 0.15, 0.35], materialId: "plywood",
      },
      {
        id: "open_tray", label: "Open Tray", icon: "⊏",
        description: "Low-sided open container",
        shape: "open_tray", type: "horizontal",
        size: [0.35, 0.06, 0.25], materialId: "oak",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 5. HANDLES
  // ─────────────────────────────────────────────────
  {
    label: "Handles",
    icon: "═",
    items: [
      {
        id: "bar_handle", label: "Bar Handle", icon: "═",
        description: "Straight bar pull",
        shape: "bar_handle", type: "horizontal",
        size: [0.03, 0.15, 0.03], materialId: "steel",
      },
      {
        id: "knob_handle", label: "Round Knob", icon: "●",
        description: "Classic round knob",
        shape: "knob", type: "horizontal",
        size: [0.03, 0.03, 0.03], materialId: "brass",
      },
      {
        id: "cup_pull_handle", label: "Cup Pull", icon: "◠",
        description: "Half-moon shell pull",
        shape: "cup_pull", type: "horizontal",
        size: [0.08, 0.04, 0.03], materialId: "brass",
      },
      {
        id: "ring_pull_handle", label: "Ring Pull", icon: "◎",
        description: "Hanging ring pull",
        shape: "ring_pull", type: "horizontal",
        size: [0.04, 0.04, 0.02], materialId: "brass",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 6. STRUCTURE
  // ─────────────────────────────────────────────────
  {
    label: "Structure",
    icon: "╋",
    items: [
      {
        id: "cross_brace", label: "Cross Brace / X-Support", icon: "✕",
        description: "Diagonal X reinforcement",
        shape: "cross_brace", type: "back",
        size: [0.5, 0.5, 0.015], materialId: "black_metal",
      },
      {
        id: "l_bracket", label: "L-Bracket", icon: "⌐",
        description: "Metal corner bracket",
        shape: "l_bracket", type: "horizontal",
        size: [0.04, 0.04, 0.04], materialId: "steel",
      },
      {
        id: "rail_h", label: "Rail (Horizontal)", icon: "─",
        description: "Towel bar, hanging rail",
        shape: "rail", type: "horizontal",
        size: [0.04, 0.6, 0.04], materialId: "steel",
      },
      {
        id: "rod_closet", label: "Closet Rod", icon: "─",
        description: "Clothes hanging rod",
        shape: "rod", type: "horizontal",
        size: [0.03, 0.8, 0.03], materialId: "steel",
      },
      {
        id: "caster_wheel", label: "Caster / Wheel", icon: "◉",
        description: "Swivel wheel for mobility",
        shape: "caster", type: "vertical",
        size: [0.05, 0.05, 0.05], materialId: "black_metal",
      },
      {
        id: "glass_panel", label: "Glass Panel", icon: "◇",
        description: "Glass shelf or partition",
        shape: "box", type: "vertical",
        size: [0.45, 0.6, 0.006], materialId: "glass",
      },
      {
        id: "mirror", label: "Mirror", icon: "\uD83E\uDE9E",
        description: "Flat mirror panel",
        shape: "box", type: "back",
        size: [0.5, 0.7, 0.006], materialId: "glass",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 7. DECORATIVE
  // ─────────────────────────────────────────────────
  {
    label: "Decorative",
    icon: "\uD83C\uDF3F",
    items: [
      {
        id: "cushion", label: "Cushion / Pillow", icon: "\uD83D\uDECB",
        description: "Soft cushion for seating",
        shape: "cushion", type: "horizontal",
        size: [0.45, 0.1, 0.45], materialId: "melamine_white",
      },
      {
        id: "mattress", label: "Mattress", icon: "\uD83D\uDECF",
        description: "Bed mattress",
        shape: "mattress", type: "horizontal",
        size: [1.4, 0.2, 1.9], materialId: "melamine_white",
      },
      {
        id: "books_prop", label: "Books (Prop)", icon: "\uD83D\uDCDA",
        description: "Stack of books for shelves",
        shape: "books", type: "horizontal",
        size: [0.2, 0.25, 0.15], materialId: "oak",
      },
      {
        id: "vase_prop", label: "Vase", icon: "\uD83C\uDFFA",
        description: "Decorative vase",
        shape: "vase", type: "vertical",
        size: [0.08, 0.2, 0.08], materialId: "melamine_white",
      },
      {
        id: "basket_prop", label: "Basket", icon: "\uD83E\uDDFA",
        description: "Storage basket",
        shape: "basket", type: "horizontal",
        size: [0.3, 0.2, 0.25], materialId: "oak",
      },
      {
        id: "picture_frame_prop", label: "Picture Frame", icon: "\uD83D\uDDBC",
        description: "Wall frame decoration",
        shape: "picture_frame", type: "back",
        size: [0.3, 0.4, 0.02], materialId: "walnut",
      },
      {
        id: "lamp_shade_prop", label: "Lamp Shade", icon: "\uD83D\uDCA1",
        description: "Conical lamp shade",
        shape: "lamp_shade", type: "vertical",
        size: [0.2, 0.15, 0.2], materialId: "melamine_white",
        shapeParams: { topRatio: 0.4 },
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 8. MOLDING & TRIM
  // ─────────────────────────────────────────────────
  {
    label: "Molding & Trim",
    icon: "~",
    items: [
      {
        id: "crown_molding", label: "Crown Molding", icon: "⌒",
        description: "Curved top trim profile",
        shape: "crown_molding", type: "horizontal",
        size: [0.6, 0.03, 0.03], materialId: "oak",
      },
      {
        id: "base_molding", label: "Base Molding", icon: "⌊",
        description: "Bottom trim profile",
        shape: "base_molding", type: "horizontal",
        size: [0.6, 0.06, 0.02], materialId: "oak",
      },
      {
        id: "edge_trim", label: "Edge Trim / Band", icon: "▬",
        description: "Thin strip for edges",
        shape: "edge_trim", type: "horizontal",
        size: [0.6, 0.002, 0.02], materialId: "oak",
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 9. BATHROOM FIXTURES (multi-part)
  // ─────────────────────────────────────────────────
  {
    label: "Bathroom Fixtures",
    icon: "🚿",
    items: [
      { id: "toilet_standard", label: "Toilet", icon: "🚽", description: "Toilet with tank & seat", shape: "box", type: "vertical", size: [0.38, 0.40, 0.65], materialId: "ceramic_white",
        groupName: "Toilet", buildPanels: () => [
          p("Base", "vertical", [0, 0.15, 0.05], [0.35, 0.30, 0.45], "ceramic_white"),
          p("Tank", "vertical", [0, 0.35, 0.25], [0.30, 0.40, 0.15], "ceramic_white"),
          { id: addPid(), type: "horizontal" as const, shape: "oval" as PanelShape, label: "Seat", position: [0, 0.32, -0.05] as [number,number,number], size: [0.34, 0.04, 0.38] as [number,number,number], materialId: "ceramic_white" },
          p("Lid", "horizontal", [0, 0.35, -0.05], [0.32, 0.02, 0.36], "ceramic_white"),
        ],
      },
      { id: "bathtub_oval", label: "Bathtub", icon: "🛁", description: "Freestanding bathtub", shape: "box", type: "horizontal", size: [0.75, 0.50, 1.60], materialId: "ceramic_white",
        groupName: "Bathtub", buildPanels: () => [
          p("Outer Shell", "horizontal", [0, 0.25, 0], [0.70, 0.50, 1.50], "ceramic_white"),
          p("Inner", "horizontal", [0, 0.28, 0], [0.58, 0.42, 1.38], "ceramic_white"),
          p("Rim", "horizontal", [0, 0.49, 0], [0.72, 0.03, 1.52], "chrome"),
        ],
      },
      { id: "sink_pedestal", label: "Pedestal Sink", icon: "🚰", description: "Sink on pedestal", shape: "cylinder", type: "vertical", size: [0.45, 0.85, 0.45], materialId: "ceramic_white",
        groupName: "Pedestal Sink", buildPanels: () => [
          cy("Pedestal", [0, 0.35, 0], 0.15, 0.70, "ceramic_white"),
          { id: addPid(), type: "horizontal" as const, shape: "half_sphere" as PanelShape, label: "Basin", position: [0, 0.72, 0] as [number,number,number], size: [0.42, 0.12, 0.35] as [number,number,number], materialId: "ceramic_white" },
          cy("Faucet", [0, 0.82, 0.12], 0.02, 0.12, "chrome"),
        ],
      },
      { id: "shower_cabin", label: "Shower", icon: "🚿", description: "Glass shower enclosure", shape: "box", type: "vertical", size: [0.90, 2.00, 0.90], materialId: "glass",
        groupName: "Shower", buildPanels: () => [
          p("Back Wall", "back", [0, 1.0, 0.44], [0.88, 2.0, 0.02], "ceramic_white"),
          p("Side Wall", "vertical", [-0.44, 1.0, 0], [0.02, 2.0, 0.88], "ceramic_white"),
          p("Glass Door", "vertical", [0.20, 1.0, -0.44], [0.50, 1.90, 0.008], "glass"),
          p("Floor Tray", "horizontal", [0, 0.02, 0], [0.88, 0.04, 0.88], "ceramic_white"),
          cy("Shower Head", [0, 1.90, 0.35], 0.10, 0.02, "chrome"),
          cy("Shower Pipe", [0, 1.50, 0.43], 0.02, 0.80, "chrome"),
        ],
      },
      { id: "bathroom_mirror", label: "Mirror", icon: "🪞", description: "Wall mirror with frame", shape: "box", type: "back", size: [0.50, 0.70, 0.03], materialId: "mirror",
        groupName: "Mirror", buildPanels: () => [
          p("Frame", "back", [0, 0, 0], [0.54, 0.74, 0.02], "walnut"),
          p("Glass", "back", [0, 0, -0.01], [0.48, 0.68, 0.005], "mirror"),
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 10. KITCHEN APPLIANCES (multi-part)
  // ─────────────────────────────────────────────────
  {
    label: "Kitchen Appliances",
    icon: "🍳",
    items: [
      { id: "fridge", label: "Fridge", icon: "🧊", description: "Fridge with handle", shape: "box", type: "vertical", size: [0.60, 1.70, 0.65], materialId: "melamine_white",
        groupName: "Fridge", buildPanels: () => [
          p("Body", "vertical", [0, 0.85, 0], [0.58, 1.68, 0.63], "melamine_white"),
          p("Freezer Line", "horizontal", [0, 1.25, -0.315], [0.56, 0.005, 0.01], "melamine_gray"),
          p("Upper Handle", "vertical", [0.26, 1.45, -0.33], [0.02, 0.20, 0.02], "chrome"),
          p("Lower Handle", "vertical", [0.26, 0.60, -0.33], [0.02, 0.20, 0.02], "chrome"),
        ],
      },
      { id: "oven_standard", label: "Oven", icon: "🔥", description: "Oven with glass door", shape: "box", type: "vertical", size: [0.60, 0.60, 0.55], materialId: "melamine_black",
        groupName: "Oven", buildPanels: () => [
          p("Body", "vertical", [0, 0.30, 0], [0.58, 0.58, 0.53], "melamine_black"),
          p("Glass Door", "vertical", [0, 0.28, -0.27], [0.50, 0.42, 0.005], "tinted_glass"),
          p("Handle", "horizontal", [0, 0.52, -0.28], [0.40, 0.02, 0.02], "chrome"),
          p("Control Panel", "vertical", [0, 0.56, -0.27], [0.50, 0.04, 0.01], "melamine_gray"),
          cy("Knob 1", [-0.15, 0.56, -0.28], 0.02, 0.015, "chrome"),
          cy("Knob 2", [-0.05, 0.56, -0.28], 0.02, 0.015, "chrome"),
          cy("Knob 3", [0.05, 0.56, -0.28], 0.02, 0.015, "chrome"),
          cy("Knob 4", [0.15, 0.56, -0.28], 0.02, 0.015, "chrome"),
        ],
      },
      { id: "washer", label: "Washing Machine", icon: "🧺", description: "Front-load washer", shape: "box", type: "vertical", size: [0.60, 0.85, 0.60], materialId: "melamine_white",
        groupName: "Washing Machine", buildPanels: () => [
          p("Body", "vertical", [0, 0.425, 0], [0.58, 0.83, 0.58], "melamine_white"),
          cy("Drum Door", [0, 0.38, -0.29], 0.36, 0.02, "tinted_glass"),
          p("Control Panel", "vertical", [0, 0.80, -0.27], [0.50, 0.06, 0.01], "melamine_gray"),
          cy("Dial", [0, 0.80, -0.29], 0.04, 0.015, "chrome"),
        ],
      },
      { id: "microwave", label: "Microwave", icon: "📦", description: "Countertop microwave", shape: "box", type: "horizontal", size: [0.45, 0.26, 0.35], materialId: "melamine_black",
        groupName: "Microwave", buildPanels: () => [
          p("Body", "vertical", [0, 0.13, 0], [0.44, 0.25, 0.34], "melamine_black"),
          p("Door Glass", "vertical", [-0.05, 0.12, -0.17], [0.28, 0.18, 0.005], "tinted_glass"),
          p("Control Side", "vertical", [0.17, 0.13, -0.17], [0.08, 0.20, 0.01], "melamine_gray"),
        ],
      },
      { id: "kitchen_sink", label: "Kitchen Sink", icon: "🚰", description: "Double bowl sink", shape: "box", type: "horizontal", size: [0.60, 0.20, 0.50], materialId: "steel",
        groupName: "Kitchen Sink", buildPanels: () => [
          p("Counter", "horizontal", [0, 0.02, 0], [0.60, 0.03, 0.50], "steel"),
          p("Left Bowl", "horizontal", [-0.14, -0.05, 0], [0.25, 0.12, 0.36], "steel"),
          p("Right Bowl", "horizontal", [0.14, -0.05, 0], [0.25, 0.12, 0.36], "steel"),
          cy("Faucet", [0, 0.15, 0.18], 0.02, 0.20, "chrome"),
        ],
      },
      { id: "toaster_add", label: "Toaster", icon: "🍞", description: "2-slot toaster", shape: "box", type: "vertical", size: [0.15, 0.18, 0.28], materialId: "steel",
        groupName: "Toaster", buildPanels: () => [
          p("Body", "vertical", [0, 0.09, 0], [0.14, 0.17, 0.27], "steel"),
          p("Slot 1", "horizontal", [-0.03, 0.175, 0], [0.02, 0.005, 0.18], "melamine_black"),
          p("Slot 2", "horizontal", [0.03, 0.175, 0], [0.02, 0.005, 0.18], "melamine_black"),
          p("Lever", "vertical", [0.07, 0.10, -0.12], [0.01, 0.04, 0.01], "chrome"),
        ],
      },
      { id: "coffee_machine", label: "Coffee Machine", icon: "☕", description: "Espresso machine", shape: "box", type: "vertical", size: [0.25, 0.35, 0.35], materialId: "melamine_black" },
      { id: "blender", label: "Blender", icon: "🥤", description: "Kitchen blender", shape: "cylinder", type: "vertical", size: [0.12, 0.35, 0.12], materialId: "steel" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 11. LIGHTING (multi-part)
  // ─────────────────────────────────────────────────
  {
    label: "Lighting",
    icon: "💡",
    items: [
      { id: "lamp_floor_round", label: "Floor Lamp", icon: "🪔", description: "Standing lamp with shade", shape: "cylinder", type: "vertical", size: [0.30, 1.50, 0.30], materialId: "melamine_white",
        groupName: "Floor Lamp", buildPanels: () => [
          cy("Base", [0, 0.01, 0], 0.22, 0.02, "black_metal"),
          cy("Pole", [0, 0.70, 0], 0.02, 1.36, "chrome"),
          { id: addPid(), type: "vertical" as const, shape: "cone" as PanelShape, label: "Shade", position: [0, 1.42, 0] as [number,number,number], size: [0.28, 0.18, 0.28] as [number,number,number], materialId: "melamine_white" },
        ],
      },
      { id: "lamp_table_round", label: "Table Lamp", icon: "🪔", description: "Table lamp with shade", shape: "cylinder", type: "vertical", size: [0.20, 0.40, 0.20], materialId: "melamine_white",
        groupName: "Table Lamp", buildPanels: () => [
          cy("Base", [0, 0.02, 0], 0.08, 0.03, "brass"),
          cy("Pole", [0, 0.14, 0], 0.015, 0.22, "brass"),
          { id: addPid(), type: "vertical" as const, shape: "cone" as PanelShape, label: "Shade", position: [0, 0.30, 0] as [number,number,number], size: [0.20, 0.14, 0.20] as [number,number,number], materialId: "melamine_white" },
        ],
      },
      { id: "lamp_ceiling", label: "Pendant Light", icon: "💡", description: "Hanging pendant", shape: "cylinder", type: "vertical", size: [0.30, 0.20, 0.30], materialId: "melamine_white",
        groupName: "Pendant Light", buildPanels: () => [
          cy("Cord", [0, 0.15, 0], 0.005, 0.10, "black_metal"),
          { id: addPid(), type: "vertical" as const, shape: "half_sphere" as PanelShape, label: "Shade", position: [0, 0.05, 0] as [number,number,number], size: [0.28, 0.14, 0.28] as [number,number,number], materialId: "melamine_white" },
        ],
      },
      { id: "lamp_wall", label: "Wall Sconce", icon: "💡", description: "Wall light", shape: "half_sphere", type: "vertical", size: [0.15, 0.15, 0.10], materialId: "brass" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 12. ELECTRONICS (multi-part)
  // ─────────────────────────────────────────────────
  {
    label: "Electronics",
    icon: "🖥️",
    items: [
      { id: "tv_modern", label: "Modern TV", icon: "📺", description: "Flat screen on stand", shape: "box", type: "back", size: [1.00, 0.60, 0.06], materialId: "melamine_black",
        groupName: "Modern TV", buildPanels: () => [
          p("Screen", "back", [0, 0.38, 0], [0.98, 0.55, 0.025], "melamine_black"),
          p("Bezel", "back", [0, 0.38, 0.013], [1.00, 0.57, 0.005], "melamine_gray"),
          p("Stand Neck", "vertical", [0, 0.08, 0.02], [0.06, 0.12, 0.04], "melamine_gray"),
          p("Stand Base", "horizontal", [0, 0.01, 0.03], [0.30, 0.015, 0.15], "melamine_gray"),
        ],
      },
      { id: "monitor", label: "Monitor", icon: "🖥️", description: "Computer monitor", shape: "box", type: "back", size: [0.55, 0.40, 0.06], materialId: "melamine_black",
        groupName: "Monitor", buildPanels: () => [
          p("Screen", "back", [0, 0.25, 0], [0.53, 0.32, 0.02], "melamine_black"),
          p("Stand Arm", "vertical", [0, 0.08, 0.02], [0.04, 0.10, 0.04], "melamine_gray"),
          cy("Stand Base", [0, 0.01, 0.03], 0.12, 0.015, "melamine_gray"),
        ],
      },
      { id: "laptop_add", label: "Laptop", icon: "💻", description: "Open laptop", shape: "box", type: "horizontal", size: [0.35, 0.24, 0.24], materialId: "melamine_gray",
        groupName: "Laptop", buildPanels: () => [
          p("Base", "horizontal", [0, 0.01, -0.04], [0.33, 0.015, 0.22], "melamine_gray"),
          p("Keyboard", "horizontal", [0, 0.018, -0.04], [0.28, 0.003, 0.16], "melamine_black"),
          p("Screen", "vertical", [0, 0.12, 0.07], [0.31, 0.20, 0.005], "melamine_black", "box"),
        ],
      },
      { id: "speaker_large", label: "Speaker", icon: "🔊", description: "Floor speaker", shape: "box", type: "vertical", size: [0.20, 0.80, 0.25], materialId: "melamine_black",
        groupName: "Speaker", buildPanels: () => [
          p("Cabinet", "vertical", [0, 0.40, 0], [0.19, 0.78, 0.24], "melamine_black"),
          cy("Woofer", [0, 0.25, -0.12], 0.14, 0.02, "melamine_gray"),
          cy("Tweeter", [0, 0.58, -0.12], 0.06, 0.015, "melamine_gray"),
        ],
      },
      { id: "radio_add", label: "Radio", icon: "📻", description: "Tabletop radio", shape: "box", type: "horizontal", size: [0.25, 0.15, 0.15], materialId: "walnut" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 13. ROOM ELEMENTS (multi-part)
  // ─────────────────────────────────────────────────
  {
    label: "Room Elements",
    icon: "🚪",
    items: [
      { id: "door_standard", label: "Door", icon: "🚪", description: "Interior door with handle", shape: "box", type: "vertical", size: [0.80, 2.00, 0.04], materialId: "oak",
        groupName: "Door", buildPanels: () => [
          p("Panel", "vertical", [0, 1.0, 0], [0.78, 1.98, 0.038], "oak"),
          cy("Handle", [0.33, 0.95, -0.025], 0.025, 0.04, "chrome"),
        ],
      },
      { id: "window_standard", label: "Window", icon: "🪟", description: "Window with frame", shape: "box", type: "back", size: [0.80, 1.00, 0.06], materialId: "glass",
        groupName: "Window", buildPanels: () => [
          p("Frame Top", "horizontal", [0, 0.49, 0], [0.80, 0.04, 0.05], "melamine_white"),
          p("Frame Bottom", "horizontal", [0, -0.49, 0], [0.80, 0.04, 0.05], "melamine_white"),
          p("Frame Left", "vertical", [-0.39, 0, 0], [0.04, 0.96, 0.05], "melamine_white"),
          p("Frame Right", "vertical", [0.39, 0, 0], [0.04, 0.96, 0.05], "melamine_white"),
          p("Cross Bar", "horizontal", [0, 0, 0], [0.74, 0.03, 0.04], "melamine_white"),
          p("Glass Top", "back", [0, 0.25, 0], [0.74, 0.44, 0.005], "glass"),
          p("Glass Bottom", "back", [0, -0.25, 0], [0.74, 0.44, 0.005], "glass"),
        ],
      },
      { id: "wall_section", label: "Wall Section", icon: "🧱", description: "Wall panel", shape: "box", type: "vertical", size: [1.00, 2.40, 0.12], materialId: "melamine_white" },
      { id: "radiator_add", label: "Radiator", icon: "🔲", description: "Wall radiator", shape: "box", type: "vertical", size: [0.80, 0.60, 0.10], materialId: "melamine_white" },
      { id: "coat_rack_standing", label: "Coat Rack", icon: "🧥", description: "Standing coat rack", shape: "cylinder", type: "vertical", size: [0.04, 1.70, 0.04], materialId: "oak",
        groupName: "Coat Rack", buildPanels: () => [
          cy("Pole", [0, 0.85, 0], 0.035, 1.68, "oak"),
          cy("Base", [0, 0.01, 0], 0.25, 0.02, "oak"),
          // hooks
          cy("Hook 1", [-0.06, 1.60, 0], 0.01, 0.08, "chrome"),
          cy("Hook 2", [0.06, 1.60, 0], 0.01, 0.08, "chrome"),
          cy("Hook 3", [0, 1.60, -0.06], 0.01, 0.08, "chrome"),
          cy("Hook 4", [0, 1.60, 0.06], 0.01, 0.08, "chrome"),
        ],
      },
      { id: "trashcan_add", label: "Trashcan", icon: "🗑️", description: "Waste bin", shape: "cylinder", type: "vertical", size: [0.25, 0.60, 0.25], materialId: "steel" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 14. SOFT FURNISHINGS
  // ─────────────────────────────────────────────────
  {
    label: "Soft Furnishings",
    icon: "🛋️",
    items: [
      { id: "pillow_white", label: "Pillow (White)", icon: "🛏️", description: "Soft pillow", shape: "cushion", type: "horizontal", size: [0.50, 0.12, 0.35], materialId: "melamine_white", cornerRadius: 0.03 },
      { id: "pillow_blue", label: "Pillow (Blue)", icon: "🛏️", description: "Blue accent pillow", shape: "cushion", type: "horizontal", size: [0.50, 0.12, 0.35], materialId: "fabric_blue", cornerRadius: 0.03 },
      { id: "pillow_long", label: "Body Pillow", icon: "🛏️", description: "Long body pillow", shape: "cushion", type: "horizontal", size: [0.80, 0.12, 0.30], materialId: "melamine_white", cornerRadius: 0.03 },
      { id: "rug_rectangle", label: "Rectangle Rug", icon: "🟫", description: "Area rug", shape: "box", type: "horizontal", size: [2.00, 0.01, 1.40], materialId: "fabric_gray" },
      { id: "rug_round", label: "Round Rug", icon: "⭕", description: "Round area rug", shape: "cylinder", type: "horizontal", size: [1.50, 0.01, 1.50], materialId: "fabric_gray" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 15. PLANTS & GREENERY (multi-part)
  // ─────────────────────────────────────────────────
  {
    label: "Plants & Greenery",
    icon: "🌿",
    items: [
      { id: "potted_plant", label: "Potted Plant", icon: "🪴", description: "Plant in terracotta pot", shape: "sphere", type: "vertical", size: [0.25, 0.45, 0.25], materialId: "fabric_green",
        groupName: "Potted Plant", buildPanels: () => [
          { id: addPid(), type: "vertical" as const, shape: "cone" as PanelShape, label: "Pot", position: [0, 0.08, 0] as [number,number,number], size: [0.18, 0.16, 0.18] as [number,number,number], materialId: "leather_tan" },
          p("Soil", "horizontal", [0, 0.16, 0], [0.14, 0.02, 0.14], "walnut"),
          sp("Foliage 1", [0, 0.28, 0], 0.16, "fabric_green"),
          sp("Foliage 2", [-0.04, 0.34, 0.03], 0.10, "fabric_green"),
          sp("Foliage 3", [0.04, 0.32, -0.03], 0.10, "fabric_green"),
        ],
      },
      { id: "plant_small", label: "Small Plant", icon: "🌱", description: "Succulent in pot", shape: "sphere", type: "vertical", size: [0.12, 0.18, 0.12], materialId: "fabric_green",
        groupName: "Small Plant", buildPanels: () => [
          cy("Pot", [0, 0.04, 0], 0.09, 0.08, "leather_tan"),
          sp("Plant", [0, 0.12, 0], 0.08, "fabric_green"),
        ],
      },
      { id: "plant_tree", label: "Indoor Tree", icon: "🌳", description: "Small indoor tree", shape: "sphere", type: "vertical", size: [0.40, 0.90, 0.40], materialId: "fabric_green",
        groupName: "Indoor Tree", buildPanels: () => [
          cy("Pot", [0, 0.10, 0], 0.22, 0.20, "leather_tan"),
          cy("Trunk", [0, 0.40, 0], 0.04, 0.40, "walnut"),
          sp("Crown 1", [0, 0.68, 0], 0.30, "fabric_green"),
          sp("Crown 2", [-0.08, 0.76, 0.06], 0.18, "fabric_green"),
          sp("Crown 3", [0.08, 0.72, -0.05], 0.16, "fabric_green"),
        ],
      },
      { id: "plant_cactus", label: "Cactus", icon: "🌵", description: "Cactus in pot", shape: "cylinder", type: "vertical", size: [0.12, 0.35, 0.12], materialId: "fabric_green",
        groupName: "Cactus", buildPanels: () => [
          cy("Pot", [0, 0.05, 0], 0.10, 0.10, "leather_tan"),
          cy("Body", [0, 0.22, 0], 0.05, 0.24, "fabric_green"),
          cy("Arm L", [-0.05, 0.25, 0], 0.025, 0.08, "fabric_green"),
          cy("Arm R", [0.05, 0.28, 0], 0.025, 0.06, "fabric_green"),
        ],
      },
      { id: "vase_flowers", label: "Vase with Flowers", icon: "💐", description: "Ceramic vase with flowers", shape: "cylinder", type: "vertical", size: [0.10, 0.35, 0.10], materialId: "ceramic_white",
        groupName: "Vase with Flowers", buildPanels: () => [
          cy("Vase", [0, 0.10, 0], 0.08, 0.20, "ceramic_white"),
          cy("Stem 1", [-0.01, 0.26, 0.01], 0.005, 0.12, "fabric_green"),
          cy("Stem 2", [0.01, 0.28, -0.01], 0.005, 0.14, "fabric_green"),
          cy("Stem 3", [0, 0.27, 0], 0.005, 0.13, "fabric_green"),
          sp("Flower 1", [-0.01, 0.33, 0.01], 0.03, "velvet_navy"),
          sp("Flower 2", [0.01, 0.36, -0.01], 0.025, "leather_tan"),
          sp("Flower 3", [0, 0.34, 0], 0.028, "fabric_blue"),
        ],
      },
      { id: "bear_plush", label: "Teddy Bear", icon: "🧸", description: "Plush teddy bear", shape: "sphere", type: "vertical", size: [0.20, 0.25, 0.15], materialId: "leather_tan",
        groupName: "Teddy Bear", buildPanels: () => [
          sp("Body", [0, 0.08, 0], 0.12, "leather_tan"),
          sp("Head", [0, 0.18, 0], 0.09, "leather_tan"),
          sp("Ear L", [-0.05, 0.24, 0], 0.03, "leather_tan"),
          sp("Ear R", [0.05, 0.24, 0], 0.03, "leather_tan"),
          sp("Nose", [0, 0.17, -0.045], 0.015, "melamine_black"),
        ],
      },
    ],
  },
];

// ─── Component ─────────────────────────────────────────

interface AddPartPickerProps {
  onAdd: (preset: {
    shape: PanelShape;
    type: PanelData["type"];
    label: string;
    size: [number, number, number];
    materialId: string;
    shapeParams?: Record<string, number>;
    placeOnSelected?: boolean;
  }) => void;
  onAddGroup?: (name: string, panels: PanelData[]) => void;
  onClose: () => void;
}

export function AddPartPicker({ onAdd, onAddGroup, onClose }: AddPartPickerProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const searchLower = search.toLowerCase();

  const filteredCategories = PART_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-serif font-semibold text-gray-900">
                Add Part
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {PART_CATEGORIES.reduce((n, c) => n + c.items.length, 0)} shapes across {PART_CATEGORIES.length} categories
              </p>
              <p className="text-[11px] text-gray-600 mt-2 leading-snug">
                <span className="font-medium text-[#C87D5A]">On selected surface:</span>{" "}
                click a seat, tabletop, or shelf in the 3D view, open + Add, then pick a pillow, vase, etc. — it spawns centered on that piece. If nothing is selected, it uses the highest horizontal surface.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search shapes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C87D5A]/30 focus:border-[#C87D5A]/50"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredCategories.map((category) => {
            const isExpanded = expandedCategory === category.label || search.length > 0;
            const showItems = isExpanded ? category.items : category.items.slice(0, 6);
            const hasMore = category.items.length > 6 && !isExpanded;

            return (
              <div key={category.label}>
                <button
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.label ? null : category.label
                  )}
                  className="w-full flex items-center gap-2 px-1 mb-2 group"
                >
                  <span className="text-sm">{category.icon}</span>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {category.label}
                  </p>
                  <span className="text-[10px] text-gray-300 ml-1">
                    ({category.items.length})
                  </span>
                  <div className="flex-1" />
                  <span className="text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors">
                    {isExpanded ? "collapse" : "show all"}
                  </span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  {showItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.buildPanels && onAddGroup) {
                          onAddGroup(item.groupName ?? item.label, item.buildPanels());
                        } else {
                          onAdd({
                            shape: item.shape,
                            type: item.type,
                            label: item.label,
                            size: item.size,
                            materialId: item.materialId,
                            shapeParams: item.shapeParams,
                            placeOnSelected: item.placeOnSelected,
                          });
                        }
                        onClose();
                      }}
                      onMouseEnter={() => setHovered(item.id)}
                      onMouseLeave={() => setHovered(null)}
                      className={`relative group rounded-xl border p-3 text-left transition-all duration-200 ${
                        hovered === item.id
                          ? "border-[#C87D5A]/40 bg-[#C87D5A]/[0.04] shadow-md shadow-[#C87D5A]/10 scale-[1.02]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 text-lg transition-colors ${
                          hovered === item.id
                            ? "bg-[#C87D5A]/10"
                            : "bg-gray-100"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <p className="text-xs font-medium text-gray-900 leading-tight">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>

                {hasMore && (
                  <button
                    onClick={() => setExpandedCategory(category.label)}
                    className="mt-1.5 w-full text-center text-[10px] text-[#C87D5A] hover:text-[#B06B4A] font-medium py-1 transition-colors"
                  >
                    + {category.items.length - 6} more
                  </button>
                )}
              </div>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-8">
              No shapes match &quot;{search}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
