// ─── Furniture Design Flow Data ─────────────────────────

export interface SpaceOption {
  id: string;
  label: string;
  icon: string;
  gradient: string;
}

export interface FurnitureOption {
  id: string;
  label: string;
  icon: string;
  defaultDims: { w: number; h: number; d: number }; // mm
}

// ── Space Categories ────────────────────────────────────

export const HOME_ROOMS: SpaceOption[] = [
  { id: "living_room", label: "Living Room", icon: "🛋️", gradient: "from-amber-50 to-orange-50" },
  { id: "kitchen", label: "Kitchen", icon: "🍳", gradient: "from-emerald-50 to-teal-50" },
  { id: "bedroom", label: "Bedroom", icon: "🛏️", gradient: "from-indigo-50 to-purple-50" },
  { id: "bathroom", label: "Bathroom", icon: "🚿", gradient: "from-cyan-50 to-sky-50" },
  { id: "kids_room", label: "Kids Room", icon: "🧸", gradient: "from-pink-50 to-rose-50" },
  { id: "office", label: "Office", icon: "💻", gradient: "from-slate-50 to-gray-100" },
  { id: "workshop", label: "Workshop", icon: "🔨", gradient: "from-yellow-50 to-amber-50" },
  { id: "balcony", label: "Balcony / Patio", icon: "🌿", gradient: "from-green-50 to-emerald-50" },
];

export const COMMERCIAL_SPACES: SpaceOption[] = [
  { id: "retail", label: "Retail / Shop", icon: "🛍️", gradient: "from-violet-50 to-purple-50" },
  { id: "coworking", label: "Office / Co-working", icon: "🏢", gradient: "from-blue-50 to-indigo-50" },
  { id: "restaurant", label: "Restaurant / Café", icon: "☕", gradient: "from-orange-50 to-amber-50" },
  { id: "clinic", label: "Clinic / Medical", icon: "🏥", gradient: "from-teal-50 to-cyan-50" },
  { id: "hotel", label: "Hotel / Lobby", icon: "🏨", gradient: "from-amber-50 to-yellow-50" },
  { id: "salon", label: "Studio / Salon", icon: "💇", gradient: "from-pink-50 to-fuchsia-50" },
  { id: "conference", label: "Conference / Events", icon: "🎤", gradient: "from-gray-50 to-slate-100" },
];

// ── Furniture Types per Space ───────────────────────────

export const FURNITURE_BY_SPACE: Record<string, FurnitureOption[]> = {
  // Home
  living_room: [
    { id: "sofa", label: "Sofa", icon: "🛋️", defaultDims: { w: 2000, h: 850, d: 900 } },
    { id: "armchair", label: "Armchair", icon: "💺", defaultDims: { w: 800, h: 850, d: 800 } },
    { id: "coffee_table", label: "Coffee Table", icon: "☕", defaultDims: { w: 1200, h: 450, d: 600 } },
    { id: "tv_unit", label: "TV Unit", icon: "📺", defaultDims: { w: 1800, h: 500, d: 400 } },
    { id: "bookshelf", label: "Bookshelf", icon: "📚", defaultDims: { w: 800, h: 1800, d: 300 } },
    { id: "side_table", label: "Side Table", icon: "🪑", defaultDims: { w: 500, h: 550, d: 500 } },
    { id: "display_cabinet", label: "Display Cabinet", icon: "🗄️", defaultDims: { w: 900, h: 1600, d: 400 } },
  ],
  kitchen: [
    { id: "dining_table", label: "Dining Table", icon: "🍽️", defaultDims: { w: 1600, h: 750, d: 900 } },
    { id: "dining_chair", label: "Dining Chairs", icon: "🪑", defaultDims: { w: 450, h: 900, d: 500 } },
    { id: "kitchen_island", label: "Kitchen Island", icon: "🏝️", defaultDims: { w: 1400, h: 900, d: 700 } },
    { id: "bar_stool", label: "Bar Stools", icon: "🍸", defaultDims: { w: 400, h: 750, d: 400 } },
    { id: "pantry_cabinet", label: "Pantry Cabinet", icon: "🗄️", defaultDims: { w: 800, h: 2000, d: 600 } },
  ],
  bedroom: [
    { id: "bed", label: "Bed", icon: "🛏️", defaultDims: { w: 1600, h: 1100, d: 2100 } },
    { id: "nightstand", label: "Nightstand", icon: "🛏️", defaultDims: { w: 500, h: 550, d: 400 } },
    { id: "dresser", label: "Dresser", icon: "🗄️", defaultDims: { w: 1200, h: 800, d: 500 } },
    { id: "wardrobe", label: "Wardrobe", icon: "👔", defaultDims: { w: 1800, h: 2200, d: 600 } },
    { id: "vanity_table", label: "Vanity Table", icon: "💄", defaultDims: { w: 1000, h: 750, d: 450 } },
    { id: "bench", label: "Bench", icon: "🪑", defaultDims: { w: 1200, h: 450, d: 400 } },
  ],
  bathroom: [
    { id: "vanity_cabinet", label: "Vanity Cabinet", icon: "🚿", defaultDims: { w: 900, h: 850, d: 500 } },
    { id: "storage_shelf", label: "Storage Shelf", icon: "📦", defaultDims: { w: 600, h: 1800, d: 300 } },
    { id: "mirror_cabinet", label: "Mirror Cabinet", icon: "🪞", defaultDims: { w: 700, h: 800, d: 150 } },
    { id: "laundry_hamper", label: "Laundry Hamper", icon: "🧺", defaultDims: { w: 450, h: 600, d: 350 } },
  ],
  kids_room: [
    { id: "kids_bed", label: "Kids Bed", icon: "🛏️", defaultDims: { w: 1000, h: 800, d: 1900 } },
    { id: "bunk_bed", label: "Bunk Bed", icon: "🛏️", defaultDims: { w: 1000, h: 1700, d: 2000 } },
    { id: "study_desk", label: "Study Desk", icon: "📝", defaultDims: { w: 1000, h: 750, d: 600 } },
    { id: "toy_storage", label: "Toy Storage", icon: "🧸", defaultDims: { w: 800, h: 1000, d: 400 } },
    { id: "kids_bookshelf", label: "Bookshelf", icon: "📚", defaultDims: { w: 600, h: 1200, d: 300 } },
  ],
  office: [
    { id: "desk", label: "Desk", icon: "🖥️", defaultDims: { w: 1400, h: 750, d: 700 } },
    { id: "office_chair", label: "Office Chair", icon: "💺", defaultDims: { w: 650, h: 1100, d: 650 } },
    { id: "filing_cabinet", label: "Filing Cabinet", icon: "🗄️", defaultDims: { w: 400, h: 1300, d: 600 } },
    { id: "office_bookshelf", label: "Bookshelf", icon: "📚", defaultDims: { w: 800, h: 1800, d: 300 } },
    { id: "standing_desk", label: "Standing Desk", icon: "🧍", defaultDims: { w: 1200, h: 1100, d: 600 } },
  ],
  workshop: [
    { id: "workbench", label: "Workbench", icon: "🔧", defaultDims: { w: 1800, h: 900, d: 700 } },
    { id: "tool_cabinet", label: "Tool Cabinet", icon: "🧰", defaultDims: { w: 900, h: 1800, d: 500 } },
    { id: "storage_rack", label: "Storage Rack", icon: "📦", defaultDims: { w: 1200, h: 2000, d: 500 } },
  ],
  balcony: [
    { id: "outdoor_table", label: "Outdoor Table", icon: "🪑", defaultDims: { w: 1000, h: 750, d: 1000 } },
    { id: "outdoor_chair", label: "Outdoor Chairs", icon: "🪑", defaultDims: { w: 550, h: 850, d: 600 } },
    { id: "lounge_chair", label: "Lounge Chair", icon: "🏖️", defaultDims: { w: 700, h: 800, d: 1600 } },
    { id: "plant_stand", label: "Plant Stand", icon: "🌱", defaultDims: { w: 400, h: 900, d: 400 } },
    { id: "storage_bench", label: "Storage Bench", icon: "📦", defaultDims: { w: 1200, h: 450, d: 450 } },
  ],
  // Commercial
  retail: [
    { id: "display_shelf", label: "Display Shelf", icon: "🛍️", defaultDims: { w: 1200, h: 1800, d: 400 } },
    { id: "checkout_counter", label: "Checkout Counter", icon: "💰", defaultDims: { w: 1500, h: 1000, d: 600 } },
    { id: "product_table", label: "Product Table", icon: "🛒", defaultDims: { w: 1200, h: 800, d: 700 } },
    { id: "clothing_rack", label: "Clothing Rack", icon: "👗", defaultDims: { w: 1200, h: 1700, d: 500 } },
  ],
  coworking: [
    { id: "office_desk_c", label: "Office Desk", icon: "🖥️", defaultDims: { w: 1400, h: 750, d: 700 } },
    { id: "meeting_table", label: "Meeting Table", icon: "🤝", defaultDims: { w: 2400, h: 750, d: 1200 } },
    { id: "reception_desk", label: "Reception Desk", icon: "🛎️", defaultDims: { w: 1800, h: 1100, d: 700 } },
  ],
  restaurant: [
    { id: "cafe_table", label: "Dining Table", icon: "🍽️", defaultDims: { w: 800, h: 750, d: 800 } },
    { id: "cafe_chair", label: "Chairs", icon: "🪑", defaultDims: { w: 450, h: 850, d: 500 } },
    { id: "bar_counter", label: "Bar Counter", icon: "🍺", defaultDims: { w: 2400, h: 1100, d: 600 } },
    { id: "booth_seating", label: "Booth Seating", icon: "🛋️", defaultDims: { w: 1400, h: 1200, d: 600 } },
  ],
  clinic: [
    { id: "reception_clinic", label: "Reception Desk", icon: "🛎️", defaultDims: { w: 1800, h: 1100, d: 700 } },
    { id: "waiting_chair", label: "Waiting Chair", icon: "🪑", defaultDims: { w: 550, h: 800, d: 550 } },
    { id: "medical_cabinet", label: "Medical Cabinet", icon: "🏥", defaultDims: { w: 800, h: 1800, d: 450 } },
  ],
  hotel: [
    { id: "lobby_sofa", label: "Lobby Sofa", icon: "🛋️", defaultDims: { w: 2200, h: 800, d: 900 } },
    { id: "reception_hotel", label: "Reception Desk", icon: "🛎️", defaultDims: { w: 2400, h: 1100, d: 700 } },
    { id: "console_table", label: "Console Table", icon: "🪑", defaultDims: { w: 1200, h: 800, d: 350 } },
  ],
  salon: [
    { id: "styling_station", label: "Styling Station", icon: "💇", defaultDims: { w: 1000, h: 2000, d: 500 } },
    { id: "salon_chair", label: "Salon Chair", icon: "💺", defaultDims: { w: 600, h: 1000, d: 600 } },
    { id: "reception_salon", label: "Reception Desk", icon: "🛎️", defaultDims: { w: 1500, h: 1100, d: 600 } },
  ],
  conference: [
    { id: "conference_table", label: "Conference Table", icon: "🤝", defaultDims: { w: 3000, h: 750, d: 1200 } },
    { id: "podium", label: "Podium", icon: "🎤", defaultDims: { w: 700, h: 1200, d: 500 } },
    { id: "credenza", label: "Credenza", icon: "🗄️", defaultDims: { w: 1800, h: 800, d: 450 } },
  ],
};

// ── Materials ───────────────────────────────────────────

export interface MaterialOption {
  id: string;
  label: string;
  color: string;
  category: string;
  roughness?: number;
  metalness?: number;
}

export const MATERIALS: MaterialOption[] = [
  // Wood
  { id: "oak", label: "Oak", color: "#C4A265", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "walnut", label: "Walnut", color: "#5C4033", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "pine", label: "Pine", color: "#DEB887", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "maple", label: "Maple", color: "#E8D5B7", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "cherry", label: "Cherry", color: "#9B4722", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "birch", label: "Birch", color: "#F5E6CC", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "teak", label: "Teak", color: "#8B6914", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "mahogany", label: "Mahogany", color: "#6B3A2A", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "ash", label: "Ash", color: "#D6C6A5", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "bamboo", label: "Bamboo", color: "#C9B76C", category: "Wood", roughness: 0.8, metalness: 0.0 },
  { id: "ebony", label: "Ebony", color: "#3C2415", category: "Wood", roughness: 0.8, metalness: 0.0 },
  // Engineered
  { id: "mdf", label: "MDF", color: "#C8B89A", category: "Engineered", roughness: 0.7, metalness: 0.0 },
  { id: "plywood", label: "Plywood", color: "#D4B896", category: "Engineered", roughness: 0.75, metalness: 0.0 },
  { id: "melamine_white", label: "White Melamine", color: "#F5F5F5", category: "Engineered", roughness: 0.4, metalness: 0.05 },
  { id: "melamine_black", label: "Black Melamine", color: "#2C2C2C", category: "Engineered", roughness: 0.4, metalness: 0.05 },
  { id: "melamine_gray", label: "Gray Melamine", color: "#9E9E9E", category: "Engineered", roughness: 0.4, metalness: 0.05 },
  { id: "melamine_cream", label: "Cream Melamine", color: "#F5F0E1", category: "Engineered", roughness: 0.4, metalness: 0.05 },
  { id: "laminate_walnut", label: "Walnut Laminate", color: "#6B4C3B", category: "Engineered", roughness: 0.5, metalness: 0.0 },
  { id: "laminate_oak", label: "Oak Laminate", color: "#C9A96E", category: "Engineered", roughness: 0.5, metalness: 0.0 },
  // Metal
  { id: "steel", label: "Steel", color: "#71797E", category: "Metal", roughness: 0.2, metalness: 0.9 },
  { id: "brass", label: "Brass", color: "#B5A642", category: "Metal", roughness: 0.25, metalness: 0.9 },
  { id: "black_metal", label: "Black Metal", color: "#1C1C1C", category: "Metal", roughness: 0.3, metalness: 0.85 },
  { id: "chrome", label: "Chrome", color: "#C0C0C0", category: "Metal", roughness: 0.1, metalness: 0.95 },
  { id: "gold", label: "Gold", color: "#D4AF37", category: "Metal", roughness: 0.2, metalness: 0.9 },
  { id: "copper", label: "Copper", color: "#B87333", category: "Metal", roughness: 0.25, metalness: 0.9 },
  { id: "bronze", label: "Bronze", color: "#8C7853", category: "Metal", roughness: 0.3, metalness: 0.85 },
  { id: "rose_gold", label: "Rose Gold", color: "#B76E79", category: "Metal", roughness: 0.2, metalness: 0.9 },
  // Stone & Ceramic
  { id: "marble_white", label: "White Marble", color: "#F0EDE8", category: "Stone", roughness: 0.6, metalness: 0.1 },
  { id: "marble_black", label: "Black Marble", color: "#2D2D2D", category: "Stone", roughness: 0.6, metalness: 0.1 },
  { id: "granite", label: "Granite", color: "#808080", category: "Stone", roughness: 0.65, metalness: 0.1 },
  { id: "terrazzo", label: "Terrazzo", color: "#E8DDD0", category: "Stone", roughness: 0.6, metalness: 0.1 },
  { id: "concrete", label: "Concrete", color: "#B0B0B0", category: "Stone", roughness: 0.75, metalness: 0.05 },
  { id: "ceramic_white", label: "White Ceramic", color: "#FAFAFA", category: "Stone", roughness: 0.5, metalness: 0.1 },
  // Fabric & Leather
  { id: "leather_brown", label: "Brown Leather", color: "#8B5E3C", category: "Fabric", roughness: 0.85, metalness: 0.0 },
  { id: "leather_black", label: "Black Leather", color: "#1A1A1A", category: "Fabric", roughness: 0.85, metalness: 0.0 },
  { id: "leather_tan", label: "Tan Leather", color: "#C19A6B", category: "Fabric", roughness: 0.85, metalness: 0.0 },
  { id: "fabric_gray", label: "Gray Fabric", color: "#9B9B9B", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "fabric_cream", label: "Cream Fabric", color: "#F5E6D3", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "fabric_beige", label: "Beige Fabric", color: "#D4C4A8", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "fabric_ivory", label: "Ivory Fabric", color: "#FFFFF0", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "fabric_taupe", label: "Taupe Fabric", color: "#B8A99A", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "fabric_charcoal", label: "Charcoal Fabric", color: "#4A4A4A", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "fabric_brown", label: "Brown Fabric", color: "#8B7355", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "fabric_blue", label: "Blue Fabric", color: "#4A6FA5", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "fabric_green", label: "Green Fabric", color: "#5B7B5E", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "velvet_navy", label: "Navy Velvet", color: "#1B3A5C", category: "Fabric", roughness: 0.95, metalness: 0.0 },
  // Glass & Acrylic
  { id: "glass", label: "Clear Glass", color: "#E0F0FF", category: "Glass", roughness: 0.1, metalness: 0.1 },
  { id: "frosted_glass", label: "Frosted Glass", color: "#E8EEF2", category: "Glass", roughness: 0.4, metalness: 0.1 },
  { id: "tinted_glass", label: "Tinted Glass", color: "#A8C4D8", category: "Glass", roughness: 0.1, metalness: 0.1 },
  { id: "mirror", label: "Mirror", color: "#D8E8F0", category: "Glass", roughness: 0.05, metalness: 0.9 },
  { id: "acrylic_clear", label: "Clear Acrylic", color: "#F0F8FF", category: "Glass", roughness: 0.15, metalness: 0.05 },
  { id: "acrylic_black", label: "Black Acrylic", color: "#0D0D0D", category: "Glass", roughness: 0.15, metalness: 0.05 },
];

export const STYLES = [
  "Modern", "Classic", "Industrial", "Minimalist", "Scandinavian", "Rustic",
  "Mid-Century", "Art Deco", "Japandi", "Farmhouse",
];

// ── Default Templates ───────────────────────────────────

export type PanelShape =
  // Basic
  | "box" | "cylinder" | "sphere" | "cone"
  // Panel shapes
  | "rounded_rect" | "circle_panel" | "oval" | "triangle" | "trapezoid"
  | "l_shape" | "u_shape" | "arc" | "hexagon"
  // 3D solids
  | "half_sphere" | "torus" | "pyramid" | "wedge" | "tube"
  // Legs & feet
  | "tapered_leg" | "cabriole_leg" | "hairpin_leg" | "x_base" | "pedestal" | "square_leg"
  | "bun_foot" | "bracket_foot" | "plinth"
  // Handles
  | "bar_handle" | "knob" | "cup_pull" | "ring_pull"
  // Doors & drawers
  | "shaker_door" | "glass_insert_door" | "louvered_door"
  | "drawer_box" | "open_tray"
  // Molding & trim
  | "crown_molding" | "base_molding" | "edge_trim"
  // Structural
  | "cross_brace" | "l_bracket" | "rail" | "rod" | "caster"
  // Decorative
  | "cushion" | "mattress" | "books" | "vase" | "basket" | "picture_frame" | "lamp_shade";

export interface PanelData {
  id: string;
  type: "vertical" | "horizontal" | "back";
  shape?: PanelShape; // default "box"
  shapeParams?: Record<string, number>; // e.g. cornerRadius, sides, arcAngle
  position: [number, number, number]; // x, y, z in meters
  rotation?: [number, number, number]; // x, y, z in radians (default [0,0,0])
  size: [number, number, number]; // box: [w,h,d] | cylinder/cone: [diameter,height,diameter] | sphere: [diameter,diameter,diameter]
  materialId: string;
  label: string;
  customColor?: string; // If set, overrides material color
  /** SH3D texture URL — when set, loaded as color map on MeshStandardMaterial */
  textureUrl?: string;
  /** Corner radius in meters for RoundedBox shapes (default 0.002 for wood, 0.02 for cushions) */
  cornerRadius?: number;
}

export interface FurnitureTemplate {
  panels: PanelData[];
}

export interface GroupData {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  panels: PanelData[];
  /** When set, render the original GLB model instead of box panels */
  glbUrl?: string;
  /** Scale multiplier for GLB models (default [1,1,1]) */
  scale?: [number, number, number];
}

/** Snapshot shape for undo/redo and persistence */
export interface EditorSceneData {
  groups: GroupData[];
  ungroupedPanels: PanelData[];
}

let panelCounter = 1000;

/** Box panel helper */
function panel(
  type: PanelData["type"],
  label: string,
  pos: [number, number, number],
  size: [number, number, number],
  mat = "oak"
): PanelData {
  return { id: `p${++panelCounter}`, type, label, position: pos, size, materialId: mat };
}

/** Cylinder panel helper — size is [diameter, height, diameter] */
function cyl(
  label: string,
  pos: [number, number, number],
  diameter: number,
  height: number,
  mat = "black_metal"
): PanelData {
  return {
    id: `p${++panelCounter}`,
    type: "vertical",
    shape: "cylinder",
    label,
    position: pos,
    size: [diameter, height, diameter],
    materialId: mat,
  };
}

/** Cushion-shaped panel (rounded corners) */
function cushion(
  label: string,
  pos: [number, number, number],
  size: [number, number, number],
  mat = "fabric_cream"
): PanelData {
  return {
    id: `p${++panelCounter}`,
    type: "horizontal",
    shape: "cushion",
    label,
    position: pos,
    size,
    materialId: mat,
  };
}

// Helper: 4 cylindrical legs inset from corners
function fourLegs(w: number, h: number, d: number, legH: number, dia = 0.05, inset = 0.05, mat = "black_metal"): PanelData[] {
  const y = legH / 2;
  return [
    cyl("Leg FL", [-w / 2 + inset, y, -d / 2 + inset], dia, legH, mat),
    cyl("Leg FR", [w / 2 - inset, y, -d / 2 + inset], dia, legH, mat),
    cyl("Leg BL", [-w / 2 + inset, y, d / 2 - inset], dia, legH, mat),
    cyl("Leg BR", [w / 2 - inset, y, d / 2 - inset], dia, legH, mat),
  ];
}

export function getDefaultTemplate(furnitureId: string, dims: { w: number; h: number; d: number }): FurnitureTemplate {
  const w = dims.w / 1000;
  const h = dims.h / 1000;
  const d = dims.d / 1000;
  const t = 0.016; // 16mm standard panel thickness
  const tb = 0.005; // 5mm back panel (HDF)

  // Never reset — each template call gets unique IDs so React/R3F
  // properly unmounts old meshes and mounts new ones

  switch (furnitureId) {
    // ── TABLES ─────────────────────────────────────────
    case "dining_table":
    case "cafe_table":
    case "outdoor_table":
    case "meeting_table":
    case "conference_table":
    case "product_table": {
      // Top panel + 4 cylindrical legs + stretcher rails
      const topT = 0.030; // 30mm thick top
      const legH = h - topT;
      return {
        panels: [
          panel("horizontal", "Tabletop", [0, h - topT / 2, 0], [w, topT, d]),
          ...fourLegs(w, h, d, legH, 0.05, 0.06),
          // Side stretcher rails
          panel("horizontal", "Front Rail", [0, 0.12, -d / 2 + 0.06], [w - 0.18, 0.04, 0.03], "black_metal"),
          panel("horizontal", "Back Rail", [0, 0.12, d / 2 - 0.06], [w - 0.18, 0.04, 0.03], "black_metal"),
        ],
      };
    }

    case "coffee_table": {
      // Lower table with thick top + 4 short legs
      const topT = 0.025;
      const legH = h - topT;
      return {
        panels: [
          panel("horizontal", "Tabletop", [0, h - topT / 2, 0], [w, topT, d]),
          ...fourLegs(w, h, d, legH, 0.045, 0.05),
          // Lower shelf
          panel("horizontal", "Lower Shelf", [0, h * 0.25, 0], [w - 0.14, t, d - 0.14]),
        ],
      };
    }

    // ── CHAIRS ─────────────────────────────────────────
    case "dining_chair":
    case "cafe_chair":
    case "waiting_chair":
    case "outdoor_chair": {
      // 4 legs + seat + back — seat at 450mm (standard dining chair)
      const seatH = Math.min(0.45, h * 0.5); // 450mm standard seat height
      const seatT = 0.022; // 22mm solid seat
      const legDia = 0.032;
      const backH = h - seatH;
      return {
        panels: [
          // Seat
          panel("horizontal", "Seat", [0, seatH, 0], [w, seatT, d]),
          // 4 legs under seat
          cyl("Front Left Leg", [-w / 2 + 0.04, seatH / 2, -d / 2 + 0.04], legDia, seatH, "black_metal"),
          cyl("Front Right Leg", [w / 2 - 0.04, seatH / 2, -d / 2 + 0.04], legDia, seatH, "black_metal"),
          cyl("Back Left Leg", [-w / 2 + 0.04, seatH / 2, d / 2 - 0.04], legDia, seatH, "black_metal"),
          cyl("Back Right Leg", [w / 2 - 0.04, seatH / 2, d / 2 - 0.04], legDia, seatH, "black_metal"),
          // Backrest
          panel("vertical", "Backrest", [0, seatH + backH / 2, d / 2 - 0.02], [w - 0.06, backH - 0.05, 0.02]),
          // Back support posts (extend legs upward)
          cyl("Back Left Post", [-w / 2 + 0.04, seatH + backH / 2, d / 2 - 0.04], legDia, backH, "black_metal"),
          cyl("Back Right Post", [w / 2 - 0.04, seatH + backH / 2, d / 2 - 0.04], legDia, backH, "black_metal"),
        ],
      };
    }

    case "office_chair":
    case "salon_chair": {
      // Seat + back + pedestal base — seat at 420-500mm (adjustable)
      const seatH = Math.min(0.48, h * 0.45); // ~480mm
      const seatT = 0.04;
      return {
        panels: [
          panel("horizontal", "Seat", [0, seatH, 0], [w, seatT, d]),
          panel("vertical", "Backrest", [0, seatH + (h - seatH) / 2, d / 2 - 0.03], [w * 0.85, h - seatH - 0.05, 0.03]),
          // Central pedestal
          cyl("Pedestal", [0, seatH / 2, 0], 0.06, seatH - 0.02, "black_metal"),
          // Star base (5 legs approximated as a flat disc)
          cyl("Base", [0, 0.015, 0], 0.5, 0.03, "black_metal"),
        ],
      };
    }

    case "bar_stool": {
      const seatH = h * 0.85;
      const seatT = 0.03;
      return {
        panels: [
          panel("horizontal", "Seat", [0, seatH, 0], [w, seatT, d]),
          cyl("Pedestal", [0, seatH / 2, 0], 0.05, seatH, "black_metal"),
          cyl("Base", [0, 0.015, 0], 0.4, 0.03, "black_metal"),
          // Footrest ring
          cyl("Footrest", [0, seatH * 0.35, 0], 0.35, 0.025, "black_metal"),
        ],
      };
    }

    // ── SOFAS ──────────────────────────────────────────
    case "sofa":
    case "lobby_sofa":
    case "booth_seating": {
      // Sofa with upholstered look: everything fabric-wrapped, no plywood visible
      const legH = 0.06;
      const baseH = 0.20; // upholstered base (fabric, not plywood)
      const cushionH = 0.12; // seat cushion on top of base
      const armW = 0.16;
      const armH = h - legH; // arms go full height from legs to top
      const backT = 0.18; // thick backrest
      const backH = h - legH - baseH; // backrest from base top to furniture top
      const fab = "fabric_cream";
      const innerW = w - armW * 2;
      const seatD = d - backT;
      const seatTopY = legH + baseH + cushionH;
      const gap = 0.01;

      const nCush = w > 1.2 ? (w > 2.0 ? 3 : 2) : 1;
      const cushW = (innerW - gap * (nCush - 1)) / nCush;

      const panels_: PanelData[] = [
        // Upholstered base — fabric color, completely covers the frame
        cushion("Base", [0, legH + baseH / 2, 0], [w, baseH, d], fab),
        // Full-height backrest — fabric, flush with back edge, full width
        cushion("Backrest", [0, legH + baseH + backH / 2, d / 2 - backT / 2], [w, backH, backT], fab),
        // Left arm — single piece, full height, full depth
        cushion("Left Arm", [-w / 2 + armW / 2, legH + armH / 2, 0], [armW, armH, d], fab),
        // Right arm
        cushion("Right Arm", [w / 2 - armW / 2, legH + armH / 2, 0], [armW, armH, d], fab),
      ];

      // Individual seat cushions on top of the base
      for (let i = 0; i < nCush; i++) {
        const x = -innerW / 2 + cushW / 2 + i * (cushW + gap);
        panels_.push(
          cushion(`Seat ${i + 1}`, [x, legH + baseH + cushionH / 2, -backT / 2], [cushW, cushionH, seatD], fab)
        );
      }

      // Legs
      panels_.push(
        cyl("Leg FL", [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], 0.035, legH, "black_metal"),
        cyl("Leg FR", [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], 0.035, legH, "black_metal"),
        cyl("Leg BL", [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], 0.035, legH, "black_metal"),
        cyl("Leg BR", [w / 2 - 0.08, legH / 2, d / 2 - 0.08], 0.035, legH, "black_metal"),
      );

      return { panels: panels_ };
    }

    case "armchair":
    case "lounge_chair": {
      // Armchair — same fabric-wrapped approach
      const legH = 0.05;
      const baseH = 0.18;
      const cushionH = 0.11;
      const armW = 0.14;
      const armH = h - legH;
      const backT = 0.16;
      const backH = h - legH - baseH;
      const fab = "fabric_cream";
      const innerW = w - armW * 2;
      const seatD = d - backT;
      const seatTopY = legH + baseH + cushionH;

      return {
        panels: [
          // Upholstered base
          cushion("Base", [0, legH + baseH / 2, 0], [w, baseH, d], fab),
          // Backrest — full width including behind arms
          cushion("Backrest", [0, legH + baseH + backH / 2, d / 2 - backT / 2], [w, backH, backT], fab),
          // Arms
          cushion("Left Arm", [-w / 2 + armW / 2, legH + armH / 2, 0], [armW, armH, d], fab),
          cushion("Right Arm", [w / 2 - armW / 2, legH + armH / 2, 0], [armW, armH, d], fab),
          // Seat cushion
          cushion("Seat", [0, legH + baseH + cushionH / 2, -backT / 2], [innerW, cushionH, seatD], fab),
          // Legs
          cyl("Leg FL", [-w / 2 + 0.06, legH / 2, -d / 2 + 0.06], 0.03, legH, "black_metal"),
          cyl("Leg FR", [w / 2 - 0.06, legH / 2, -d / 2 + 0.06], 0.03, legH, "black_metal"),
          cyl("Leg BL", [-w / 2 + 0.06, legH / 2, d / 2 - 0.06], 0.03, legH, "black_metal"),
          cyl("Leg BR", [w / 2 - 0.06, legH / 2, d / 2 - 0.06], 0.03, legH, "black_metal"),
        ],
      };
    }

    // ── BOOKSHELVES ────────────────────────────────────
    case "bookshelf":
    case "kids_bookshelf":
    case "office_bookshelf":
    case "display_shelf":
    case "storage_shelf": {
      // 2 sides + 5 shelves + back panel — like a real bookshelf
      const innerW = w - t * 2;
      const shelfCount = 5;
      const panels_: PanelData[] = [
        panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
        panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
        panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
        panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
        panel("back", "Back Panel", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
      ];
      for (let i = 1; i < shelfCount; i++) {
        const y = (h / shelfCount) * i;
        panels_.push(panel("horizontal", `Shelf ${i}`, [0, y, 0], [innerW, t, d]));
      }
      return { panels: panels_ };
    }

    // ── WARDROBES ──────────────────────────────────────
    case "wardrobe": {
      // 2 sides + top + bottom + hanging rail area + shelf + back + 2 doors
      const innerW = w - t * 2;
      return {
        panels: [
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
          panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back Panel", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
          // Upper shelf (for stored items above hanging area)
          panel("horizontal", "Upper Shelf", [0, h * 0.78, 0], [innerW, t, d]),
          // Hanging rail (cylinder)
          // Hanging rail (horizontal bar — rendered as thin box for simplicity)
          panel("horizontal", "Hanging Rail", [0, h * 0.65, 0], [innerW, 0.025, 0.025], "steel"),
          // Lower shelf
          panel("horizontal", "Lower Shelf", [0, h * 0.15, 0], [innerW, t, d]),
          // Two doors (facade panels, slightly in front)
          panel("vertical", "Left Door", [-innerW / 4, h / 2, -d / 2 - 0.005], [innerW / 2 - 0.002, h - t * 2, t], "melamine_white"),
          panel("vertical", "Right Door", [innerW / 4, h / 2, -d / 2 - 0.005], [innerW / 2 - 0.002, h - t * 2, t], "melamine_white"),
        ],
      };
    }

    case "pantry_cabinet":
    case "tool_cabinet":
    case "medical_cabinet": {
      const innerW = w - t * 2;
      return {
        panels: [
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
          panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back Panel", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
          panel("horizontal", "Shelf 1", [0, h * 0.25, 0], [innerW, t, d]),
          panel("horizontal", "Shelf 2", [0, h * 0.50, 0], [innerW, t, d]),
          panel("horizontal", "Shelf 3", [0, h * 0.75, 0], [innerW, t, d]),
          panel("vertical", "Left Door", [-innerW / 4, h / 2, -d / 2 - 0.005], [innerW / 2 - 0.002, h - t * 2, t], "melamine_white"),
          panel("vertical", "Right Door", [innerW / 4, h / 2, -d / 2 - 0.005], [innerW / 2 - 0.002, h - t * 2, t], "melamine_white"),
        ],
      };
    }

    // ── DESKS ──────────────────────────────────────────
    case "desk":
    case "study_desk":
    case "office_desk_c": {
      // Top + 4 cylindrical legs + modesty panel under the desktop
      const topT = 0.025;
      const legH = h - topT;
      const modestyH = legH * 0.45; // sits in lower half, never exceeds tabletop
      return {
        panels: [
          panel("horizontal", "Desktop", [0, h - topT / 2, 0], [w, topT, d]),
          ...fourLegs(w, h, d, legH, 0.045, 0.05, "black_metal"),
          // Modesty panel (back, sits UNDER the desktop)
          panel("back", "Modesty Panel", [0, legH - modestyH / 2, d / 2 - 0.01], [w - 0.12, modestyH, t]),
          // Cable tray bar
          panel("horizontal", "Cable Tray", [0, h * 0.08, d / 2 - 0.08], [w * 0.5, 0.02, 0.1], "black_metal"),
        ],
      };
    }

    case "standing_desk": {
      const topT = 0.025;
      const legH = h - topT;
      return {
        panels: [
          panel("horizontal", "Desktop", [0, h - topT / 2, 0], [w, topT, d]),
          // Standing desk uses rectangular column legs
          panel("vertical", "Left Leg", [-w / 2 + 0.05, legH / 2, 0], [0.06, legH, 0.06], "black_metal"),
          panel("vertical", "Right Leg", [w / 2 - 0.05, legH / 2, 0], [0.06, legH, 0.06], "black_metal"),
          // Crossbar
          panel("horizontal", "Crossbar", [0, legH * 0.15, 0], [w - 0.14, 0.03, 0.04], "black_metal"),
        ],
      };
    }

    case "vanity_table": {
      const topT = 0.020;
      const legH = h - topT;
      const drawerH = 0.14; // drawer height — fits under tabletop
      const drawerW = 0.30;
      const drawerY = h - topT - drawerH / 2; // flush under the desktop
      return {
        panels: [
          panel("horizontal", "Top", [0, h - topT / 2, 0], [w, topT, d]),
          ...fourLegs(w, h, d, legH, 0.04, 0.05),
          // Drawer unit tucked under the desktop on the left side
          panel("vertical", "Drawer Left Wall", [-w / 2 + 0.05, drawerY, 0], [t, drawerH, d - 0.04]),
          panel("vertical", "Drawer Right Wall", [-w / 2 + 0.05 + drawerW, drawerY, 0], [t, drawerH, d - 0.04]),
          panel("horizontal", "Drawer Bottom", [-w / 2 + 0.05 + drawerW / 2, h - topT - drawerH, 0], [drawerW, t, d - 0.04]),
          panel("vertical", "Drawer Front", [-w / 2 + 0.05 + drawerW / 2, drawerY, -d / 2 + 0.01], [drawerW + 0.02, drawerH, t], "melamine_white"),
        ],
      };
    }

    // ── BEDS ───────────────────────────────────────────
    case "bed":
    case "kids_bed": {
      // Headboard + footboard + 2 side rails + slat base
      const railH = h * 0.3;
      const headH = h;
      const footH = h * 0.55;
      const slatH = 0.02;
      const slatY = railH;
      return {
        panels: [
          // Headboard
          panel("vertical", "Headboard", [0, headH / 2, d / 2 - t / 2], [w, headH, t]),
          // Footboard (shorter)
          panel("vertical", "Footboard", [0, footH / 2, -d / 2 + t / 2], [w, footH, t]),
          // Left rail
          panel("horizontal", "Left Rail", [-w / 2 + t / 2, railH, 0], [t, 0.15, d - t * 2]),
          // Right rail
          panel("horizontal", "Right Rail", [w / 2 - t / 2, railH, 0], [t, 0.15, d - t * 2]),
          // Slat base (series of horizontal slats)
          panel("horizontal", "Slat 1", [0, slatY, -d * 0.35], [w - t * 2, slatH, 0.08]),
          panel("horizontal", "Slat 2", [0, slatY, -d * 0.18], [w - t * 2, slatH, 0.08]),
          panel("horizontal", "Slat 3", [0, slatY, 0], [w - t * 2, slatH, 0.08]),
          panel("horizontal", "Slat 4", [0, slatY, d * 0.18], [w - t * 2, slatH, 0.08]),
          panel("horizontal", "Slat 5", [0, slatY, d * 0.35], [w - t * 2, slatH, 0.08]),
          // 4 short legs
          cyl("Leg FL", [-w / 2 + 0.05, railH / 2 - 0.05, -d / 2 + 0.05], 0.06, railH - 0.05),
          cyl("Leg FR", [w / 2 - 0.05, railH / 2 - 0.05, -d / 2 + 0.05], 0.06, railH - 0.05),
          cyl("Leg BL", [-w / 2 + 0.05, railH / 2 - 0.05, d / 2 - 0.05], 0.06, railH - 0.05),
          cyl("Leg BR", [w / 2 - 0.05, railH / 2 - 0.05, d / 2 - 0.05], 0.06, railH - 0.05),
        ],
      };
    }

    case "bunk_bed": {
      // Two bed levels with 4 tall posts
      const postW = 0.08;
      const lowerY = h * 0.18;
      const upperY = h * 0.58;
      return {
        panels: [
          // 4 corner posts
          panel("vertical", "Post FL", [-w / 2 + postW / 2, h / 2, -d / 2 + postW / 2], [postW, h, postW]),
          panel("vertical", "Post FR", [w / 2 - postW / 2, h / 2, -d / 2 + postW / 2], [postW, h, postW]),
          panel("vertical", "Post BL", [-w / 2 + postW / 2, h / 2, d / 2 - postW / 2], [postW, h, postW]),
          panel("vertical", "Post BR", [w / 2 - postW / 2, h / 2, d / 2 - postW / 2], [postW, h, postW]),
          // Lower bed platform
          panel("horizontal", "Lower Platform", [0, lowerY, 0], [w - postW * 2, t, d - postW * 2]),
          // Upper bed platform
          panel("horizontal", "Upper Platform", [0, upperY, 0], [w - postW * 2, t, d - postW * 2]),
          // Guard rails for upper bed
          panel("horizontal", "Guard Rail Front", [0, upperY + 0.2, -d / 2 + postW], [w - postW * 2, 0.03, 0.03]),
          panel("horizontal", "Guard Rail Back", [0, upperY + 0.2, d / 2 - postW], [w - postW * 2, 0.03, 0.03]),
          // Headboards
          panel("vertical", "Lower Headboard", [0, lowerY + 0.15, d / 2 - postW - 0.01], [w - postW * 2 - 0.02, 0.28, t]),
          panel("vertical", "Upper Headboard", [0, upperY + 0.15, d / 2 - postW - 0.01], [w - postW * 2 - 0.02, 0.28, t]),
        ],
      };
    }

    // ── NIGHTSTAND / SIDE TABLE ────────────────────────
    case "nightstand":
    case "side_table": {
      // Small cabinet with drawer + open shelf + legs
      const innerW = w - t * 2;
      const legH = 0.12;
      return {
        panels: [
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2 + legH / 2, 0], [t, h - legH, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2 + legH / 2, 0], [t, h - legH, d]),
          panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
          panel("horizontal", "Bottom", [0, legH + t / 2, 0], [innerW, t, d]),
          panel("back", "Back Panel", [0, h / 2 + legH / 2, d / 2 - tb / 2], [w, h - legH, tb]),
          // Shelf divider
          panel("horizontal", "Shelf", [0, h * 0.5, 0], [innerW, t, d]),
          // Drawer front (upper compartment)
          panel("vertical", "Drawer Front", [0, h * 0.75, -d / 2 - 0.003], [innerW - 0.004, h * 0.22, t], "melamine_white"),
          // 4 short legs
          cyl("Leg FL", [-w / 2 + 0.04, legH / 2, -d / 2 + 0.04], 0.03, legH, "black_metal"),
          cyl("Leg FR", [w / 2 - 0.04, legH / 2, -d / 2 + 0.04], 0.03, legH, "black_metal"),
          cyl("Leg BL", [-w / 2 + 0.04, legH / 2, d / 2 - 0.04], 0.03, legH, "black_metal"),
          cyl("Leg BR", [w / 2 - 0.04, legH / 2, d / 2 - 0.04], 0.03, legH, "black_metal"),
        ],
      };
    }

    // ── DRESSER / CREDENZA ─────────────────────────────
    case "dresser":
    case "credenza":
    case "console_table": {
      // Cabinet body with multiple drawer fronts
      const innerW = w - t * 2;
      const legH = 0.10;
      const bodyH = h - legH;
      const drawerCount = 3;
      const drawerH = (bodyH - t * (drawerCount + 1)) / drawerCount;
      const panels_: PanelData[] = [
        panel("vertical", "Left Side", [-w / 2 + t / 2, legH + bodyH / 2, 0], [t, bodyH, d]),
        panel("vertical", "Right Side", [w / 2 - t / 2, legH + bodyH / 2, 0], [t, bodyH, d]),
        panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
        panel("horizontal", "Bottom", [0, legH + t / 2, 0], [innerW, t, d]),
        panel("back", "Back Panel", [0, legH + bodyH / 2, d / 2 - tb / 2], [w, bodyH, tb]),
      ];
      // Drawer dividers and fronts
      for (let i = 1; i <= drawerCount; i++) {
        const divY = legH + t + (drawerH + t) * i - t / 2;
        if (i < drawerCount) {
          panels_.push(panel("horizontal", `Divider ${i}`, [0, divY, 0], [innerW, t, d]));
        }
        const frontY = legH + t + (drawerH + t) * (i - 1) + drawerH / 2 + t / 2;
        panels_.push(panel("vertical", `Drawer ${i}`, [0, frontY, -d / 2 - 0.003], [innerW - 0.004, drawerH - 0.004, t], "melamine_white"));
      }
      // Legs
      panels_.push(
        cyl("Leg FL", [-w / 2 + 0.05, legH / 2, -d / 2 + 0.05], 0.035, legH, "black_metal"),
        cyl("Leg FR", [w / 2 - 0.05, legH / 2, -d / 2 + 0.05], 0.035, legH, "black_metal"),
        cyl("Leg BL", [-w / 2 + 0.05, legH / 2, d / 2 - 0.05], 0.035, legH, "black_metal"),
        cyl("Leg BR", [w / 2 - 0.05, legH / 2, d / 2 - 0.05], 0.035, legH, "black_metal"),
      );
      return { panels: panels_ };
    }

    // ── TV UNIT ────────────────────────────────────────
    case "tv_unit": {
      // Long low cabinet with 2 compartments + doors
      const innerW = w - t * 2;
      return {
        panels: [
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
          panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back Panel", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
          // Center divider
          panel("vertical", "Center Divider", [0, h / 2, 0], [t, h - t * 2, d]),
          // Shelves in each compartment
          panel("horizontal", "Left Shelf", [-innerW / 4, h * 0.45, 0], [innerW / 2 - t, t, d]),
          panel("horizontal", "Right Shelf", [innerW / 4, h * 0.45, 0], [innerW / 2 - t, t, d]),
          // Two doors
          panel("vertical", "Left Door", [-innerW / 4, h / 2, -d / 2 - 0.003], [innerW / 2 - t - 0.004, h - t * 2 - 0.004, t], "melamine_white"),
          panel("vertical", "Right Door", [innerW / 4, h / 2, -d / 2 - 0.003], [innerW / 2 - t - 0.004, h - t * 2 - 0.004, t], "melamine_white"),
        ],
      };
    }

    // ── KITCHEN ISLAND / BAR / COUNTER ─────────────────
    case "kitchen_island":
    case "bar_counter": {
      const innerW = w - t * 2;
      const topT = 0.035; // thick countertop
      return {
        panels: [
          // Thick countertop
          panel("horizontal", "Countertop", [0, h - topT / 2, 0], [w + 0.04, topT, d + 0.02], "marble_white"),
          // Cabinet body
          panel("vertical", "Left Side", [-w / 2 + t / 2, (h - topT) / 2, 0], [t, h - topT, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, (h - topT) / 2, 0], [t, h - topT, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back Panel", [0, (h - topT) / 2, d / 2 - tb / 2], [w, h - topT, tb]),
          panel("vertical", "Divider", [0, (h - topT) / 2, 0], [t, h - topT - t * 2, d]),
          panel("horizontal", "Shelf L", [-innerW / 4, h * 0.35, 0], [innerW / 2 - t, t, d]),
          panel("horizontal", "Shelf R", [innerW / 4, h * 0.35, 0], [innerW / 2 - t, t, d]),
        ],
      };
    }

    // ── RECEPTION / CHECKOUT ───────────────────────────
    case "checkout_counter":
    case "reception_desk":
    case "reception_clinic":
    case "reception_hotel":
    case "reception_salon": {
      const topT = 0.030;
      const innerW = w - t * 2;
      const frontH = h * 0.7;
      return {
        panels: [
          // Top surface
          panel("horizontal", "Counter Top", [0, h - topT / 2, 0], [w, topT, d]),
          // Body
          panel("vertical", "Left Side", [-w / 2 + t / 2, (h - topT) / 2, 0], [t, h - topT, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, (h - topT) / 2, 0], [t, h - topT, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back", [0, (h - topT) / 2, d / 2 - tb / 2], [w, h - topT, tb]),
          // Front panel (taller privacy screen)
          panel("vertical", "Front Panel", [0, frontH / 2, -d / 2 + t / 2], [innerW, frontH, t]),
          // Shelf
          panel("horizontal", "Shelf", [0, h * 0.4, 0], [innerW, t, d]),
        ],
      };
    }

    // ── DISPLAY CABINET ────────────────────────────────
    case "display_cabinet":
    case "mirror_cabinet": {
      const innerW = w - t * 2;
      return {
        panels: [
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
          panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
          panel("horizontal", "Shelf 1", [0, h * 0.33, 0], [innerW, t, d]),
          panel("horizontal", "Shelf 2", [0, h * 0.66, 0], [innerW, t, d]),
          // Glass door
          panel("vertical", "Glass Door", [0, h / 2, -d / 2 - 0.003], [innerW - 0.004, h - t * 2 - 0.004, 0.006], "glass"),
        ],
      };
    }

    // ── VANITY CABINET (BATHROOM) ──────────────────────
    case "vanity_cabinet": {
      const innerW = w - t * 2;
      const topT = 0.025;
      return {
        panels: [
          // Countertop (marble/stone)
          panel("horizontal", "Countertop", [0, h - topT / 2, 0], [w, topT, d], "marble_white"),
          panel("vertical", "Left Side", [-w / 2 + t / 2, (h - topT) / 2, 0], [t, h - topT, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, (h - topT) / 2, 0], [t, h - topT, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back Panel", [0, (h - topT) / 2, d / 2 - tb / 2], [w, h - topT, tb]),
          // Shelf
          panel("horizontal", "Shelf", [0, h * 0.4, 0], [innerW, t, d]),
          // Two doors
          panel("vertical", "Left Door", [-innerW / 4, (h - topT) / 2, -d / 2 - 0.003], [innerW / 2 - 0.004, h - topT - t * 2, t], "melamine_white"),
          panel("vertical", "Right Door", [innerW / 4, (h - topT) / 2, -d / 2 - 0.003], [innerW / 2 - 0.004, h - topT - t * 2, t], "melamine_white"),
        ],
      };
    }

    // ── LAUNDRY HAMPER ─────────────────────────────────
    case "laundry_hamper": {
      return {
        panels: [
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Front", [0, h / 2, -d / 2 + t / 2], [w - t * 2, h, t]),
          panel("vertical", "Back", [0, h / 2, d / 2 - t / 2], [w - t * 2, h, t]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [w - t * 2, t, d - t * 2]),
          // Lid
          panel("horizontal", "Lid", [0, h + t / 2, 0], [w, t, d]),
        ],
      };
    }

    // ── FILING CABINET ─────────────────────────────────
    case "filing_cabinet": {
      const innerW = w - t * 2;
      const drawerCount = 4;
      const drawerH = (h - t * (drawerCount + 1)) / drawerCount;
      const panels_: PanelData[] = [
        panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
        panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
        panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
        panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
        panel("back", "Back Panel", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
      ];
      for (let i = 0; i < drawerCount; i++) {
        const frontY = t + (drawerH + t) * i + drawerH / 2;
        panels_.push(panel("vertical", `Drawer ${i + 1}`, [0, frontY, -d / 2 - 0.003], [innerW - 0.004, drawerH - 0.004, t], "melamine_white"));
        if (i < drawerCount - 1) {
          panels_.push(panel("horizontal", `Divider ${i + 1}`, [0, t + (drawerH + t) * (i + 1) - t / 2, 0], [innerW, t, d]));
        }
      }
      return { panels: panels_ };
    }

    // ── TOY STORAGE ────────────────────────────────────
    case "toy_storage": {
      const innerW = w - t * 2;
      return {
        panels: [
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
          panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
          // 2 shelves creating 3 cubby holes
          panel("horizontal", "Shelf 1", [0, h * 0.33, 0], [innerW, t, d]),
          panel("horizontal", "Shelf 2", [0, h * 0.66, 0], [innerW, t, d]),
          // Vertical divider on bottom row
          panel("vertical", "Divider", [0, h * 0.165, 0], [t, h * 0.33 - t, d]),
        ],
      };
    }

    // ── PLANT STAND ────────────────────────────────────
    case "plant_stand": {
      const topT = 0.020;
      const legH = h - topT;
      return {
        panels: [
          panel("horizontal", "Top Shelf", [0, h - topT / 2, 0], [w, topT, d]),
          ...fourLegs(w, h, d, legH, 0.03, 0.04, "black_metal"),
          // Middle shelf
          panel("horizontal", "Middle Shelf", [0, h * 0.5, 0], [w * 0.8, topT, d * 0.8]),
          // Cross braces
          panel("horizontal", "Front Brace", [0, h * 0.25, -d / 2 + 0.05], [w - 0.1, 0.02, 0.02], "black_metal"),
          panel("horizontal", "Back Brace", [0, h * 0.25, d / 2 - 0.05], [w - 0.1, 0.02, 0.02], "black_metal"),
        ],
      };
    }

    // ── STORAGE BENCH ──────────────────────────────────
    case "storage_bench":
    case "bench": {
      const seatT = 0.030;
      return {
        panels: [
          // Seat (lid)
          panel("horizontal", "Seat", [0, h - seatT / 2, 0], [w, seatT, d]),
          // Box body
          panel("vertical", "Left Side", [-w / 2 + t / 2, (h - seatT) / 2, 0], [t, h - seatT, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, (h - seatT) / 2, 0], [t, h - seatT, d]),
          panel("vertical", "Front", [0, (h - seatT) / 2, -d / 2 + t / 2], [w - t * 2, h - seatT, t]),
          panel("vertical", "Back", [0, (h - seatT) / 2, d / 2 - t / 2], [w - t * 2, h - seatT, t]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [w - t * 2, t, d - t * 2]),
        ],
      };
    }

    // ── WORKBENCH / RACK ───────────────────────────────
    case "workbench":
    case "storage_rack": {
      const topT = 0.035;
      const legH = h - topT;
      return {
        panels: [
          panel("horizontal", "Work Surface", [0, h - topT / 2, 0], [w, topT, d]),
          ...fourLegs(w, h, d, legH, 0.06, 0.05),
          // Lower shelf
          panel("horizontal", "Lower Shelf", [0, h * 0.15, 0], [w - 0.12, t, d - 0.06]),
          // Middle shelf
          panel("horizontal", "Middle Shelf", [0, h * 0.45, 0], [w - 0.12, t, d - 0.06]),
          // Back brace
          panel("back", "Back Brace", [0, h * 0.6, d / 2 - 0.03], [w - 0.12, 0.05, 0.03], "black_metal"),
        ],
      };
    }

    // ── CLOTHING RACK ──────────────────────────────────
    case "clothing_rack": {
      return {
        panels: [
          // Top rail (horizontal bar)
          panel("horizontal", "Top Rail", [0, h - 0.025, 0], [w - 0.08, 0.03, 0.03], "black_metal"),
          // 2 vertical side frames (A-frames approximated)
          panel("vertical", "Left Frame", [-w / 2 + 0.04, h / 2, 0], [0.04, h, 0.04], "black_metal"),
          panel("vertical", "Right Frame", [w / 2 - 0.04, h / 2, 0], [0.04, h, 0.04], "black_metal"),
          // Base feet
          panel("horizontal", "Left Base", [-w / 2 + 0.04, 0.015, 0], [0.04, 0.03, d], "black_metal"),
          panel("horizontal", "Right Base", [w / 2 - 0.04, 0.015, 0], [0.04, 0.03, d], "black_metal"),
          // Lower shelf
          panel("horizontal", "Shoe Shelf", [0, 0.12, 0], [w - 0.12, t, d - 0.04]),
        ],
      };
    }

    // ── STYLING STATION ────────────────────────────────
    case "styling_station": {
      const innerW = w - t * 2;
      const counterH = h * 0.45;
      return {
        panels: [
          // Counter/cabinet
          panel("vertical", "Left Side", [-w / 2 + t / 2, counterH / 2, 0], [t, counterH, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, counterH / 2, 0], [t, counterH, d]),
          panel("horizontal", "Counter", [0, counterH - t / 2, 0], [innerW, t, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back Lower", [0, counterH / 2, d / 2 - tb / 2], [w, counterH, tb]),
          // Mirror (tall back panel)
          panel("back", "Mirror", [0, counterH + (h - counterH) / 2, d / 2 - 0.01], [w * 0.85, h - counterH - 0.05, 0.008], "glass"),
          // Drawer
          panel("vertical", "Drawer", [0, counterH / 2, -d / 2 - 0.003], [innerW - 0.004, counterH - t * 2, t], "melamine_white"),
        ],
      };
    }

    // ── PODIUM ─────────────────────────────────────────
    case "podium": {
      return {
        panels: [
          // Slanted top surface
          panel("horizontal", "Top Surface", [0, h - 0.02, -0.05], [w, 0.03, d * 0.6]),
          panel("vertical", "Front Panel", [0, h / 2, -d / 2 + t / 2], [w, h, t]),
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [w - t * 2, t, d - t * 2]),
          panel("horizontal", "Shelf", [0, h * 0.5, 0], [w - t * 2, t, d - t * 2]),
          panel("back", "Back", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
        ],
      };
    }

    default: {
      // Generic cabinet — recognizable as a cabinet with door
      const innerW = w - t * 2;
      return {
        panels: [
          panel("vertical", "Left Side", [-w / 2 + t / 2, h / 2, 0], [t, h, d]),
          panel("vertical", "Right Side", [w / 2 - t / 2, h / 2, 0], [t, h, d]),
          panel("horizontal", "Top", [0, h - t / 2, 0], [innerW, t, d]),
          panel("horizontal", "Bottom", [0, t / 2, 0], [innerW, t, d]),
          panel("back", "Back Panel", [0, h / 2, d / 2 - tb / 2], [w, h, tb]),
          panel("horizontal", "Shelf", [0, h * 0.5, 0], [innerW, t, d]),
          panel("vertical", "Door", [0, h / 2, -d / 2 - 0.003], [innerW - 0.004, h - t * 2 - 0.004, t], "melamine_white"),
        ],
      };
    }
  }
}
