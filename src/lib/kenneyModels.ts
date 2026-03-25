// ─── Kenney Furniture Kit Model Catalog ──────────────────
// CC0 (public domain) — https://kenney.nl/assets/furniture-kit

export interface KenneyModel {
  id: string;       // filename without .glb
  name: string;     // display name
  category: string; // category key
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

function m(id: string, name: string, category: string): KenneyModel {
  return { id, name, category, path: `${BASE}${id}.glb` };
}

export const KENNEY_MODELS: KenneyModel[] = [
  // ── Seating ────────────────────────────
  m("chair", "Chair", "seating"),
  m("chairCushion", "Chair with Cushion", "seating"),
  m("chairDesk", "Desk Chair", "seating"),
  m("chairModernCushion", "Modern Cushion Chair", "seating"),
  m("chairModernFrameCushion", "Modern Frame Chair", "seating"),
  m("chairRounded", "Rounded Chair", "seating"),
  m("loungeChair", "Lounge Chair", "seating"),
  m("loungeChairRelax", "Relax Lounge Chair", "seating"),
  m("loungeDesignChair", "Design Lounge Chair", "seating"),
  m("loungeSofa", "Sofa", "seating"),
  m("loungeSofaCorner", "Corner Sofa", "seating"),
  m("loungeSofaLong", "Long Sofa", "seating"),
  m("loungeSofaOttoman", "Ottoman", "seating"),
  m("loungeDesignSofa", "Design Sofa", "seating"),
  m("loungeDesignSofaCorner", "Design Corner Sofa", "seating"),
  m("bench", "Bench", "seating"),
  m("benchCushion", "Bench with Cushion", "seating"),
  m("benchCushionLow", "Low Bench with Cushion", "seating"),
  m("stoolBar", "Bar Stool", "seating"),
  m("stoolBarSquare", "Square Bar Stool", "seating"),

  // ── Tables ─────────────────────────────
  m("table", "Table", "tables"),
  m("tableCloth", "Table with Cloth", "tables"),
  m("tableCoffee", "Coffee Table", "tables"),
  m("tableCoffeeSquare", "Square Coffee Table", "tables"),
  m("tableCoffeeGlass", "Glass Coffee Table", "tables"),
  m("tableCoffeeGlassSquare", "Square Glass Coffee Table", "tables"),
  m("tableCross", "Cross Table", "tables"),
  m("tableCrossCloth", "Cross Table with Cloth", "tables"),
  m("tableGlass", "Glass Table", "tables"),
  m("tableRound", "Round Table", "tables"),
  m("desk", "Desk", "tables"),
  m("deskCorner", "Corner Desk", "tables"),
  m("sideTable", "Side Table", "tables"),
  m("sideTableDrawers", "Side Table with Drawers", "tables"),
  m("kitchenBar", "Kitchen Bar", "tables"),
  m("kitchenBarEnd", "Kitchen Bar End", "tables"),

  // ── Beds ───────────────────────────────
  m("bedSingle", "Single Bed", "beds"),
  m("bedDouble", "Double Bed", "beds"),
  m("bedBunk", "Bunk Bed", "beds"),
  m("cabinetBed", "Bed Cabinet", "beds"),
  m("cabinetBedDrawer", "Bed Cabinet with Drawer", "beds"),
  m("cabinetBedDrawerTable", "Bed Cabinet Drawer Table", "beds"),
  m("pillow", "Pillow", "beds"),
  m("pillowBlue", "Blue Pillow", "beds"),
  m("pillowLong", "Long Pillow", "beds"),
  m("pillowBlueLong", "Long Blue Pillow", "beds"),

  // ── Storage & Shelves ──────────────────
  m("bookcaseClosed", "Closed Bookcase", "storage"),
  m("bookcaseClosedDoors", "Bookcase with Doors", "storage"),
  m("bookcaseClosedWide", "Wide Closed Bookcase", "storage"),
  m("bookcaseOpen", "Open Bookcase", "storage"),
  m("bookcaseOpenLow", "Low Open Bookcase", "storage"),
  m("cabinetTelevision", "TV Cabinet", "storage"),
  m("cabinetTelevisionDoors", "TV Cabinet with Doors", "storage"),
  m("coatRack", "Coat Rack", "storage"),
  m("coatRackStanding", "Standing Coat Rack", "storage"),
  m("cardboardBoxClosed", "Closed Box", "storage"),
  m("cardboardBoxOpen", "Open Box", "storage"),
  m("trashcan", "Trashcan", "storage"),

  // ── Kitchen ────────────────────────────
  m("kitchenCabinet", "Kitchen Cabinet", "kitchen"),
  m("kitchenCabinetCornerInner", "Corner Cabinet (Inner)", "kitchen"),
  m("kitchenCabinetCornerRound", "Corner Cabinet (Round)", "kitchen"),
  m("kitchenCabinetDrawer", "Cabinet with Drawer", "kitchen"),
  m("kitchenCabinetUpper", "Upper Cabinet", "kitchen"),
  m("kitchenCabinetUpperCorner", "Upper Corner Cabinet", "kitchen"),
  m("kitchenCabinetUpperDouble", "Upper Double Cabinet", "kitchen"),
  m("kitchenCabinetUpperLow", "Low Upper Cabinet", "kitchen"),
  m("kitchenSink", "Kitchen Sink", "kitchen"),
  m("kitchenStove", "Kitchen Stove", "kitchen"),
  m("kitchenStoveElectric", "Electric Stove", "kitchen"),
  m("kitchenBlender", "Blender", "kitchen"),
  m("kitchenCoffeeMachine", "Coffee Machine", "kitchen"),
  m("kitchenMicrowave", "Microwave", "kitchen"),
  m("toaster", "Toaster", "kitchen"),
  m("hoodLarge", "Large Range Hood", "kitchen"),
  m("hoodModern", "Modern Range Hood", "kitchen"),

  // ── Bathroom ───────────────────────────
  m("bathroomCabinet", "Bathroom Cabinet", "bathroom"),
  m("bathroomCabinetDrawer", "Bathroom Drawer Cabinet", "bathroom"),
  m("bathroomMirror", "Bathroom Mirror", "bathroom"),
  m("bathroomSink", "Bathroom Sink", "bathroom"),
  m("bathroomSinkSquare", "Square Bathroom Sink", "bathroom"),
  m("bathtub", "Bathtub", "bathroom"),
  m("shower", "Shower", "bathroom"),
  m("showerRound", "Round Shower", "bathroom"),
  m("toilet", "Toilet", "bathroom"),
  m("toiletSquare", "Square Toilet", "bathroom"),

  // ── Lighting ───────────────────────────
  m("lampRoundFloor", "Round Floor Lamp", "lighting"),
  m("lampRoundTable", "Round Table Lamp", "lighting"),
  m("lampSquareCeiling", "Square Ceiling Lamp", "lighting"),
  m("lampSquareFloor", "Square Floor Lamp", "lighting"),
  m("lampSquareTable", "Square Table Lamp", "lighting"),
  m("lampWall", "Wall Lamp", "lighting"),
  m("ceilingFan", "Ceiling Fan", "lighting"),

  // ── Decor & Plants ─────────────────────
  m("plantSmall1", "Small Plant 1", "decor"),
  m("plantSmall2", "Small Plant 2", "decor"),
  m("plantSmall3", "Small Plant 3", "decor"),
  m("pottedPlant", "Potted Plant", "decor"),
  m("books", "Books", "decor"),
  m("bear", "Teddy Bear", "decor"),
  m("rugDoormat", "Doormat", "decor"),
  m("rugRectangle", "Rectangle Rug", "decor"),
  m("rugRound", "Round Rug", "decor"),
  m("rugRounded", "Rounded Rug", "decor"),
  m("rugSquare", "Square Rug", "decor"),

  // ── Electronics ────────────────────────
  m("computerKeyboard", "Keyboard", "electronics"),
  m("computerMouse", "Mouse", "electronics"),
  m("computerScreen", "Monitor", "electronics"),
  m("laptop", "Laptop", "electronics"),
  m("televisionAntenna", "Antenna TV", "electronics"),
  m("televisionModern", "Modern TV", "electronics"),
  m("televisionVintage", "Vintage TV", "electronics"),
  m("radio", "Radio", "electronics"),
  m("speaker", "Speaker", "electronics"),
  m("speakerSmall", "Small Speaker", "electronics"),

  // ── Appliances ─────────────────────────
  m("kitchenFridge", "Fridge", "appliances"),
  m("kitchenFridgeBuiltIn", "Built-in Fridge", "appliances"),
  m("kitchenFridgeLarge", "Large Fridge", "appliances"),
  m("kitchenFridgeSmall", "Small Fridge", "appliances"),
  m("washer", "Washing Machine", "appliances"),
  m("dryer", "Dryer", "appliances"),
  m("washerDryerStacked", "Stacked Washer/Dryer", "appliances"),

  // ── Structure (Walls & Floors) ─────────
  m("wall", "Wall", "structure"),
  m("wallCorner", "Wall Corner", "structure"),
  m("wallCornerRond", "Rounded Wall Corner", "structure"),
  m("wallDoorway", "Wall with Doorway", "structure"),
  m("wallDoorwayWide", "Wide Doorway Wall", "structure"),
  m("wallHalf", "Half Wall", "structure"),
  m("wallWindow", "Wall with Window", "structure"),
  m("wallWindowSlide", "Sliding Window Wall", "structure"),
  m("doorway", "Doorway", "structure"),
  m("doorwayFront", "Front Doorway", "structure"),
  m("doorwayOpen", "Open Doorway", "structure"),
  m("floorFull", "Full Floor", "structure"),
  m("floorHalf", "Half Floor", "structure"),
  m("floorCorner", "Floor Corner", "structure"),
  m("floorCornerRound", "Rounded Floor Corner", "structure"),
  m("paneling", "Paneling", "structure"),
  m("stairs", "Stairs", "structure"),
  m("stairsCorner", "Corner Stairs", "structure"),
  m("stairsOpen", "Open Stairs", "structure"),
  m("stairsOpenSingle", "Single Open Stair", "structure"),
];
