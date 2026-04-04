import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Search } from "lucide-react";
import type { PanelData, PanelShape } from "@/lib/furnitureData";
import { useMobileInfo } from "@/hooks/use-mobile";
import { MobileDrawer } from "@/components/ui/MobileDrawer";

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
  /** When true, always sits on the ground plane (y=0), not on tables/shelves. */
  placeOnFloor?: boolean;
  /** Bed/sofa-aware placement (requires selecting a panel on the target piece first). */
  softDecorKind?: "blanket" | "pillow";
  /** Multi-part items: when set, adds a GROUP with these panels instead of a single panel */
  buildPanels?: () => PanelData[];
  /** Group name when buildPanels is used */
  groupName?: string;
  /** Kenney GLB model path — when set, loads the 3D model instead of basic shapes */
  glbPath?: string;
}

interface PartCategory {
  label: string;
  icon: string;
  items: PartPreset[];
}

const PART_CATEGORIES: PartCategory[] = [
  // ─────────────────────────────────────────────────
  // Smart soft decor — target-aware bed / sofa placement
  // ─────────────────────────────────────────────────
  {
    label: "Smart soft decor",
    icon: "✨",
    items: [
      {
        id: "smart_blanket",
        label: "Blanket (auto on bed/sofa)",
        icon: "≋",
        description: "Select mattress or seat first — spread, fold, or casual drape.",
        shape: "draped",
        type: "horizontal",
        size: [1.2, 0.014, 1.0],
        materialId: "fabric_taupe",
        shapeParams: { cornerRadius: 0.006, softness: 0.65, foldSpread: 0.15 },
        placeOnSelected: true,
        softDecorKind: "blanket",
      },
      {
        id: "smart_pillow",
        label: "Pillow (auto on bed/sofa)",
        icon: "▢",
        description: "On sofa: starts tucked in the back corner, leaning on back + arm. Cycle for other spots.",
        shape: "cushion",
        type: "horizontal",
        size: [0.42, 0.1, 0.4],
        materialId: "fabric_cream",
        placeOnSelected: true,
        softDecorKind: "pillow",
      },
    ],
  },
  // ─────────────────────────────────────────────────
  // 0. QUICK — ON SELECTED SURFACE
  // ─────────────────────────────────────────────────
  {
    label: "On selected surface",
    icon: "⌖",
    items: [
      {
        id: "on_throw_pillow",
        label: "Throw pillow (flat)",
        icon: "▢",
        description: "Flat pillow on surface",
        shape: "cushion",
        type: "horizontal",
        size: [0.4, 0.1, 0.4],
        materialId: "fabric_gray",
        placeOnSelected: true,
      },
      {
        id: "on_standing_pillow",
        label: "Standing pillow",
        icon: "◆",
        description: "Upright pillow leaning against back",
        shape: "cushion",
        type: "vertical",
        size: [0.42, 0.42, 0.12],
        materialId: "fabric_charcoal",
        placeOnSelected: true,
      },
      {
        id: "on_standing_pillow_sm",
        label: "Small standing pillow",
        icon: "◇",
        description: "Smaller leaning pillow",
        shape: "cushion",
        type: "vertical",
        size: [0.35, 0.35, 0.10],
        materialId: "fabric_brown",
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
        id: "on_lumbar_pillow",
        label: "Lumbar pillow",
        icon: "▬",
        description: "Rectangular accent pillow",
        shape: "cushion",
        type: "horizontal",
        size: [0.55, 0.08, 0.30],
        materialId: "fabric_sage",
        placeOnSelected: true,
      },
      {
        id: "on_large_pillow",
        label: "Large pillow",
        icon: "■",
        description: "Oversized decorative pillow",
        shape: "cushion",
        type: "horizontal",
        size: [0.60, 0.14, 0.55],
        materialId: "fabric_cream",
        placeOnSelected: true,
      },
      {
        id: "on_bolster",
        label: "Bolster roll",
        icon: "⊜",
        description: "Cylindrical neck/arm roll",
        shape: "cushion_bolster",
        type: "horizontal",
        size: [0.50, 0.16, 0.16],
        materialId: "fabric_taupe",
        placeOnSelected: true,
      },
      {
        id: "on_folded_blanket",
        label: "Folded blanket",
        icon: "☰",
        description: "Thin folded throw blanket",
        shape: "draped",
        type: "horizontal",
        size: [0.50, 0.015, 0.35],
        materialId: "fabric_charcoal",
        shapeParams: { cornerRadius: 0.005, softness: 0.62, foldSpread: 0.14 },
        placeOnSelected: true,
      },
      {
        id: "on_draped_throw",
        label: "Draped throw",
        icon: "≈",
        description: "Thin draped blanket",
        shape: "draped",
        type: "horizontal",
        size: [0.80, 0.01, 0.60],
        materialId: "fabric_taupe",
        shapeParams: { cornerRadius: 0.005, softness: 0.65, foldSpread: 0.14 },
        placeOnSelected: true,
      },
      {
        id: "on_duvet",
        label: "Duvet / comforter",
        icon: "▓",
        description: "Bed comforter",
        shape: "cushion",
        type: "horizontal",
        size: [1.50, 0.10, 1.90],
        materialId: "fabric_charcoal",
        placeOnSelected: true,
      },
      {
        id: "on_bed_runner",
        label: "Bed runner",
        icon: "━",
        description: "Decorative bed runner strip",
        shape: "cushion_firm",
        type: "horizontal",
        size: [1.50, 0.03, 0.50],
        materialId: "fabric_brown",
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
      {
        id: "curved_panel", label: "Curved Panel", icon: "⌒",
        description: "Gently curved surface panel",
        shape: "box", type: "horizontal",
        size: [0.5, 0.4, 0.03], materialId: "oak",
        shapeParams: { curveAmount: 40 },
      },
      {
        id: "thin_shelf", label: "Thin Shelf", icon: "━",
        description: "Slim floating shelf",
        shape: "box", type: "horizontal",
        size: [0.8, 0.016, 0.3], materialId: "oak",
      },
      {
        id: "back_panel_thick", label: "Back Panel (Thick)", icon: "▣",
        description: "Sturdy back panel for cabinets",
        shape: "box", type: "back",
        size: [0.8, 0.6, 0.02], materialId: "mdf",
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
      {
        id: "sphere_large", label: "Sphere (Large)", icon: "●",
        description: "Large decorative sphere",
        shape: "sphere", type: "horizontal",
        size: [0.15, 0.15, 0.15], materialId: "brass",
      },
      {
        id: "disc", label: "Disc", icon: "◉",
        description: "Flat cylindrical disc",
        shape: "cylinder", type: "horizontal",
        size: [0.2, 0.02, 0.2], materialId: "black_metal",
      },
      {
        id: "pyramid_solid", label: "Pyramid (Solid)", icon: "△",
        description: "Decorative pyramid shape",
        shape: "pyramid", type: "vertical",
        size: [0.15, 0.2, 0.15], materialId: "oak",
      },
      {
        id: "rounded_cube", label: "Rounded Cube", icon: "▢",
        description: "Soft-edged box shape",
        shape: "box", type: "horizontal",
        size: [0.2, 0.2, 0.2], materialId: "oak",
        shapeParams: { cornerRadius: 0.02 },
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
      {
        id: "tapered_leg_new", label: "Tapered Leg (New)", icon: "╲",
        description: "Sleek tapered furniture leg",
        shape: "tapered_leg", type: "vertical",
        size: [0.05, 0.45, 0.05], materialId: "walnut",
      },
      {
        id: "hairpin_leg_new", label: "Hairpin Leg (Black)", icon: "⋀",
        description: "Black metal hairpin leg",
        shape: "hairpin_leg", type: "vertical",
        size: [0.05, 0.45, 0.05], materialId: "black_metal",
      },
      {
        id: "bun_foot_new", label: "Bun Foot (Wide)", icon: "◠",
        description: "Wide classic rounded foot",
        shape: "bun_foot", type: "vertical",
        size: [0.08, 0.05, 0.08], materialId: "walnut",
      },
      {
        id: "pedestal_base_new", label: "Pedestal Base (Wide)", icon: "⏣",
        description: "Wide central pedestal base",
        shape: "pedestal", type: "vertical",
        size: [0.3, 0.05, 0.3], materialId: "black_metal",
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
        size: [0.7, 2.0, 0.04], materialId: "melamine_white",
        placeOnFloor: true,
      },
      {
        id: "shaker_door", label: "Shaker Door", icon: "▣",
        description: "Frame + recessed panel",
        shape: "shaker_door", type: "vertical",
        size: [0.7, 2.0, 0.04], materialId: "oak",
        placeOnFloor: true,
      },
      {
        id: "glass_insert_door", label: "Glass Insert Door", icon: "◇",
        description: "Frame with glass center",
        shape: "glass_insert_door", type: "vertical",
        size: [0.7, 2.0, 0.04], materialId: "oak",
        placeOnFloor: true,
      },
      {
        id: "louvered_door", label: "Louvered Door", icon: "☰",
        description: "Frame with angled slats",
        shape: "louvered_door", type: "vertical",
        size: [0.7, 2.0, 0.04], materialId: "oak",
        placeOnFloor: true,
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
      {
        id: "cushion_decor", label: "Cushion", icon: "\uD83D\uDECB",
        description: "Decorative seat cushion",
        shape: "cushion", type: "horizontal",
        size: [0.45, 0.12, 0.45], materialId: "fabric_cream",
      },
      {
        id: "pillow_decor", label: "Pillow", icon: "\u25A2",
        description: "Soft decorative pillow",
        shape: "cushion", type: "horizontal",
        size: [0.5, 0.08, 0.4], materialId: "fabric_beige",
      },
      {
        id: "mattress_decor", label: "Mattress", icon: "\uD83D\uDECF",
        description: "Full-size bed mattress",
        shape: "mattress", type: "horizontal",
        size: [0.9, 0.2, 1.9], materialId: "fabric_cream",
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
  // 9. BATHROOM FIXTURES (Kenney GLB models)
  // ─────────────────────────────────────────────────
  {
    label: "Bathroom Fixtures",
    icon: "🚿",
    items: [
      { id: "toilet_standard", label: "Toilet", icon: "🚽", description: "Standard toilet (3D)", shape: "box", type: "vertical", size: [0.38, 0.40, 0.65], materialId: "ceramic_white", groupName: "Toilet", glbPath: "/models/kenney/toilet.glb" },
      { id: "toilet_square", label: "Square Toilet", icon: "🚽", description: "Modern square (3D)", shape: "box", type: "vertical", size: [0.38, 0.40, 0.60], materialId: "ceramic_white", groupName: "Square Toilet", glbPath: "/models/kenney/toiletSquare.glb" },
      { id: "bathtub_k", label: "Bathtub", icon: "🛁", description: "Freestanding bathtub (3D)", shape: "box", type: "horizontal", size: [0.75, 0.50, 1.60], materialId: "ceramic_white", groupName: "Bathtub", glbPath: "/models/kenney/bathtub.glb" },
      { id: "sink_bathroom", label: "Bathroom Sink", icon: "🚰", description: "Wall-mounted sink (3D)", shape: "box", type: "vertical", size: [0.45, 0.85, 0.45], materialId: "ceramic_white", groupName: "Bathroom Sink", glbPath: "/models/kenney/bathroomSink.glb" },
      { id: "sink_square_k", label: "Square Sink", icon: "🚰", description: "Square sink (3D)", shape: "box", type: "vertical", size: [0.50, 0.85, 0.40], materialId: "ceramic_white", groupName: "Square Sink", glbPath: "/models/kenney/bathroomSinkSquare.glb" },
      { id: "shower_k", label: "Shower", icon: "🚿", description: "Shower cabin (3D)", shape: "box", type: "vertical", size: [0.90, 2.00, 0.90], materialId: "glass", groupName: "Shower", glbPath: "/models/kenney/shower.glb" },
      { id: "shower_round_k", label: "Round Shower", icon: "🚿", description: "Round shower (3D)", shape: "box", type: "vertical", size: [0.90, 2.00, 0.90], materialId: "glass", groupName: "Round Shower", glbPath: "/models/kenney/showerRound.glb" },
      { id: "bathroom_cabinet_k", label: "Bathroom Cabinet", icon: "🗄️", description: "Vanity cabinet (3D)", shape: "box", type: "vertical", size: [0.60, 0.65, 0.40], materialId: "melamine_white", groupName: "Bathroom Cabinet", glbPath: "/models/kenney/bathroomCabinet.glb" },
      { id: "bathroom_cabinet_drawer_k", label: "Cabinet + Drawer", icon: "🗄️", description: "Drawer cabinet (3D)", shape: "box", type: "vertical", size: [0.60, 0.65, 0.40], materialId: "melamine_white", groupName: "Drawer Cabinet", glbPath: "/models/kenney/bathroomCabinetDrawer.glb" },
      { id: "bathroom_mirror_k", label: "Mirror", icon: "🪞", description: "Wall mirror (3D)", shape: "box", type: "back", size: [0.50, 0.70, 0.03], materialId: "mirror", groupName: "Mirror", glbPath: "/models/kenney/bathroomMirror.glb" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 10. KITCHEN APPLIANCES (Kenney GLB models)
  // ─────────────────────────────────────────────────
  {
    label: "Kitchen Appliances",
    icon: "🍳",
    items: [
      { id: "fridge_k", label: "Fridge", icon: "🧊", description: "Standard fridge (3D)", shape: "box", type: "vertical", size: [0.60, 1.70, 0.65], materialId: "melamine_white", groupName: "Fridge", glbPath: "/models/kenney/kitchenFridge.glb" },
      { id: "fridge_large_k", label: "Large Fridge", icon: "🧊", description: "Double-door (3D)", shape: "box", type: "vertical", size: [0.85, 1.80, 0.70], materialId: "melamine_white", groupName: "Large Fridge", glbPath: "/models/kenney/kitchenFridgeLarge.glb" },
      { id: "fridge_small_k", label: "Mini Fridge", icon: "🧊", description: "Under-counter (3D)", shape: "box", type: "vertical", size: [0.50, 0.85, 0.55], materialId: "melamine_white", groupName: "Mini Fridge", glbPath: "/models/kenney/kitchenFridgeSmall.glb" },
      { id: "fridge_builtin_k", label: "Built-in Fridge", icon: "🧊", description: "Integrated (3D)", shape: "box", type: "vertical", size: [0.60, 1.80, 0.60], materialId: "melamine_white", groupName: "Built-in Fridge", glbPath: "/models/kenney/kitchenFridgeBuiltIn.glb" },
      { id: "stove_k", label: "Gas Stove", icon: "🔥", description: "Gas stove (3D)", shape: "box", type: "vertical", size: [0.60, 0.85, 0.60], materialId: "steel", groupName: "Gas Stove", glbPath: "/models/kenney/kitchenStove.glb" },
      { id: "stove_electric_k", label: "Electric Stove", icon: "🔥", description: "Electric (3D)", shape: "box", type: "vertical", size: [0.60, 0.85, 0.60], materialId: "melamine_black", groupName: "Electric Stove", glbPath: "/models/kenney/kitchenStoveElectric.glb" },
      { id: "microwave_k", label: "Microwave", icon: "📦", description: "Microwave (3D)", shape: "box", type: "horizontal", size: [0.45, 0.26, 0.35], materialId: "melamine_black", groupName: "Microwave", glbPath: "/models/kenney/kitchenMicrowave.glb" },
      { id: "sink_kitchen_k", label: "Kitchen Sink", icon: "🚰", description: "Kitchen sink (3D)", shape: "box", type: "horizontal", size: [0.60, 0.20, 0.50], materialId: "steel", groupName: "Kitchen Sink", glbPath: "/models/kenney/kitchenSink.glb" },
      { id: "washer_k", label: "Washer", icon: "🧺", description: "Washing machine (3D)", shape: "box", type: "vertical", size: [0.60, 0.85, 0.60], materialId: "melamine_white", groupName: "Washer", glbPath: "/models/kenney/washer.glb" },
      { id: "dryer_k", label: "Dryer", icon: "🧺", description: "Dryer (3D)", shape: "box", type: "vertical", size: [0.60, 0.85, 0.60], materialId: "melamine_white", groupName: "Dryer", glbPath: "/models/kenney/dryer.glb" },
      { id: "washer_dryer_k", label: "Stacked W/D", icon: "🧺", description: "Stacked (3D)", shape: "box", type: "vertical", size: [0.60, 1.70, 0.60], materialId: "melamine_white", groupName: "Stacked Washer/Dryer", glbPath: "/models/kenney/washerDryerStacked.glb" },
      { id: "blender_k", label: "Blender", icon: "🥤", description: "Blender (3D)", shape: "cylinder", type: "vertical", size: [0.12, 0.35, 0.12], materialId: "steel", groupName: "Blender", glbPath: "/models/kenney/kitchenBlender.glb" },
      { id: "coffee_k", label: "Coffee Machine", icon: "☕", description: "Coffee machine (3D)", shape: "box", type: "vertical", size: [0.25, 0.35, 0.35], materialId: "melamine_black", groupName: "Coffee Machine", glbPath: "/models/kenney/kitchenCoffeeMachine.glb" },
      { id: "toaster_k", label: "Toaster", icon: "🍞", description: "Toaster (3D)", shape: "box", type: "vertical", size: [0.15, 0.18, 0.28], materialId: "steel", groupName: "Toaster", glbPath: "/models/kenney/toaster.glb" },
      { id: "hood_large_k", label: "Range Hood", icon: "🔲", description: "Large range hood (3D)", shape: "box", type: "horizontal", size: [0.90, 0.30, 0.50], materialId: "steel", groupName: "Range Hood", glbPath: "/models/kenney/hoodLarge.glb" },
      { id: "hood_modern_k", label: "Modern Hood", icon: "🔲", description: "Slim hood (3D)", shape: "box", type: "horizontal", size: [0.60, 0.25, 0.40], materialId: "steel", groupName: "Modern Hood", glbPath: "/models/kenney/hoodModern.glb" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 11. LIGHTING (Kenney GLB models)
  // ─────────────────────────────────────────────────
  {
    label: "Lighting",
    icon: "💡",
    items: [
      { id: "lamp_floor_round_k", label: "Round Floor Lamp", icon: "🪔", description: "Floor lamp (3D)", shape: "cylinder", type: "vertical", size: [0.30, 1.50, 0.30], materialId: "melamine_white", groupName: "Floor Lamp", glbPath: "/models/kenney/lampRoundFloor.glb" },
      { id: "lamp_table_round_k", label: "Round Table Lamp", icon: "🪔", description: "Table lamp (3D)", shape: "cylinder", type: "vertical", size: [0.20, 0.40, 0.20], materialId: "melamine_white", groupName: "Table Lamp", glbPath: "/models/kenney/lampRoundTable.glb" },
      { id: "lamp_floor_square_k", label: "Square Floor Lamp", icon: "🪔", description: "Square lamp (3D)", shape: "box", type: "vertical", size: [0.25, 1.50, 0.25], materialId: "melamine_white", groupName: "Square Floor Lamp", glbPath: "/models/kenney/lampSquareFloor.glb" },
      { id: "lamp_table_square_k", label: "Square Table Lamp", icon: "🪔", description: "Table lamp (3D)", shape: "box", type: "vertical", size: [0.18, 0.35, 0.18], materialId: "melamine_white", groupName: "Square Table Lamp", glbPath: "/models/kenney/lampSquareTable.glb" },
      { id: "lamp_ceiling_k", label: "Ceiling Lamp", icon: "💡", description: "Ceiling lamp (3D)", shape: "cylinder", type: "vertical", size: [0.40, 0.10, 0.40], materialId: "melamine_white", groupName: "Ceiling Lamp", glbPath: "/models/kenney/lampSquareCeiling.glb" },
      { id: "lamp_wall_k", label: "Wall Lamp", icon: "💡", description: "Wall sconce (3D)", shape: "half_sphere", type: "vertical", size: [0.15, 0.15, 0.10], materialId: "brass", groupName: "Wall Lamp", glbPath: "/models/kenney/lampWall.glb" },
      { id: "ceiling_fan_k", label: "Ceiling Fan", icon: "🌀", description: "Ceiling fan (3D)", shape: "cylinder", type: "horizontal", size: [1.00, 0.25, 1.00], materialId: "melamine_white", groupName: "Ceiling Fan", glbPath: "/models/kenney/ceilingFan.glb" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 12. ELECTRONICS (Kenney GLB models)
  // ─────────────────────────────────────────────────
  {
    label: "Electronics",
    icon: "🖥️",
    items: [
      { id: "tv_modern_k", label: "Modern TV", icon: "📺", description: "Flat screen (3D)", shape: "box", type: "back", size: [1.00, 0.56, 0.03], materialId: "melamine_black", groupName: "Modern TV", glbPath: "/models/kenney/televisionModern.glb" },
      { id: "tv_vintage_k", label: "Vintage TV", icon: "📺", description: "Retro TV (3D)", shape: "box", type: "vertical", size: [0.40, 0.35, 0.35], materialId: "melamine_black", groupName: "Vintage TV", glbPath: "/models/kenney/televisionVintage.glb" },
      { id: "tv_antenna_k", label: "Antenna TV", icon: "📺", description: "Old TV (3D)", shape: "box", type: "vertical", size: [0.35, 0.30, 0.30], materialId: "melamine_black", groupName: "Antenna TV", glbPath: "/models/kenney/televisionAntenna.glb" },
      { id: "monitor_k", label: "Monitor", icon: "🖥️", description: "Computer monitor (3D)", shape: "box", type: "back", size: [0.55, 0.35, 0.02], materialId: "melamine_black", groupName: "Monitor", glbPath: "/models/kenney/computerScreen.glb" },
      { id: "laptop_k", label: "Laptop", icon: "💻", description: "Laptop (3D)", shape: "box", type: "horizontal", size: [0.35, 0.02, 0.24], materialId: "melamine_gray", groupName: "Laptop", glbPath: "/models/kenney/laptop.glb" },
      { id: "keyboard_k", label: "Keyboard", icon: "⌨️", description: "Keyboard (3D)", shape: "box", type: "horizontal", size: [0.44, 0.02, 0.14], materialId: "melamine_black", groupName: "Keyboard", glbPath: "/models/kenney/computerKeyboard.glb" },
      { id: "mouse_k", label: "Mouse", icon: "🖱️", description: "Mouse (3D)", shape: "half_sphere", type: "horizontal", size: [0.06, 0.03, 0.10], materialId: "melamine_black", groupName: "Mouse", glbPath: "/models/kenney/computerMouse.glb" },
      { id: "speaker_k", label: "Speaker", icon: "🔊", description: "Floor speaker (3D)", shape: "box", type: "vertical", size: [0.20, 0.80, 0.25], materialId: "melamine_black", groupName: "Speaker", glbPath: "/models/kenney/speaker.glb" },
      { id: "speaker_small_k", label: "Small Speaker", icon: "🔊", description: "Bookshelf (3D)", shape: "box", type: "vertical", size: [0.12, 0.20, 0.15], materialId: "melamine_black", groupName: "Small Speaker", glbPath: "/models/kenney/speakerSmall.glb" },
      { id: "radio_k", label: "Radio", icon: "📻", description: "Tabletop radio (3D)", shape: "box", type: "horizontal", size: [0.25, 0.15, 0.15], materialId: "walnut", groupName: "Radio", glbPath: "/models/kenney/radio.glb" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 13. ROOM ELEMENTS (Kenney GLB + component)
  // ─────────────────────────────────────────────────
  {
    label: "Room Elements",
    icon: "🚪",
    items: [
      { id: "doorway_k", label: "Doorway", icon: "🚪", description: "Doorway frame (3D)", shape: "box", type: "vertical", size: [0.90, 2.10, 0.12], materialId: "oak", groupName: "Doorway", glbPath: "/models/kenney/doorway.glb" },
      { id: "doorway_open_k", label: "Open Doorway", icon: "🚪", description: "Open doorway (3D)", shape: "box", type: "vertical", size: [0.90, 2.10, 0.12], materialId: "oak", groupName: "Open Doorway", glbPath: "/models/kenney/doorwayOpen.glb" },
      { id: "stairs_k", label: "Stairs", icon: "🪜", description: "Staircase (3D)", shape: "box", type: "vertical", size: [0.90, 2.50, 2.50], materialId: "oak", groupName: "Stairs", glbPath: "/models/kenney/stairs.glb" },
      { id: "stairs_open_k", label: "Open Stairs", icon: "🪜", description: "Open staircase (3D)", shape: "box", type: "vertical", size: [0.90, 2.50, 2.50], materialId: "oak", groupName: "Open Stairs", glbPath: "/models/kenney/stairsOpen.glb" },
      { id: "coat_rack_k", label: "Coat Rack (Wall)", icon: "🧥", description: "Wall hooks (3D)", shape: "box", type: "horizontal", size: [0.60, 0.08, 0.10], materialId: "oak", groupName: "Coat Rack", glbPath: "/models/kenney/coatRack.glb" },
      { id: "coat_rack_stand_k", label: "Coat Rack (Standing)", icon: "🧥", description: "Standing rack (3D)", shape: "cylinder", type: "vertical", size: [0.04, 1.70, 0.04], materialId: "oak", groupName: "Standing Coat Rack", glbPath: "/models/kenney/coatRackStanding.glb" },
      { id: "trashcan_k", label: "Trashcan", icon: "🗑️", description: "Waste bin (3D)", shape: "cylinder", type: "vertical", size: [0.25, 0.60, 0.25], materialId: "steel", groupName: "Trashcan", glbPath: "/models/kenney/trashcan.glb" },
      { id: "wall_section", label: "Wall Section", icon: "🧱", description: "Wall panel", shape: "box", type: "vertical", size: [1.00, 2.40, 0.12], materialId: "melamine_white" },
      { id: "radiator_add", label: "Radiator", icon: "🔲", description: "Wall radiator", shape: "box", type: "vertical", size: [0.80, 0.60, 0.10], materialId: "melamine_white" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 14. PILLOWS & CUSHIONS
  // ─────────────────────────────────────────────────
  {
    label: "Pillows & Cushions",
    icon: "🛏️",
    items: [
      { id: "pillow_k", label: "White Pillow", icon: "🛏️", description: "Bed pillow (3D)", shape: "cushion", type: "horizontal", size: [0.50, 0.12, 0.35], materialId: "melamine_white", groupName: "Pillow", glbPath: "/models/kenney/pillow.glb" },
      { id: "pillow_blue_k", label: "Blue Pillow", icon: "🛏️", description: "Blue pillow (3D)", shape: "cushion", type: "horizontal", size: [0.50, 0.12, 0.35], materialId: "fabric_blue", groupName: "Blue Pillow", glbPath: "/models/kenney/pillowBlue.glb" },
      { id: "pillow_long_k", label: "Body Pillow", icon: "🛏️", description: "Body pillow (3D)", shape: "cushion", type: "horizontal", size: [0.80, 0.12, 0.30], materialId: "melamine_white", groupName: "Long Pillow", glbPath: "/models/kenney/pillowLong.glb" },
      { id: "pillow_throw_cream", label: "Cream Throw Pillow", icon: "▢", description: "Square accent pillow", shape: "cushion", type: "horizontal", size: [0.45, 0.12, 0.45], materialId: "fabric_cream", placeOnFloor: true },
      { id: "pillow_throw_taupe", label: "Taupe Throw Pillow", icon: "▢", description: "Square accent pillow", shape: "cushion", type: "horizontal", size: [0.45, 0.12, 0.45], materialId: "fabric_taupe", placeOnFloor: true },
      { id: "pillow_throw_sage", label: "Sage Throw Pillow", icon: "▢", description: "Square accent pillow", shape: "cushion", type: "horizontal", size: [0.45, 0.12, 0.45], materialId: "fabric_sage", placeOnFloor: true },
      { id: "pillow_throw_charcoal", label: "Charcoal Throw Pillow", icon: "▢", description: "Square accent pillow", shape: "cushion", type: "horizontal", size: [0.45, 0.12, 0.45], materialId: "fabric_charcoal", placeOnFloor: true },
      { id: "pillow_throw_mustard", label: "Mustard Throw Pillow", icon: "▢", description: "Square accent pillow", shape: "cushion", type: "horizontal", size: [0.45, 0.12, 0.45], materialId: "fabric_mustard", placeOnFloor: true },
      { id: "pillow_throw_blush", label: "Blush Throw Pillow", icon: "▢", description: "Square accent pillow", shape: "cushion", type: "horizontal", size: [0.45, 0.12, 0.45], materialId: "fabric_blush", placeOnFloor: true },
      { id: "pillow_lumbar_cream", label: "Cream Lumbar Pillow", icon: "▬", description: "Rectangular pillow", shape: "cushion", type: "horizontal", size: [0.55, 0.08, 0.30], materialId: "fabric_cream", placeOnFloor: true },
      { id: "pillow_lumbar_brown", label: "Brown Lumbar Pillow", icon: "▬", description: "Rectangular pillow", shape: "cushion", type: "horizontal", size: [0.55, 0.08, 0.30], materialId: "fabric_brown", placeOnFloor: true },
      { id: "pillow_round", label: "Round Cushion", icon: "⬤", description: "Round floor cushion", shape: "cushion", type: "horizontal", size: [0.45, 0.10, 0.45], materialId: "fabric_cream", placeOnFloor: true },
      { id: "bolster_cream", label: "Bolster Roll", icon: "⊜", description: "Cylindrical bolster", shape: "cushion_bolster", type: "horizontal", size: [0.50, 0.16, 0.16], materialId: "fabric_cream", placeOnFloor: true },
      { id: "bolster_taupe", label: "Taupe Bolster", icon: "⊜", description: "Cylindrical bolster", shape: "cushion_bolster", type: "horizontal", size: [0.50, 0.16, 0.16], materialId: "fabric_taupe", placeOnFloor: true },
      // Standing/leaning decorative pillows (vertical — like on the reference sofa)
      { id: "standing_pillow_charcoal", label: "Standing Pillow Dark", icon: "◆", description: "Upright decorative pillow", shape: "cushion", type: "vertical", size: [0.42, 0.42, 0.12], materialId: "fabric_charcoal", placeOnFloor: true },
      { id: "standing_pillow_brown", label: "Standing Pillow Brown", icon: "◆", description: "Upright decorative pillow", shape: "cushion", type: "vertical", size: [0.42, 0.42, 0.12], materialId: "fabric_brown", placeOnFloor: true },
      { id: "standing_pillow_cream", label: "Standing Pillow Cream", icon: "◆", description: "Upright decorative pillow", shape: "cushion", type: "vertical", size: [0.42, 0.42, 0.12], materialId: "fabric_cream", placeOnFloor: true },
      { id: "standing_pillow_taupe", label: "Standing Pillow Taupe", icon: "◆", description: "Upright decorative pillow", shape: "cushion", type: "vertical", size: [0.42, 0.42, 0.12], materialId: "fabric_taupe", placeOnFloor: true },
      { id: "standing_pillow_sage", label: "Standing Pillow Sage", icon: "◆", description: "Upright decorative pillow", shape: "cushion", type: "vertical", size: [0.42, 0.42, 0.12], materialId: "fabric_sage", placeOnFloor: true },
      { id: "standing_pillow_sm_charcoal", label: "Small Standing Dark", icon: "◇", description: "Small upright pillow", shape: "cushion", type: "vertical", size: [0.35, 0.35, 0.10], materialId: "fabric_charcoal", placeOnFloor: true },
      { id: "standing_pillow_sm_brown", label: "Small Standing Brown", icon: "◇", description: "Small upright pillow", shape: "cushion", type: "vertical", size: [0.35, 0.35, 0.10], materialId: "fabric_brown", placeOnFloor: true },
    ],
  },

  // ─────────────────────────────────────────────────
  // 15. BLANKETS & THROWS
  // ─────────────────────────────────────────────────
  {
    label: "Blankets & Throws",
    icon: "🧶",
    items: [
      // Folded throws — thin, like a real folded blanket (3 fabric layers = ~15mm)
      { id: "throw_folded_cream", label: "Folded Cream Throw", icon: "☰", description: "Neatly folded blanket", shape: "draped", type: "horizontal", size: [0.50, 0.015, 0.35], materialId: "fabric_cream", placeOnFloor: true, shapeParams: { cornerRadius: 0.005, softness: 0.62, foldSpread: 0.14 } },
      { id: "throw_folded_gray", label: "Folded Gray Throw", icon: "☰", description: "Neatly folded blanket", shape: "draped", type: "horizontal", size: [0.50, 0.015, 0.35], materialId: "fabric_gray", placeOnFloor: true, shapeParams: { cornerRadius: 0.005, softness: 0.62, foldSpread: 0.14 } },
      { id: "throw_folded_charcoal", label: "Folded Charcoal Throw", icon: "☰", description: "Neatly folded blanket", shape: "draped", type: "horizontal", size: [0.50, 0.015, 0.35], materialId: "fabric_charcoal", placeOnFloor: true, shapeParams: { cornerRadius: 0.005, softness: 0.62, foldSpread: 0.14 } },
      { id: "throw_folded_taupe", label: "Folded Taupe Throw", icon: "☰", description: "Neatly folded blanket", shape: "draped", type: "horizontal", size: [0.50, 0.015, 0.35], materialId: "fabric_taupe", placeOnFloor: true, shapeParams: { cornerRadius: 0.005, softness: 0.62, foldSpread: 0.14 } },
      // Draped throws — thin flat panels
      { id: "throw_draped_cream", label: "Draped Cream Throw", icon: "≈", description: "Casually draped blanket", shape: "draped", type: "horizontal", size: [0.80, 0.01, 0.60], materialId: "fabric_cream", placeOnFloor: true, shapeParams: { cornerRadius: 0.005, softness: 0.65, foldSpread: 0.14 } },
      { id: "throw_draped_gray", label: "Draped Gray Throw", icon: "≈", description: "Casually draped blanket", shape: "draped", type: "horizontal", size: [0.80, 0.01, 0.60], materialId: "fabric_gray", placeOnFloor: true, shapeParams: { cornerRadius: 0.005, softness: 0.65, foldSpread: 0.14 } },
      // Duvets — puffy but not as thick as a mattress
      { id: "duvet_white", label: "White Duvet", icon: "▓", description: "Bed comforter", shape: "cushion", type: "horizontal", size: [1.50, 0.10, 1.90], materialId: "fabric_cream", placeOnFloor: true },
      { id: "duvet_charcoal", label: "Charcoal Duvet", icon: "▓", description: "Dark bed comforter", shape: "cushion", type: "horizontal", size: [1.50, 0.10, 1.90], materialId: "fabric_charcoal", placeOnFloor: true },
      { id: "duvet_brown", label: "Brown Duvet", icon: "▓", description: "Brown bed comforter", shape: "cushion", type: "horizontal", size: [1.50, 0.10, 1.90], materialId: "fabric_brown", placeOnFloor: true },
      { id: "bed_runner_brown", label: "Brown Bed Runner", icon: "━", description: "Decorative bed strip", shape: "draped", type: "horizontal", size: [1.50, 0.015, 0.50], materialId: "fabric_brown", placeOnFloor: true, shapeParams: { softness: 0.55, foldSpread: 0.16 } },
      { id: "bed_runner_gray", label: "Gray Bed Runner", icon: "━", description: "Decorative bed strip", shape: "draped", type: "horizontal", size: [1.50, 0.015, 0.50], materialId: "fabric_gray", placeOnFloor: true, shapeParams: { softness: 0.55, foldSpread: 0.16 } },
    ],
  },

  // ─────────────────────────────────────────────────
  // 16. RUGS & CARPETS
  // ─────────────────────────────────────────────────
  {
    label: "Rugs & Carpets",
    icon: "🟫",
    items: [
      // Kenney GLB rugs
      { id: "rug_rect_k", label: "Rectangle Rug", icon: "🟫", description: "Area rug (3D)", shape: "box", type: "horizontal", size: [2.00, 0.01, 1.40], materialId: "fabric_gray", groupName: "Rectangle Rug", glbPath: "/models/kenney/rugRectangle.glb" },
      { id: "rug_round_k", label: "Round Rug", icon: "⭕", description: "Round rug (3D)", shape: "cylinder", type: "horizontal", size: [1.50, 0.01, 1.50], materialId: "fabric_gray", groupName: "Round Rug", glbPath: "/models/kenney/rugRound.glb" },
      { id: "rug_square_k", label: "Square Rug", icon: "🟫", description: "Square rug (3D)", shape: "box", type: "horizontal", size: [1.60, 0.01, 1.60], materialId: "fabric_gray", groupName: "Square Rug", glbPath: "/models/kenney/rugSquare.glb" },
      { id: "rug_doormat_k", label: "Doormat", icon: "🟫", description: "Entry mat (3D)", shape: "box", type: "horizontal", size: [0.60, 0.01, 0.40], materialId: "fabric_gray", groupName: "Doormat", glbPath: "/models/kenney/rugDoormat.glb" },
      // Component rugs — various colors and sizes
      { id: "rug_large_cream", label: "Large Cream Rug", icon: "🟫", description: "2.4×1.7m area rug", shape: "rounded_rect", type: "horizontal", size: [2.40, 0.01, 1.70], materialId: "fabric_cream", placeOnFloor: true, shapeParams: { cornerRadius: 0.01 } },
      { id: "rug_large_gray", label: "Large Gray Rug", icon: "🟫", description: "2.4×1.7m area rug", shape: "rounded_rect", type: "horizontal", size: [2.40, 0.01, 1.70], materialId: "fabric_gray", placeOnFloor: true, shapeParams: { cornerRadius: 0.01 } },
      { id: "rug_large_taupe", label: "Large Taupe Rug", icon: "🟫", description: "2.4×1.7m area rug", shape: "rounded_rect", type: "horizontal", size: [2.40, 0.01, 1.70], materialId: "fabric_taupe", placeOnFloor: true, shapeParams: { cornerRadius: 0.01 } },
      { id: "rug_medium_cream", label: "Medium Cream Rug", icon: "🟫", description: "1.8×1.2m rug", shape: "rounded_rect", type: "horizontal", size: [1.80, 0.01, 1.20], materialId: "fabric_cream", placeOnFloor: true, shapeParams: { cornerRadius: 0.01 } },
      { id: "rug_medium_charcoal", label: "Medium Charcoal Rug", icon: "🟫", description: "1.8×1.2m rug", shape: "rounded_rect", type: "horizontal", size: [1.80, 0.01, 1.20], materialId: "fabric_charcoal", placeOnFloor: true, shapeParams: { cornerRadius: 0.01 } },
      { id: "rug_small_beige", label: "Small Beige Rug", icon: "🟫", description: "1.2×0.8m rug", shape: "rounded_rect", type: "horizontal", size: [1.20, 0.01, 0.80], materialId: "fabric_beige", placeOnFloor: true, shapeParams: { cornerRadius: 0.01 } },
      { id: "rug_runner_cream", label: "Runner Rug Cream", icon: "▬", description: "Hallway runner 2.4×0.7m", shape: "rounded_rect", type: "horizontal", size: [2.40, 0.01, 0.70], materialId: "fabric_cream", placeOnFloor: true, shapeParams: { cornerRadius: 0.01 } },
      { id: "rug_runner_gray", label: "Runner Rug Gray", icon: "▬", description: "Hallway runner 2.4×0.7m", shape: "rounded_rect", type: "horizontal", size: [2.40, 0.01, 0.70], materialId: "fabric_gray", placeOnFloor: true, shapeParams: { cornerRadius: 0.01 } },
      { id: "rug_round_cream", label: "Round Cream Rug", icon: "⭕", description: "Round 1.5m rug", shape: "circle_panel", type: "horizontal", size: [1.50, 0.01, 1.50], materialId: "fabric_cream", placeOnFloor: true },
      { id: "rug_round_taupe", label: "Round Taupe Rug", icon: "⭕", description: "Round 1.5m rug", shape: "circle_panel", type: "horizontal", size: [1.50, 0.01, 1.50], materialId: "fabric_taupe", placeOnFloor: true },
      { id: "rug_round_small", label: "Small Round Rug", icon: "⭕", description: "Round 1.0m rug", shape: "circle_panel", type: "horizontal", size: [1.00, 0.01, 1.00], materialId: "fabric_beige", placeOnFloor: true },
      { id: "rug_oval_cream", label: "Oval Cream Rug", icon: "⬮", description: "Oval 1.8×1.2m rug", shape: "oval", type: "horizontal", size: [1.80, 0.01, 1.20], materialId: "fabric_cream", placeOnFloor: true },
      { id: "rug_bath_white", label: "Bath Mat", icon: "🟫", description: "Small bath mat", shape: "rounded_rect", type: "horizontal", size: [0.60, 0.015, 0.40], materialId: "fabric_ivory", placeOnFloor: true, shapeParams: { cornerRadius: 0.02 } },
    ],
  },

  // ─────────────────────────────────────────────────
  // 15. PLANTS & DECORATIVE (Kenney GLB models)
  // ─────────────────────────────────────────────────
  {
    label: "Plants & Decor",
    icon: "🌿",
    items: [
      {
        id: "potted_plant_simple",
        label: "Potted plant (simple)",
        icon: "🪴",
        description: "Terracotta pot + foliage — no GLB",
        shape: "potted_plant",
        type: "vertical",
        size: [0.28, 0.55, 0.28],
        materialId: "fabric_green",
        placeOnSelected: true,
      },
      { id: "plant1_k", label: "Small Plant 1", icon: "🌱", description: "Succulent (3D)", shape: "sphere", type: "vertical", size: [0.10, 0.15, 0.10], materialId: "fabric_green", groupName: "Small Plant", glbPath: "/models/kenney/plantSmall1.glb" },
      { id: "plant2_k", label: "Small Plant 2", icon: "🌱", description: "Leafy plant (3D)", shape: "sphere", type: "vertical", size: [0.12, 0.18, 0.12], materialId: "fabric_green", groupName: "Small Plant 2", glbPath: "/models/kenney/plantSmall2.glb" },
      { id: "plant3_k", label: "Small Plant 3", icon: "🌱", description: "Herb pot (3D)", shape: "sphere", type: "vertical", size: [0.08, 0.20, 0.08], materialId: "fabric_green", groupName: "Small Plant 3", glbPath: "/models/kenney/plantSmall3.glb" },
      { id: "potted_k", label: "Potted Plant", icon: "🪴", description: "Floor plant (3D)", shape: "sphere", type: "vertical", size: [0.30, 0.60, 0.30], materialId: "fabric_green", groupName: "Potted Plant", glbPath: "/models/kenney/pottedPlant.glb" },
      { id: "monstera_k", label: "Monstera", icon: "🌿", description: "Tropical monstera (3D)", shape: "sphere", type: "vertical", size: [0.40, 0.55, 0.40], materialId: "fabric_green", groupName: "Monstera", glbPath: "/models/kenney/monstera.glb" },
      { id: "cactus1_k", label: "Cactus", icon: "🌵", description: "Small cactus (3D)", shape: "sphere", type: "vertical", size: [0.10, 0.20, 0.10], materialId: "fabric_green", groupName: "Cactus", glbPath: "/models/kenney/cactus1.glb" },
      { id: "cactus2_k", label: "Cactus Round", icon: "🌵", description: "Round cactus (3D)", shape: "sphere", type: "vertical", size: [0.12, 0.18, 0.12], materialId: "fabric_green", groupName: "Cactus Round", glbPath: "/models/kenney/cactus2.glb" },
      { id: "cactusFlowers_k", label: "Flowering Cactus", icon: "🌺", description: "Cactus with flowers (3D)", shape: "sphere", type: "vertical", size: [0.12, 0.22, 0.12], materialId: "fabric_green", groupName: "Flowering Cactus", glbPath: "/models/kenney/cactusFlowers.glb" },
      { id: "fern_k", label: "Fern", icon: "🌿", description: "Potted fern (3D)", shape: "sphere", type: "vertical", size: [0.35, 0.40, 0.35], materialId: "fabric_green", groupName: "Fern", glbPath: "/models/kenney/fern.glb" },
      { id: "palm_k", label: "Palm", icon: "🌴", description: "Indoor palm (3D)", shape: "sphere", type: "vertical", size: [0.40, 0.80, 0.40], materialId: "fabric_green", groupName: "Palm", glbPath: "/models/kenney/palmTree.glb" },
      { id: "houseplant_k", label: "Houseplant", icon: "🌱", description: "Generic houseplant (3D)", shape: "sphere", type: "vertical", size: [0.20, 0.30, 0.20], materialId: "fabric_green", groupName: "Houseplant", glbPath: "/models/kenney/houseplant.glb" },
      { id: "hanging_k", label: "Hanging Plant", icon: "🌿", description: "Trailing vine plant (3D)", shape: "sphere", type: "vertical", size: [0.25, 0.40, 0.25], materialId: "fabric_green", groupName: "Hanging Plant", glbPath: "/models/kenney/hangingPlant.glb" },
      { id: "books_k", label: "Books", icon: "📚", description: "Book stack (3D)", shape: "box", type: "horizontal", size: [0.18, 0.22, 0.13], materialId: "oak", groupName: "Books", glbPath: "/models/kenney/books.glb" },
      { id: "bear_k", label: "Teddy Bear", icon: "🧸", description: "Plush bear (3D)", shape: "sphere", type: "vertical", size: [0.20, 0.25, 0.15], materialId: "leather_tan", groupName: "Teddy Bear", glbPath: "/models/kenney/bear.glb" },
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
    placeOnFloor?: boolean;
    softDecorKind?: "blanket" | "pillow";
  }) => void;
  onAddGroup?: (name: string, panels: PanelData[]) => void;
  onAddGLB?: (name: string, glbPath: string) => void;
  onClose: () => void;
}

export function AddPartPicker({ onAdd, onAddGroup, onAddGLB, onClose }: AddPartPickerProps) {
  const { isMobileLayout } = useMobileInfo();
  const [hovered, setHovered] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<'grid' | 'detail'>('grid');
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState<string | null>(null);

  const searchLower = search.toLowerCase();
  const isSearching = searchLower.length > 0;

  const filteredCategories = PART_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
    ),
  })).filter((cat) => cat.items.length > 0);

  // Flat filtered results for search mode
  const flatFilteredItems = filteredCategories.flatMap((cat) => cat.items);

  const selectedCategory = PART_CATEGORIES.find((c) => c.label === selectedCategoryLabel) ?? null;
  const detailItems = selectedCategory
    ? (isSearching
        ? selectedCategory.items.filter(
            (item) =>
              item.label.toLowerCase().includes(searchLower) ||
              item.description.toLowerCase().includes(searchLower)
          )
        : selectedCategory.items)
    : [];

  const handleItemClick = async (item: PartPreset) => {
    try {
      if (item.glbPath && onAddGLB) {
        await onAddGLB(item.groupName ?? item.label, item.glbPath);
      } else if (item.buildPanels && onAddGroup) {
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
          placeOnFloor: item.placeOnFloor,
          softDecorKind: item.softDecorKind,
        });
      }
    } finally {
      onClose();
    }
  };

  const itemCard = (item: PartPreset) => (
    <button
      type="button"
      key={item.id}
      onClick={() => handleItemClick(item)}
      onMouseEnter={() => setHovered(item.id)}
      onMouseLeave={() => setHovered(null)}
      className={`relative group rounded-xl border p-3 text-left transition-all duration-200 min-h-[44px] ${
        hovered === item.id
          ? "border-[#C87D5A]/40 bg-[#C87D5A]/[0.04] shadow-md shadow-[#C87D5A]/10 scale-[1.02]"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 text-lg transition-colors ${
          hovered === item.id ? "bg-[#C87D5A]/10" : "bg-gray-100"
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
  );

  // ── Screen 1: Category Grid ──
  const categoryGrid = (
    <div className="grid grid-cols-3 gap-2.5">
      {(isSearching ? filteredCategories : PART_CATEGORIES).map((category) => {
        const count = isSearching ? category.items.length : category.items.length;
        return (
          <button
            key={category.label}
            type="button"
            onClick={() => {
              setSelectedCategoryLabel(category.label);
              setView('detail');
            }}
            className="group relative aspect-square flex flex-col items-center justify-center bg-white border border-black/[0.07] rounded-xl transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg"
          >
            {/* Item count badge */}
            <span className="absolute top-2 right-2 text-[9px] font-semibold bg-[#C87D5A] text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {count}
            </span>
            {/* Icon */}
            <span className="text-2xl mb-2">{category.icon}</span>
            {/* Label */}
            <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight px-1">
              {category.label}
            </span>
          </button>
        );
      })}
      {(isSearching ? filteredCategories : PART_CATEGORIES).length === 0 && (
        <div className="col-span-3 text-center text-sm text-gray-400 py-8">
          No shapes match &quot;{search}&quot;
        </div>
      )}
    </div>
  );

  // ── Screen 2: Category Detail ──
  const categoryDetail = (
    <div>
      {/* Back header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => {
            setView('grid');
            setSelectedCategoryLabel(null);
          }}
          className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500 hover:text-gray-700"
        >
          <span className="text-sm">&larr;</span>
        </button>
        <span className="text-sm">{selectedCategory?.icon}</span>
        <h4 className="text-sm font-semibold text-gray-900">{selectedCategory?.label}</h4>
        <span className="text-[10px] text-gray-400">({detailItems.length} items)</span>
      </div>

      {/* Items grid */}
      <div className={`grid gap-2 ${isMobileLayout ? "grid-cols-2" : "grid-cols-3"}`}>
        {detailItems.map((item) => itemCard(item))}
      </div>
      {detailItems.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-8">
          No shapes match &quot;{search}&quot;
        </div>
      )}
    </div>
  );

  // ── Flat search results (across all categories) ──
  const flatSearchResults = (
    <div>
      <p className="text-[10px] text-gray-400 mb-2">{flatFilteredItems.length} results</p>
      <div className={`grid gap-2 ${isMobileLayout ? "grid-cols-2" : "grid-cols-3"}`}>
        {flatFilteredItems.map((item) => itemCard(item))}
      </div>
      {flatFilteredItems.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-8">
          No shapes match &quot;{search}&quot;
        </div>
      )}
    </div>
  );

  const searchBar = (
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
  );

  // Determine which content to show
  const contentView = isSearching
    ? flatSearchResults
    : view === 'detail' && selectedCategory
      ? categoryDetail
      : categoryGrid;

  if (isMobileLayout) {
    return (
      <MobileDrawer isOpen={true} onClose={onClose} title="Add Part" height="half">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-400">
            {PART_CATEGORIES.reduce((n, c) => n + c.items.length, 0)} shapes across {PART_CATEGORIES.length} categories
          </p>
          {searchBar}
          {contentView}
        </div>
      </MobileDrawer>
    );
  }

  const desktopModal = (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[600px] max-w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-part-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 id="add-part-title" className="text-base font-serif font-semibold text-gray-900">
                Add Part
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {PART_CATEGORIES.reduce((n, c) => n + c.items.length, 0)} shapes across {PART_CATEGORIES.length} categories
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {/* Search */}
          {searchBar}
        </div>

        {/* Content with slide transition */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div
            className="transition-all duration-200 ease-in-out"
            style={{
              opacity: 1,
              transform: view === 'detail' && !isSearching ? 'translateX(0)' : 'translateX(0)',
            }}
          >
            {contentView}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(desktopModal, document.body) : null;
}
