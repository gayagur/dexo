// ─── Dynamic Brief Field Generator ──────────────────────────
// Returns context-specific brief fields based on the detected category/item type.
// Fields are returned synchronously from a hardcoded map — no API call needed.

export interface BriefField {
  id: string;
  label: string;
  type: 'select' | 'toggle' | 'text' | 'color' | 'slider';
  /** Options for select fields */
  options?: string[];
  /** Whether this field is required for a complete brief */
  required?: boolean;
  /** Placeholder for text inputs */
  placeholder?: string;
  /** For slider: min/max/step */
  sliderConfig?: { min: number; max: number; step: number; unit: string };
}

// ── Per-category field definitions ─────────────────────────

const COMMON_FIELDS: BriefField[] = [
  {
    id: 'finish',
    label: 'Finish',
    type: 'select',
    options: ['Matte', 'Satin', 'Gloss', 'Semi-Gloss', 'Natural', 'Distressed'],
  },
  {
    id: 'primary_color',
    label: 'Primary Color',
    type: 'color',
    placeholder: '#8B4513',
  },
  {
    id: 'assembly_required',
    label: 'Assembly Required',
    type: 'toggle',
  },
];

const FURNITURE_FIELDS: BriefField[] = [
  {
    id: 'wood_type',
    label: 'Wood Type',
    type: 'select',
    options: ['Oak', 'Walnut', 'Pine', 'Maple', 'Cherry', 'Birch', 'Teak', 'Mahogany'],
    required: true,
  },
  {
    id: 'joinery',
    label: 'Joinery Style',
    type: 'select',
    options: ['Dovetail', 'Mortise & Tenon', 'Dowel', 'Biscuit', 'Pocket Screw', 'Box Joint'],
  },
  {
    id: 'edge_profile',
    label: 'Edge Profile',
    type: 'select',
    options: ['Square', 'Rounded', 'Beveled', 'Chamfered', 'Bullnose', 'Ogee'],
  },
  {
    id: 'hardware_style',
    label: 'Hardware Style',
    type: 'select',
    options: ['Brushed Nickel', 'Matte Black', 'Brass', 'Chrome', 'Antique Bronze', 'No Hardware'],
  },
  {
    id: 'weight_capacity',
    label: 'Weight Capacity (kg)',
    type: 'slider',
    sliderConfig: { min: 10, max: 200, step: 10, unit: 'kg' },
  },
];

const SEATING_FIELDS: BriefField[] = [
  {
    id: 'upholstery',
    label: 'Upholstery',
    type: 'select',
    options: ['Leather', 'Faux Leather', 'Linen', 'Velvet', 'Cotton', 'Polyester', 'Microfiber', 'None'],
    required: true,
  },
  {
    id: 'cushion_type',
    label: 'Cushion Type',
    type: 'select',
    options: ['Foam', 'Down', 'Memory Foam', 'Spring', 'Fiber Fill'],
  },
  {
    id: 'armrest',
    label: 'Armrests',
    type: 'toggle',
  },
  {
    id: 'reclining',
    label: 'Reclining',
    type: 'toggle',
  },
  {
    id: 'seat_height',
    label: 'Seat Height (cm)',
    type: 'slider',
    sliderConfig: { min: 30, max: 80, step: 5, unit: 'cm' },
  },
];

const STORAGE_FIELDS: BriefField[] = [
  {
    id: 'num_shelves',
    label: 'Number of Shelves',
    type: 'slider',
    sliderConfig: { min: 1, max: 12, step: 1, unit: '' },
    required: true,
  },
  {
    id: 'adjustable_shelves',
    label: 'Adjustable Shelves',
    type: 'toggle',
  },
  {
    id: 'door_type',
    label: 'Door Type',
    type: 'select',
    options: ['Open', 'Hinged', 'Sliding', 'Glass', 'Roll-Top', 'Drop-Down'],
  },
  {
    id: 'lock',
    label: 'Locking Mechanism',
    type: 'toggle',
  },
];

const TABLE_FIELDS: BriefField[] = [
  {
    id: 'table_shape',
    label: 'Table Shape',
    type: 'select',
    options: ['Rectangular', 'Round', 'Oval', 'Square', 'Freeform'],
    required: true,
  },
  {
    id: 'leg_style',
    label: 'Leg Style',
    type: 'select',
    options: ['Straight', 'Tapered', 'Turned', 'Hairpin', 'Pedestal', 'Trestle', 'X-Base'],
  },
  {
    id: 'extendable',
    label: 'Extendable',
    type: 'toggle',
  },
  {
    id: 'seating_capacity',
    label: 'Seating Capacity',
    type: 'slider',
    sliderConfig: { min: 2, max: 12, step: 1, unit: 'people' },
  },
];

const BED_FIELDS: BriefField[] = [
  {
    id: 'bed_size',
    label: 'Bed Size',
    type: 'select',
    options: ['Single', 'Twin', 'Full/Double', 'Queen', 'King', 'Super King'],
    required: true,
  },
  {
    id: 'headboard_style',
    label: 'Headboard Style',
    type: 'select',
    options: ['Panel', 'Upholstered', 'Slatted', 'Bookcase', 'Floating', 'None'],
  },
  {
    id: 'under_bed_storage',
    label: 'Under-Bed Storage',
    type: 'toggle',
  },
];

const KITCHEN_FIELDS: BriefField[] = [
  {
    id: 'countertop_material',
    label: 'Countertop Material',
    type: 'select',
    options: ['Granite', 'Quartz', 'Marble', 'Butcher Block', 'Stainless Steel', 'Concrete', 'Laminate'],
    required: true,
  },
  {
    id: 'sink_cutout',
    label: 'Sink Cutout',
    type: 'toggle',
  },
  {
    id: 'soft_close',
    label: 'Soft-Close Drawers',
    type: 'toggle',
  },
];

const LIGHTING_FIELDS: BriefField[] = [
  {
    id: 'light_type',
    label: 'Light Type',
    type: 'select',
    options: ['Pendant', 'Chandelier', 'Floor Lamp', 'Table Lamp', 'Wall Sconce', 'Track', 'Recessed'],
    required: true,
  },
  {
    id: 'bulb_type',
    label: 'Bulb Type',
    type: 'select',
    options: ['LED', 'Incandescent', 'Halogen', 'Edison', 'Smart Bulb'],
  },
  {
    id: 'dimmable',
    label: 'Dimmable',
    type: 'toggle',
  },
  {
    id: 'color_temperature',
    label: 'Color Temperature',
    type: 'select',
    options: ['Warm White (2700K)', 'Soft White (3000K)', 'Neutral (4000K)', 'Cool White (5000K)', 'Daylight (6500K)'],
  },
];

const TEXTILE_FIELDS: BriefField[] = [
  {
    id: 'fabric_type',
    label: 'Fabric Type',
    type: 'select',
    options: ['Cotton', 'Linen', 'Silk', 'Wool', 'Polyester', 'Velvet', 'Chenille', 'Jute'],
    required: true,
  },
  {
    id: 'pattern',
    label: 'Pattern',
    type: 'select',
    options: ['Solid', 'Striped', 'Geometric', 'Floral', 'Abstract', 'Plaid', 'Herringbone'],
  },
  {
    id: 'washable',
    label: 'Machine Washable',
    type: 'toggle',
  },
];

const OUTDOOR_FIELDS: BriefField[] = [
  {
    id: 'weather_resistant',
    label: 'Weather Resistant',
    type: 'toggle',
    required: true,
  },
  {
    id: 'uv_protection',
    label: 'UV Protection',
    type: 'toggle',
  },
  {
    id: 'outdoor_material',
    label: 'Outdoor Material',
    type: 'select',
    options: ['Teak', 'Aluminum', 'Wicker/Rattan', 'Wrought Iron', 'Recycled Plastic', 'Concrete', 'Cedar'],
    required: true,
  },
];

// ── Category → field mapping ───────────────────────────────

type CategoryKey = string;

const CATEGORY_FIELD_MAP: Record<CategoryKey, BriefField[]> = {
  // Furniture
  'Custom Furniture Design': [...FURNITURE_FIELDS, ...COMMON_FIELDS],
  'Carpentry & Custom Woodworking': [...FURNITURE_FIELDS, ...COMMON_FIELDS],
  'Furniture Restoration & Upcycling': [
    ...FURNITURE_FIELDS.filter(f => f.id !== 'joinery'),
    { id: 'restoration_level', label: 'Restoration Level', type: 'select', options: ['Light Touch-Up', 'Moderate Refinish', 'Full Restoration', 'Creative Upcycle'], required: true },
    ...COMMON_FIELDS,
  ],

  // Living Room
  'Living Room Design & Styling': [...SEATING_FIELDS, ...COMMON_FIELDS],

  // Kitchen
  'Kitchen & Dining Design': [...KITCHEN_FIELDS, ...TABLE_FIELDS, ...COMMON_FIELDS],

  // Bedroom
  'Bedroom Design & Styling': [...BED_FIELDS, ...STORAGE_FIELDS.slice(0, 2), ...COMMON_FIELDS],

  // Storage
  'Shelving & Storage Solutions': [...STORAGE_FIELDS, ...FURNITURE_FIELDS.filter(f => ['wood_type', 'hardware_style'].includes(f.id)), ...COMMON_FIELDS],
  'Storage & Organization Solutions': [...STORAGE_FIELDS, ...COMMON_FIELDS],

  // Lighting
  'Lighting Design & Installation': [...LIGHTING_FIELDS, ...COMMON_FIELDS],

  // Textiles
  'Textile & Soft Furnishings': [...TEXTILE_FIELDS, ...COMMON_FIELDS],

  // Outdoor
  'Outdoor & Garden Design': [...OUTDOOR_FIELDS, ...SEATING_FIELDS.filter(f => ['upholstery', 'cushion_type'].includes(f.id)), ...COMMON_FIELDS],

  // Home Office
  'Home Office Design': [
    ...TABLE_FIELDS.filter(f => ['table_shape', 'leg_style'].includes(f.id)),
    { id: 'cable_management', label: 'Cable Management', type: 'toggle' },
    { id: 'monitor_mount', label: 'Monitor Mount', type: 'toggle' },
    ...STORAGE_FIELDS.slice(0, 2),
    ...COMMON_FIELDS,
  ],

  // Bathroom
  'Bathroom Design': [
    { id: 'moisture_resistant', label: 'Moisture Resistant', type: 'toggle', required: true },
    { id: 'vanity_style', label: 'Vanity Style', type: 'select', options: ['Floating', 'Freestanding', 'Wall-Mounted', 'Built-In'], required: true },
    ...COMMON_FIELDS,
  ],

  // Wall Art
  'Wall Art & Gallery Walls': [
    { id: 'frame_material', label: 'Frame Material', type: 'select', options: ['Wood', 'Metal', 'Acrylic', 'Frameless', 'Canvas Wrap'] },
    { id: 'mount_type', label: 'Mount Type', type: 'select', options: ['Wire Hang', 'Flush Mount', 'Floating', 'Easel', 'Rail System'] },
    ...COMMON_FIELDS.filter(f => f.id !== 'assembly_required'),
  ],

  // Plants
  'Plants & Greenery Styling': [
    { id: 'planter_material', label: 'Planter Material', type: 'select', options: ['Ceramic', 'Terracotta', 'Concrete', 'Wood', 'Metal', 'Woven Basket'] },
    { id: 'drainage', label: 'Drainage Holes', type: 'toggle' },
    { id: 'self_watering', label: 'Self-Watering', type: 'toggle' },
    ...COMMON_FIELDS.filter(f => f.id !== 'assembly_required'),
  ],

  // Full Interior
  'Full Interior Design (entire space)': [
    { id: 'design_scope', label: 'Design Scope', type: 'select', options: ['Single Room', 'Multiple Rooms', 'Entire Home', 'Open Plan'], required: true },
    { id: 'flooring', label: 'Flooring Preference', type: 'select', options: ['Hardwood', 'Tile', 'Carpet', 'Vinyl', 'Concrete', 'Keep Existing'] },
    { id: 'wall_treatment', label: 'Wall Treatment', type: 'select', options: ['Paint', 'Wallpaper', 'Wood Paneling', 'Exposed Brick', 'Tile', 'Keep Existing'] },
    ...COMMON_FIELDS.filter(f => f.id !== 'assembly_required'),
  ],

  // Office design
  'Office Design & Ergonomics': [
    { id: 'standing_desk', label: 'Standing/Sit-Stand Desk', type: 'toggle' },
    { id: 'ergonomic_chair', label: 'Ergonomic Chair', type: 'toggle' },
    { id: 'cable_management', label: 'Cable Management', type: 'toggle' },
    ...STORAGE_FIELDS.slice(0, 2),
    ...COMMON_FIELDS,
  ],
};

// ── Fuzzy match: detect seating/table/storage from item keywords ──

function inferSubtype(category: string): BriefField[] | null {
  const lower = category.toLowerCase();

  // Seating
  if (/sofa|armchair|chair|bench|stool|ottoman|seating|sectional/i.test(lower)) {
    return [...SEATING_FIELDS, ...COMMON_FIELDS];
  }
  // Tables
  if (/table|desk|console|island|counter/i.test(lower)) {
    return [...TABLE_FIELDS, ...COMMON_FIELDS];
  }
  // Beds
  if (/bed|headboard|nightstand|dresser/i.test(lower)) {
    return [...BED_FIELDS, ...STORAGE_FIELDS.slice(0, 2), ...COMMON_FIELDS];
  }
  // Storage
  if (/shelf|shelving|cabinet|bookcase|wardrobe|closet|drawer|pantry|shoe/i.test(lower)) {
    return [...STORAGE_FIELDS, ...FURNITURE_FIELDS.filter(f => f.id === 'wood_type'), ...COMMON_FIELDS];
  }
  // Lighting
  if (/lamp|light|chandelier|sconce|pendant/i.test(lower)) {
    return [...LIGHTING_FIELDS, ...COMMON_FIELDS];
  }

  return null;
}

// ── Public API ─────────────────────────────────────────────

/**
 * Generate dynamic brief fields based on the category (item type).
 * Returns a promise for API-compatible signature, but resolves synchronously.
 */
export function generateBriefFields(
  category: string,
  _roomType?: string,
): Promise<BriefField[]> {
  // Exact match first
  const exact = CATEGORY_FIELD_MAP[category];
  if (exact) return Promise.resolve(exact);

  // Fuzzy subtype match
  const inferred = inferSubtype(category);
  if (inferred) return Promise.resolve(inferred);

  // Fallback: generic furniture fields
  return Promise.resolve([...FURNITURE_FIELDS.slice(0, 3), ...COMMON_FIELDS]);
}

/**
 * Synchronous version for cases where async is not needed.
 */
export function generateBriefFieldsSync(
  category: string,
  _roomType?: string,
): BriefField[] {
  const exact = CATEGORY_FIELD_MAP[category];
  if (exact) return exact;

  const inferred = inferSubtype(category);
  if (inferred) return inferred;

  return [...FURNITURE_FIELDS.slice(0, 3), ...COMMON_FIELDS];
}
