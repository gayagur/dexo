// ─── Kenney Furniture Kit Model Catalog ──────────────────
// CC0 (public domain) — https://kenney.nl/assets/furniture-kit

export interface KenneyModel {
  id: string;       // filename without .glb
  name: string;     // display name
  category: string; // category key
  room: string;     // room key for LibraryBrowser filtering
  path: string;     // URL path to GLB file
}

export const KENNEY_CATEGORIES = [
  { id: "seating", label: "Seating", icon: "🛋️" },
  { id: "tables", label: "Tables", icon: "🪑" },
  { id: "beds", label: "Beds", icon: "🛏️" },
  { id: "storage", label: "Storage & Shelves", icon: "🗄️" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "bathroom", label: "Bathroom", icon: "🚿" },
  { id: "lighting", label: "Lighting", icon: "💡" },
  { id: "decor", label: "Decor & Plants", icon: "🌿" },
  { id: "electronics", label: "Electronics", icon: "🖥️" },
  { id: "appliances", label: "Appliances", icon: "🧊" },
  { id: "structure", label: "Walls & Floors", icon: "🧱" },
] as const;

const BASE = "/models/kenney/";

function m(id: string, name: string, category: string, room: string): KenneyModel {
  return { id, name, category, room, path: `${BASE}${id}.glb` };
}

// IDs to skip — structural elements, not furniture
const SKIP_IDS = new Set([
  "wall", "wallCorner", "wallCornerRond", "wallDoorway", "wallDoorwayWide",
  "wallHalf", "wallWindow", "wallWindowSlide",
  "floorCorner", "floorCornerRound", "floorFull", "floorHalf",
  "doorway", "doorwayFront", "doorwayOpen",
  "stairs", "stairsCorner", "stairsOpen", "stairsOpenSingle",
  "paneling",
  "bear", "books",
  "cardboardBoxClosed", "cardboardBoxOpen",
]);

const ALL_KENNEY_MODELS: KenneyModel[] = [
  // ── Seating ────────────────────────────
  m("chair", "Chair", "seating", "dining"),
  m("chairCushion", "Chair with Cushion", "seating", "dining"),
  m("chairDesk", "Desk Chair", "seating", "office"),
  m("chairModernCushion", "Modern Cushion Chair", "seating", "living_room"),
  m("chairModernFrameCushion", "Modern Frame Chair", "seating", "living_room"),
  m("chairRounded", "Rounded Chair", "seating", "living_room"),
  m("loungeChair", "Lounge Chair", "seating", "living_room"),
  m("loungeChairRelax", "Relax Lounge Chair", "seating", "living_room"),
  m("loungeDesignChair", "Design Lounge Chair", "seating", "living_room"),
  m("loungeSofa", "Sofa", "seating", "living_room"),
  m("loungeSofaCorner", "Corner Sofa", "seating", "living_room"),
  m("loungeSofaLong", "Long Sofa", "seating", "living_room"),
  m("loungeSofaOttoman", "Ottoman", "seating", "living_room"),
  m("loungeDesignSofa", "Design Sofa", "seating", "living_room"),
  m("loungeDesignSofaCorner", "Design Corner Sofa", "seating", "living_room"),
  m("bench", "Bench", "seating", "outdoor"),
  m("benchCushion", "Bench with Cushion", "seating", "outdoor"),
  m("benchCushionLow", "Low Bench with Cushion", "seating", "living_room"),
  m("stoolBar", "Bar Stool", "seating", "kitchen"),
  m("stoolBarSquare", "Square Bar Stool", "seating", "kitchen"),

  // ── Tables ─────────────────────────────
  m("table", "Table", "tables", "dining"),
  m("tableCloth", "Table with Cloth", "tables", "dining"),
  m("tableCoffee", "Coffee Table", "tables", "living_room"),
  m("tableCoffeeSquare", "Square Coffee Table", "tables", "living_room"),
  m("tableCoffeeGlass", "Glass Coffee Table", "tables", "living_room"),
  m("tableCoffeeGlassSquare", "Square Glass Coffee Table", "tables", "living_room"),
  m("tableCross", "Cross Table", "tables", "dining"),
  m("tableCrossCloth", "Cross Table with Cloth", "tables", "dining"),
  m("tableGlass", "Glass Table", "tables", "living_room"),
  m("tableRound", "Round Table", "tables", "living_room"),
  m("desk", "Desk", "tables", "office"),
  m("deskCorner", "Corner Desk", "tables", "office"),
  m("sideTable", "Side Table", "tables", "living_room"),
  m("sideTableDrawers", "Side Table with Drawers", "tables", "living_room"),
  m("kitchenBar", "Kitchen Bar", "tables", "kitchen"),
  m("kitchenBarEnd", "Kitchen Bar End", "tables", "kitchen"),

  // ── Beds ───────────────────────────────
  m("bedSingle", "Single Bed", "beds", "bedroom"),
  m("bedDouble", "Double Bed", "beds", "bedroom"),
  m("bedBunk", "Bunk Bed", "beds", "kids"),
  m("cabinetBed", "Bed Cabinet", "beds", "bedroom"),
  m("cabinetBedDrawer", "Bed Cabinet with Drawer", "beds", "bedroom"),
  m("cabinetBedDrawerTable", "Bed Cabinet Drawer Table", "beds", "bedroom"),
  m("pillow", "Pillow", "beds", "bedroom"),
  m("pillowBlue", "Blue Pillow", "beds", "bedroom"),
  m("pillowLong", "Long Pillow", "beds", "bedroom"),
  m("pillowBlueLong", "Long Blue Pillow", "beds", "bedroom"),

  // ── Storage & Shelves ──────────────────
  m("bookcaseClosed", "Closed Bookcase", "storage", "storage"),
  m("bookcaseClosedDoors", "Bookcase with Doors", "storage", "storage"),
  m("bookcaseClosedWide", "Wide Closed Bookcase", "storage", "storage"),
  m("bookcaseOpen", "Open Bookcase", "storage", "storage"),
  m("bookcaseOpenLow", "Low Open Bookcase", "storage", "storage"),
  m("cabinetTelevision", "TV Cabinet", "storage", "living_room"),
  m("cabinetTelevisionDoors", "TV Cabinet with Doors", "storage", "living_room"),
  m("coatRack", "Coat Rack", "storage", "storage"),
  m("coatRackStanding", "Standing Coat Rack", "storage", "storage"),
  m("cardboardBoxClosed", "Closed Box", "storage", "storage"),
  m("cardboardBoxOpen", "Open Box", "storage", "storage"),
  m("trashcan", "Trashcan", "storage", "kitchen"),

  // ── Kitchen ────────────────────────────
  m("kitchenCabinet", "Kitchen Cabinet", "kitchen", "kitchen"),
  m("kitchenCabinetCornerInner", "Corner Cabinet (Inner)", "kitchen", "kitchen"),
  m("kitchenCabinetCornerRound", "Corner Cabinet (Round)", "kitchen", "kitchen"),
  m("kitchenCabinetDrawer", "Cabinet with Drawer", "kitchen", "kitchen"),
  m("kitchenCabinetUpper", "Upper Cabinet", "kitchen", "kitchen"),
  m("kitchenCabinetUpperCorner", "Upper Corner Cabinet", "kitchen", "kitchen"),
  m("kitchenCabinetUpperDouble", "Upper Double Cabinet", "kitchen", "kitchen"),
  m("kitchenCabinetUpperLow", "Low Upper Cabinet", "kitchen", "kitchen"),
  m("kitchenSink", "Kitchen Sink", "kitchen", "kitchen"),
  m("kitchenStove", "Kitchen Stove", "kitchen", "kitchen"),
  m("kitchenStoveElectric", "Electric Stove", "kitchen", "kitchen"),
  m("kitchenBlender", "Blender", "kitchen", "kitchen"),
  m("kitchenCoffeeMachine", "Coffee Machine", "kitchen", "kitchen"),
  m("kitchenMicrowave", "Microwave", "kitchen", "kitchen"),
  m("toaster", "Toaster", "kitchen", "kitchen"),
  m("hoodLarge", "Large Range Hood", "kitchen", "kitchen"),
  m("hoodModern", "Modern Range Hood", "kitchen", "kitchen"),

  // ── Bathroom ───────────────────────────
  m("bathroomCabinet", "Bathroom Cabinet", "bathroom", "bathroom"),
  m("bathroomCabinetDrawer", "Bathroom Drawer Cabinet", "bathroom", "bathroom"),
  m("bathroomMirror", "Bathroom Mirror", "bathroom", "bathroom"),
  m("bathroomSink", "Bathroom Sink", "bathroom", "bathroom"),
  m("bathroomSinkSquare", "Square Bathroom Sink", "bathroom", "bathroom"),
  m("bathtub", "Bathtub", "bathroom", "bathroom"),
  m("shower", "Shower", "bathroom", "bathroom"),
  m("showerRound", "Round Shower", "bathroom", "bathroom"),
  m("toilet", "Toilet", "bathroom", "bathroom"),
  m("toiletSquare", "Square Toilet", "bathroom", "bathroom"),

  // ── Lighting ───────────────────────────
  m("lampRoundFloor", "Round Floor Lamp", "lighting", "living_room"),
  m("lampRoundTable", "Round Table Lamp", "lighting", "living_room"),
  m("lampSquareCeiling", "Square Ceiling Lamp", "lighting", "living_room"),
  m("lampSquareFloor", "Square Floor Lamp", "lighting", "living_room"),
  m("lampSquareTable", "Square Table Lamp", "lighting", "living_room"),
  m("lampWall", "Wall Lamp", "lighting", "living_room"),
  m("ceilingFan", "Ceiling Fan", "lighting", "living_room"),

  // ── Decor & Plants ─────────────────────
  m("plantSmall1", "Small Plant 1", "decor", "living_room"),
  m("plantSmall2", "Small Plant 2", "decor", "living_room"),
  m("plantSmall3", "Small Plant 3", "decor", "living_room"),
  m("pottedPlant", "Potted Plant", "decor", "living_room"),
  m("books", "Books", "decor", "living_room"),
  m("bear", "Teddy Bear", "decor", "kids"),
  m("rugDoormat", "Doormat", "decor", "living_room"),
  m("rugRectangle", "Rectangle Rug", "decor", "living_room"),
  m("rugRound", "Round Rug", "decor", "living_room"),
  m("rugRounded", "Rounded Rug", "decor", "living_room"),
  m("rugSquare", "Square Rug", "decor", "living_room"),

  // ── Electronics ────────────────────────
  m("computerKeyboard", "Keyboard", "electronics", "office"),
  m("computerMouse", "Mouse", "electronics", "office"),
  m("computerScreen", "Monitor", "electronics", "office"),
  m("laptop", "Laptop", "electronics", "office"),
  m("televisionAntenna", "Antenna TV", "electronics", "living_room"),
  m("televisionModern", "Modern TV", "electronics", "living_room"),
  m("televisionVintage", "Vintage TV", "electronics", "living_room"),
  m("radio", "Radio", "electronics", "living_room"),
  m("speaker", "Speaker", "electronics", "living_room"),
  m("speakerSmall", "Small Speaker", "electronics", "living_room"),

  // ── Appliances ─────────────────────────
  m("kitchenFridge", "Fridge", "appliances", "kitchen"),
  m("kitchenFridgeBuiltIn", "Built-in Fridge", "appliances", "kitchen"),
  m("kitchenFridgeLarge", "Large Fridge", "appliances", "kitchen"),
  m("kitchenFridgeSmall", "Small Fridge", "appliances", "kitchen"),
  m("washer", "Washing Machine", "appliances", "bathroom"),
  m("dryer", "Dryer", "appliances", "bathroom"),
  m("washerDryerStacked", "Stacked Washer/Dryer", "appliances", "bathroom"),

  // ── Structure (Walls & Floors) ─────────
  m("wall", "Wall", "structure", "living_room"),
  m("wallCorner", "Wall Corner", "structure", "living_room"),
  m("wallCornerRond", "Rounded Wall Corner", "structure", "living_room"),
  m("wallDoorway", "Wall with Doorway", "structure", "living_room"),
  m("wallDoorwayWide", "Wide Doorway Wall", "structure", "living_room"),
  m("wallHalf", "Half Wall", "structure", "living_room"),
  m("wallWindow", "Wall with Window", "structure", "living_room"),
  m("wallWindowSlide", "Sliding Window Wall", "structure", "living_room"),
  m("doorway", "Doorway", "structure", "living_room"),
  m("doorwayFront", "Front Doorway", "structure", "living_room"),
  m("doorwayOpen", "Open Doorway", "structure", "living_room"),
  m("floorFull", "Full Floor", "structure", "living_room"),
  m("floorHalf", "Half Floor", "structure", "living_room"),
  m("floorCorner", "Floor Corner", "structure", "living_room"),
  m("floorCornerRound", "Rounded Floor Corner", "structure", "living_room"),
  m("paneling", "Paneling", "structure", "living_room"),
  m("stairs", "Stairs", "structure", "living_room"),
  m("stairsCorner", "Corner Stairs", "structure", "living_room"),
  m("stairsOpen", "Open Stairs", "structure", "living_room"),
  m("stairsOpenSingle", "Single Open Stair", "structure", "living_room"),
];

/** Furniture-only Kenney models (structural items and non-furniture filtered out) */
export const KENNEY_MODELS: KenneyModel[] = ALL_KENNEY_MODELS.filter(
  (m) => !SKIP_IDS.has(m.id),
);
