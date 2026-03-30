/**
 * Classification-only prompt — identifies furniture type, style, material, color.
 * Does NOT try to decompose into geometry. Just classifies.
 */
export const FURNITURE_CLASSIFICATION_PROMPT = `You analyze furniture photos and classify them. Output one JSON object only — no markdown, no commentary.

Look at the image carefully and identify:

{
  "name": "short descriptive name in English",
  "category": "sofa" | "chair" | "table" | "bed" | "cabinet" | "shelf" | "desk" | "other",
  "subtype": "specific type (see list below)",
  "style": "modern" | "scandinavian" | "classic" | "industrial" | "farmhouse" | "mid_century" | "minimalist" | "traditional",
  "armStyle": "rounded" | "square" | "thin" | "none",
  "backStyle": "loose_back" | "tight_back" | "tufted" | "open" | "none",
  "baseStyle": "legs" | "recessed" | "pedestal" | "sled" | "none",
  "material": "closest materialId from the list below",
  "dominantColor": "#hex color you see in the image",
  "seatCount": number (for sofas only, how many seat positions),
  "estimatedDims": { "w": width_mm, "h": height_mm, "d": depth_mm }
}

SUBTYPES by category:
- sofa: "2_seat", "3_seat", "loveseat", "l_sectional", "chaise_sectional", "sofa_bed"
- chair: "armchair", "dining_chair", "office_chair", "accent_chair", "wingback", "lounge_chair", "bar_stool"
- table: "dining_table", "coffee_table", "side_table", "console_table", "desk"
- bed: "single_bed", "double_bed", "queen_bed", "king_bed", "bunk_bed", "daybed"
- cabinet: "cabinet", "sideboard", "dresser", "tv_unit", "wardrobe"
- shelf: "bookshelf", "shelving_unit", "display_shelf"

MATERIALS (pick the closest match to what you SEE):
Fabric: fabric_cream, fabric_beige, fabric_ivory, fabric_gray, fabric_charcoal, fabric_brown, fabric_blue, fabric_green, fabric_sage, fabric_mustard, fabric_blush, fabric_terracotta, fabric_taupe, velvet_navy
Leather: leather_brown, leather_black, leather_tan
Wood: oak, walnut, pine, cherry, maple, birch, teak, mahogany, ash
Metal: steel, brass, black_metal, chrome, gold
Woven: cane_natural
Engineered: melamine_white, melamine_black, melamine_cream, laminate_oak
Stone: marble_white, marble_black, concrete

COLOR DETECTION — CRITICAL:
- LOOK at the actual colors in the image
- Light cream/beige/off-white → fabric_cream or fabric_beige
- Light gray → fabric_gray
- Dark gray/charcoal → fabric_charcoal
- Brown leather → leather_brown
- Light green/sage/olive → fabric_sage
- Set dominantColor to the actual hex color you observe

DIMENSIONS — estimate realistic furniture dimensions in millimeters:
- Sofa: width 1400-2800mm, height 750-950mm, depth 800-1000mm
- Chair: width 500-900mm, height 750-1000mm, depth 500-850mm
- Table: width 600-2000mm, height 400-780mm, depth 400-1000mm
- Bed: width 900-2000mm, height 900-1400mm, depth 1900-2200mm
- Cabinet: width 600-2000mm, height 500-2000mm, depth 300-600mm

Output valid JSON only.`;
