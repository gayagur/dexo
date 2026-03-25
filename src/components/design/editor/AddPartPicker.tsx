import { useState } from "react";
import { X, Search } from "lucide-react";
import type { PanelData, PanelShape } from "@/lib/furnitureData";

// ─── Part definition ───────────────────────────────────

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
  // 9. BATHROOM FIXTURES
  // ─────────────────────────────────────────────────
  {
    label: "Bathroom Fixtures",
    icon: "🚿",
    items: [
      { id: "toilet_standard", label: "Toilet", icon: "🚽", description: "Standard toilet", shape: "box", type: "vertical", size: [0.38, 0.40, 0.65], materialId: "ceramic_white" },
      { id: "toilet_square", label: "Square Toilet", icon: "🚽", description: "Modern square design", shape: "box", type: "vertical", size: [0.38, 0.40, 0.60], materialId: "ceramic_white" },
      { id: "bathtub_oval", label: "Bathtub", icon: "🛁", description: "Freestanding oval bathtub", shape: "half_sphere", type: "horizontal", size: [0.75, 0.50, 1.60], materialId: "ceramic_white" },
      { id: "sink_round", label: "Sink (Round)", icon: "🚰", description: "Round bathroom sink", shape: "cylinder", type: "horizontal", size: [0.45, 0.15, 0.45], materialId: "ceramic_white" },
      { id: "sink_square", label: "Sink (Square)", icon: "🚰", description: "Square bathroom sink", shape: "box", type: "horizontal", size: [0.50, 0.12, 0.40], materialId: "ceramic_white" },
      { id: "shower_cabin", label: "Shower Cabin", icon: "🚿", description: "Glass shower enclosure", shape: "box", type: "vertical", size: [0.90, 2.00, 0.90], materialId: "glass" },
      { id: "shower_round", label: "Round Shower", icon: "🚿", description: "Round glass shower", shape: "cylinder", type: "vertical", size: [0.90, 2.00, 0.90], materialId: "glass" },
      { id: "bathroom_cabinet", label: "Bathroom Cabinet", icon: "🗄️", description: "Under-sink cabinet", shape: "box", type: "vertical", size: [0.60, 0.65, 0.40], materialId: "melamine_white" },
      { id: "bathroom_cabinet_drawer", label: "Cabinet with Drawer", icon: "🗄️", description: "Bathroom drawer cabinet", shape: "box", type: "vertical", size: [0.60, 0.65, 0.40], materialId: "melamine_white" },
      { id: "bathroom_mirror", label: "Mirror", icon: "🪞", description: "Wall-mounted mirror", shape: "box", type: "back", size: [0.50, 0.70, 0.01], materialId: "mirror" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 10. KITCHEN APPLIANCES
  // ─────────────────────────────────────────────────
  {
    label: "Kitchen Appliances",
    icon: "🍳",
    items: [
      { id: "fridge", label: "Fridge", icon: "🧊", description: "Standard fridge", shape: "box", type: "vertical", size: [0.60, 1.70, 0.65], materialId: "melamine_white" },
      { id: "fridge_large", label: "Large Fridge", icon: "🧊", description: "Double-door fridge", shape: "box", type: "vertical", size: [0.85, 1.80, 0.70], materialId: "melamine_white" },
      { id: "fridge_small", label: "Mini Fridge", icon: "🧊", description: "Under-counter fridge", shape: "box", type: "vertical", size: [0.50, 0.85, 0.55], materialId: "melamine_white" },
      { id: "fridge_builtin", label: "Built-in Fridge", icon: "🧊", description: "Integrated fridge", shape: "box", type: "vertical", size: [0.60, 1.80, 0.60], materialId: "melamine_white" },
      { id: "oven_standard", label: "Oven", icon: "🔥", description: "Built-in oven", shape: "box", type: "vertical", size: [0.60, 0.60, 0.55], materialId: "melamine_black" },
      { id: "stove_gas", label: "Gas Stove", icon: "🔥", description: "4-burner gas stove", shape: "box", type: "horizontal", size: [0.60, 0.85, 0.60], materialId: "steel" },
      { id: "stove_electric", label: "Electric Stove", icon: "🔥", description: "Electric cooktop", shape: "box", type: "horizontal", size: [0.60, 0.85, 0.60], materialId: "melamine_black" },
      { id: "microwave", label: "Microwave", icon: "📦", description: "Countertop microwave", shape: "box", type: "horizontal", size: [0.45, 0.26, 0.35], materialId: "melamine_black" },
      { id: "kitchen_sink", label: "Kitchen Sink", icon: "🚰", description: "Drop-in kitchen sink", shape: "box", type: "horizontal", size: [0.60, 0.20, 0.50], materialId: "steel" },
      { id: "washer", label: "Washing Machine", icon: "🧺", description: "Front-loading washer", shape: "box", type: "vertical", size: [0.60, 0.85, 0.60], materialId: "melamine_white" },
      { id: "dryer", label: "Dryer", icon: "🧺", description: "Clothes dryer", shape: "box", type: "vertical", size: [0.60, 0.85, 0.60], materialId: "melamine_white" },
      { id: "washer_dryer_stack", label: "Stacked Washer/Dryer", icon: "🧺", description: "Stacked units", shape: "box", type: "vertical", size: [0.60, 1.70, 0.60], materialId: "melamine_white" },
      { id: "blender", label: "Blender", icon: "🥤", description: "Kitchen blender", shape: "cylinder", type: "vertical", size: [0.12, 0.35, 0.12], materialId: "steel" },
      { id: "coffee_machine", label: "Coffee Machine", icon: "☕", description: "Espresso machine", shape: "box", type: "vertical", size: [0.25, 0.35, 0.35], materialId: "melamine_black" },
      { id: "toaster_add", label: "Toaster", icon: "🍞", description: "2-slot toaster", shape: "box", type: "vertical", size: [0.15, 0.18, 0.28], materialId: "steel" },
      { id: "range_hood_large", label: "Range Hood (Large)", icon: "🔲", description: "Wide range hood", shape: "box", type: "horizontal", size: [0.90, 0.30, 0.50], materialId: "steel" },
      { id: "range_hood_modern", label: "Range Hood (Modern)", icon: "🔲", description: "Slim modern hood", shape: "box", type: "horizontal", size: [0.60, 0.25, 0.40], materialId: "steel" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 11. LIGHTING
  // ─────────────────────────────────────────────────
  {
    label: "Lighting",
    icon: "💡",
    items: [
      { id: "lamp_floor_round", label: "Round Floor Lamp", icon: "🪔", description: "Standing floor lamp with round shade", shape: "lamp_shade", type: "vertical", size: [0.30, 1.50, 0.30], materialId: "melamine_white", shapeParams: { topRatio: 0.3 } },
      { id: "lamp_table_round", label: "Round Table Lamp", icon: "🪔", description: "Table lamp with round shade", shape: "lamp_shade", type: "vertical", size: [0.20, 0.40, 0.20], materialId: "melamine_white", shapeParams: { topRatio: 0.3 } },
      { id: "lamp_floor_square", label: "Square Floor Lamp", icon: "🪔", description: "Floor lamp with square shade", shape: "box", type: "vertical", size: [0.25, 1.50, 0.25], materialId: "melamine_white" },
      { id: "lamp_table_square", label: "Square Table Lamp", icon: "🪔", description: "Table lamp with square shade", shape: "box", type: "vertical", size: [0.18, 0.35, 0.18], materialId: "melamine_white" },
      { id: "lamp_ceiling", label: "Ceiling Lamp", icon: "💡", description: "Ceiling-mounted lamp", shape: "cylinder", type: "vertical", size: [0.40, 0.10, 0.40], materialId: "melamine_white" },
      { id: "lamp_wall", label: "Wall Sconce", icon: "💡", description: "Wall-mounted light", shape: "half_sphere", type: "vertical", size: [0.15, 0.15, 0.10], materialId: "brass" },
      { id: "ceiling_fan_add", label: "Ceiling Fan", icon: "🌀", description: "Fan with light", shape: "cylinder", type: "horizontal", size: [1.00, 0.25, 1.00], materialId: "melamine_white" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 12. ELECTRONICS
  // ─────────────────────────────────────────────────
  {
    label: "Electronics",
    icon: "🖥️",
    items: [
      { id: "tv_modern", label: "Modern TV", icon: "📺", description: "Flat screen TV", shape: "box", type: "back", size: [1.00, 0.56, 0.03], materialId: "melamine_black" },
      { id: "tv_vintage", label: "Vintage TV", icon: "📺", description: "Retro CRT TV", shape: "box", type: "vertical", size: [0.40, 0.35, 0.35], materialId: "melamine_black" },
      { id: "tv_antenna", label: "Antenna TV", icon: "📺", description: "Old antenna TV", shape: "box", type: "vertical", size: [0.35, 0.30, 0.30], materialId: "melamine_black" },
      { id: "monitor", label: "Computer Monitor", icon: "🖥️", description: "Desktop monitor", shape: "box", type: "back", size: [0.55, 0.35, 0.02], materialId: "melamine_black" },
      { id: "laptop_add", label: "Laptop", icon: "💻", description: "Open laptop", shape: "box", type: "horizontal", size: [0.35, 0.02, 0.24], materialId: "melamine_gray" },
      { id: "keyboard_add", label: "Keyboard", icon: "⌨️", description: "Computer keyboard", shape: "box", type: "horizontal", size: [0.44, 0.02, 0.14], materialId: "melamine_black" },
      { id: "mouse_add", label: "Mouse", icon: "🖱️", description: "Computer mouse", shape: "half_sphere", type: "horizontal", size: [0.06, 0.03, 0.10], materialId: "melamine_black" },
      { id: "speaker_large", label: "Speaker", icon: "🔊", description: "Floor speaker", shape: "box", type: "vertical", size: [0.20, 0.80, 0.25], materialId: "melamine_black" },
      { id: "speaker_small", label: "Small Speaker", icon: "🔊", description: "Bookshelf speaker", shape: "box", type: "vertical", size: [0.12, 0.20, 0.15], materialId: "melamine_black" },
      { id: "radio_add", label: "Radio", icon: "📻", description: "Tabletop radio", shape: "box", type: "horizontal", size: [0.25, 0.15, 0.15], materialId: "walnut" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 13. ROOM ELEMENTS
  // ─────────────────────────────────────────────────
  {
    label: "Room Elements",
    icon: "🚪",
    items: [
      { id: "door_standard", label: "Door", icon: "🚪", description: "Interior door", shape: "box", type: "vertical", size: [0.80, 2.00, 0.04], materialId: "oak" },
      { id: "door_front", label: "Front Door", icon: "🚪", description: "Exterior entry door", shape: "box", type: "vertical", size: [0.90, 2.10, 0.05], materialId: "walnut" },
      { id: "window_standard", label: "Window", icon: "🪟", description: "Double-hung window", shape: "box", type: "back", size: [0.80, 1.00, 0.06], materialId: "glass" },
      { id: "window_slide", label: "Sliding Window", icon: "🪟", description: "Sliding glass window", shape: "box", type: "back", size: [1.20, 1.00, 0.06], materialId: "glass" },
      { id: "wall_section", label: "Wall Section", icon: "🧱", description: "Wall panel", shape: "box", type: "vertical", size: [1.00, 2.40, 0.12], materialId: "melamine_white" },
      { id: "wall_half", label: "Half Wall", icon: "🧱", description: "Low wall / partition", shape: "box", type: "vertical", size: [1.00, 1.20, 0.12], materialId: "melamine_white" },
      { id: "wall_corner", label: "Wall Corner", icon: "🧱", description: "L-shaped wall corner", shape: "box", type: "vertical", size: [0.12, 2.40, 1.00], materialId: "melamine_white" },
      { id: "stairs_add", label: "Stairs", icon: "🪜", description: "Staircase section", shape: "box", type: "vertical", size: [0.90, 2.50, 2.50], materialId: "oak" },
      { id: "radiator_add", label: "Radiator", icon: "🔲", description: "Wall radiator", shape: "box", type: "vertical", size: [0.80, 0.60, 0.10], materialId: "melamine_white" },
      { id: "coat_rack", label: "Coat Rack (Wall)", icon: "🧥", description: "Wall-mounted hooks", shape: "box", type: "horizontal", size: [0.60, 0.08, 0.10], materialId: "oak" },
      { id: "coat_rack_standing", label: "Coat Rack (Standing)", icon: "🧥", description: "Free-standing coat rack", shape: "cylinder", type: "vertical", size: [0.04, 1.70, 0.04], materialId: "oak" },
      { id: "trashcan_add", label: "Trashcan", icon: "🗑️", description: "Waste bin", shape: "cylinder", type: "vertical", size: [0.25, 0.60, 0.25], materialId: "steel" },
      { id: "cardboard_box_closed", label: "Box (Closed)", icon: "📦", description: "Cardboard box", shape: "box", type: "vertical", size: [0.40, 0.30, 0.40], materialId: "oak" },
      { id: "cardboard_box_open", label: "Box (Open)", icon: "📦", description: "Open cardboard box", shape: "open_tray", type: "horizontal", size: [0.40, 0.30, 0.40], materialId: "oak" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 14. SOFT FURNISHINGS
  // ─────────────────────────────────────────────────
  {
    label: "Soft Furnishings",
    icon: "🛋️",
    items: [
      { id: "pillow_white", label: "Pillow (White)", icon: "🛏️", description: "Standard white pillow", shape: "cushion", type: "horizontal", size: [0.50, 0.12, 0.35], materialId: "melamine_white" },
      { id: "pillow_blue", label: "Pillow (Blue)", icon: "🛏️", description: "Blue accent pillow", shape: "cushion", type: "horizontal", size: [0.50, 0.12, 0.35], materialId: "fabric_blue" },
      { id: "pillow_long", label: "Long Pillow", icon: "🛏️", description: "Body pillow", shape: "cushion", type: "horizontal", size: [0.80, 0.12, 0.30], materialId: "melamine_white" },
      { id: "rug_rectangle", label: "Rectangle Rug", icon: "🟫", description: "Rectangular area rug", shape: "box", type: "horizontal", size: [2.00, 0.01, 1.40], materialId: "fabric_gray" },
      { id: "rug_round", label: "Round Rug", icon: "⭕", description: "Round area rug", shape: "cylinder", type: "horizontal", size: [1.50, 0.01, 1.50], materialId: "fabric_gray" },
      { id: "rug_square", label: "Square Rug", icon: "🟫", description: "Square area rug", shape: "box", type: "horizontal", size: [1.60, 0.01, 1.60], materialId: "fabric_gray" },
      { id: "rug_doormat", label: "Doormat", icon: "🟫", description: "Small entry mat", shape: "box", type: "horizontal", size: [0.60, 0.01, 0.40], materialId: "fabric_gray" },
    ],
  },

  // ─────────────────────────────────────────────────
  // 15. PLANTS & GREENERY
  // ─────────────────────────────────────────────────
  {
    label: "Plants & Greenery",
    icon: "🌿",
    items: [
      { id: "plant_small_1", label: "Small Plant 1", icon: "🌱", description: "Succulent in pot", shape: "sphere", type: "vertical", size: [0.10, 0.15, 0.10], materialId: "fabric_green" },
      { id: "plant_small_2", label: "Small Plant 2", icon: "🌱", description: "Small leafy plant", shape: "sphere", type: "vertical", size: [0.12, 0.18, 0.12], materialId: "fabric_green" },
      { id: "plant_small_3", label: "Small Plant 3", icon: "🌱", description: "Herb pot", shape: "sphere", type: "vertical", size: [0.08, 0.20, 0.08], materialId: "fabric_green" },
      { id: "potted_plant", label: "Potted Plant", icon: "🪴", description: "Medium floor plant", shape: "sphere", type: "vertical", size: [0.30, 0.60, 0.30], materialId: "fabric_green" },
      { id: "bear_plush", label: "Teddy Bear", icon: "🧸", description: "Plush teddy bear", shape: "sphere", type: "vertical", size: [0.20, 0.25, 0.15], materialId: "leather_tan" },
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
  onClose: () => void;
}

export function AddPartPicker({ onAdd, onClose }: AddPartPickerProps) {
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
                        onAdd({
                          shape: item.shape,
                          type: item.type,
                          label: item.label,
                          size: item.size,
                          materialId: item.materialId,
                          shapeParams: item.shapeParams,
                          placeOnSelected: item.placeOnSelected,
                        });
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
