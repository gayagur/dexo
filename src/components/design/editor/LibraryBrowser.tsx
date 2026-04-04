import { useState, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_TEMPLATES,
  type LibraryTemplate,
} from "@/lib/libraryData";
import type { CommunityTemplate } from "@/lib/library-api";
import { panelsToWorldSpace } from "@/lib/groupUtils";
import { KENNEY_MODELS, type KenneyModel } from "@/lib/kenneyModels";

// ─── Room definitions ───────────────────────────────────

interface Subcategory {
  id: string;
  label: string;
}

interface RoomDef {
  id: string;
  label: string;
  emoji: string;
  subcategories: Subcategory[];
}

const ROOMS: RoomDef[] = [
  { id: "all", label: "All", emoji: "\u{1F3E0}", subcategories: [] },
  { id: "living_room", label: "Living Room", emoji: "\u{1F6CB}\uFE0F", subcategories: [
    { id: "seating", label: "Sofas & Seating" },
    { id: "tables", label: "Tables" },
    { id: "storage", label: "Storage" },
    { id: "lighting", label: "Lighting" },
    { id: "decor", label: "Decor" },
  ]},
  { id: "bedroom", label: "Bedroom", emoji: "\u{1F6CF}\uFE0F", subcategories: [
    { id: "beds", label: "Beds" },
    { id: "storage", label: "Wardrobes & Storage" },
    { id: "tables", label: "Nightstands & Desks" },
    { id: "seating", label: "Chairs & Benches" },
    { id: "decor", label: "Decor" },
  ]},
  { id: "kitchen", label: "Kitchen", emoji: "\u{1F373}", subcategories: [
    { id: "cabinets", label: "Cabinets" },
    { id: "seating", label: "Dining & Seating" },
    { id: "appliances", label: "Appliances" },
    { id: "storage", label: "Storage" },
    { id: "decor", label: "Decor" },
  ]},
  { id: "office", label: "Office", emoji: "\u{1F4BC}", subcategories: [
    { id: "desks", label: "Desks" },
    { id: "seating", label: "Chairs" },
    { id: "storage", label: "Shelves & Storage" },
    { id: "lighting", label: "Lighting" },
    { id: "decor", label: "Accessories" },
  ]},
  { id: "bathroom", label: "Bathroom", emoji: "\u{1F6BF}", subcategories: [
    { id: "vanity", label: "Vanity & Sinks" },
    { id: "storage", label: "Storage" },
    { id: "accessories", label: "Accessories" },
  ]},
  { id: "dining", label: "Dining", emoji: "\u{1F37D}\uFE0F", subcategories: [
    { id: "tables", label: "Tables" },
    { id: "seating", label: "Chairs & Stools" },
    { id: "storage", label: "Storage" },
  ]},
  { id: "outdoor", label: "Outdoor", emoji: "\u{1F33F}", subcategories: [
    { id: "seating", label: "Seating" },
    { id: "tables", label: "Tables" },
    { id: "decor", label: "Decor" },
  ]},
  { id: "kids", label: "Kids", emoji: "\u{1F9F8}", subcategories: [
    { id: "beds", label: "Beds" },
    { id: "storage", label: "Storage" },
    { id: "seating", label: "Seating" },
  ]},
  { id: "storage", label: "Storage", emoji: "\u{1F4E6}", subcategories: [
    { id: "shelves", label: "Shelves" },
    { id: "cabinets", label: "Cabinets" },
    { id: "racks", label: "Racks" },
  ]},
];

// ─── Room inference by keyword matching ─────────────────

const ROOM_KEYWORDS: Record<string, string[]> = {
  living_room: [
    "sofa", "couch", "armchair", "coffee table", "tv stand", "bookshelf",
    "side table", "console", "loveseat", "sectional", "ottoman", "media",
    "entertainment", "tv unit", "fireplace", "accent chair", "wingback",
    "barrel chair", "lounge chair", "recliner", "wing chair",
  ],
  bedroom: [
    "bed", "nightstand", "dresser", "wardrobe", "headboard", "mattress",
    "vanity", "chest of drawers", "bedside",
  ],
  dining: [
    "dining table", "dining chair", "bar stool", "sideboard", "buffet",
    "hutch", "wine rack", "bistro", "dining bench", "rounded dining",
  ],
  office: [
    "desk", "office chair", "filing cabinet", "monitor stand", "keyboard tray",
    "conference",
  ],
  kitchen: [
    "kitchen island", "bar cart", "pantry", "kitchen shelf", "kitchen cabinet",
    "kitchen base", "kitchen wall", "kitchen cart", "kitchen corner",
    "kitchen sink", "fridge", "oven", "gas stove", "washing machine",
    "under-oven",
  ],
  bathroom: [
    "bathroom shelf", "mirror cabinet", "towel rack", "toilet", "bathtub",
  ],
  outdoor: [
    "garden", "patio", "hammock", "outdoor table", "bench", "planter",
  ],
  kids: [
    "bunk bed", "crib", "toy box", "kids desk", "changing table",
  ],
  storage: [
    "shelving unit", "storage cabinet", "coat rack", "shoe rack", "bookcase",
    "display shelf", "display cabinet", "shoe cabinet", "coat stand",
    "storage bed", "cabinet with", "tall cabinet", "wall cabinet",
    "open shelving", "corner cabinet",
  ],
};

function inferRoomFromName(name: string): string {
  const lower = name.toLowerCase();
  // Check longer phrases first to avoid partial matches
  for (const [room, keywords] of Object.entries(ROOM_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return room;
    }
  }
  return "living_room";
}

// ─── Subcategory inference by keyword matching ──────────

function inferSubcategoryFromName(name: string): string {
  const n = name.toLowerCase();
  if (/sofa|couch|armchair|chair|stool|bench|ottoman|lounge|seat/.test(n)) return "seating";
  if (/table|desk|counter|island|stand|nightstand/.test(n)) return "tables";
  if (/cabinet|shelf|wardrobe|dresser|storage|rack|bookcase|bookshelf/.test(n)) return "storage";
  if (/bed|mattress|bunk|crib/.test(n)) return "beds";
  if (/lamp|light|fan/.test(n)) return "lighting";
  if (/vanity|sink|mirror|bathroom/.test(n)) return "vanity";
  if (/fridge|stove|oven|microwave|washer|dryer|dishwasher|blender|coffee|toaster/.test(n)) return "appliances";
  if (/kitchen.*cabinet|upper.*cabinet|lower.*cabinet/.test(n)) return "cabinets";
  return "decor";
}

// ─── Unified display item ───────────────────────────────

interface LibraryDisplayItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  dims: { w: number; h: number; d: number };
  room: string;
  /** Set for panel-based templates */
  template?: LibraryTemplate;
  /** Set for Kenney GLB models */
  kenneyModel?: KenneyModel;
  isCommunity?: boolean;
  authorName?: string | null;
}

// Map Kenney categories to library categories for the tab bar
const KENNEY_TO_LIB_CATEGORY: Record<string, string> = {
  seating: "seating",
  tables: "tables",
  beds: "beds",
  storage: "cabinets",
  kitchen: "kitchen",
  bathroom: "bathroom",
  lighting: "seating",    // closest match — shows alongside living room items
  decor: "outdoor",       // plants & rugs
  electronics: "desks",   // monitors, keyboards go with desks
  appliances: "kitchen",  // fridges, washers
};

// Category icon lookup for Kenney models
const KENNEY_CATEGORY_ICON: Record<string, string> = {
  seating: "\u{1F6CB}\uFE0F",
  tables: "\u{1FA91}",
  beds: "\u{1F6CF}\uFE0F",
  storage: "\u{1F5C4}\uFE0F",
  kitchen: "\u{1F373}",
  bathroom: "\u{1F6BF}",
  lighting: "\u{1F4A1}",
  decor: "\u{1F33F}",
  electronics: "\u{1F5A5}\uFE0F",
  appliances: "\u{1F9CA}",
};

function kenneyToDisplayItem(km: KenneyModel): LibraryDisplayItem {
  return {
    id: `kenney-${km.id}`,
    name: km.name,
    category: KENNEY_TO_LIB_CATEGORY[km.category] ?? "cabinets",
    icon: KENNEY_CATEGORY_ICON[km.category] ?? "\u{1F4E6}",
    description: `3D model — ${km.category}`,
    dims: { w: 0, h: 0, d: 0 },
    room: km.room,
    kenneyModel: km,
  };
}

// ─── localStorage key ───────────────────────────────────

const ROOM_STORAGE_KEY = "dexo_library_room";

function getInitialRoom(): string {
  try {
    const stored = localStorage.getItem(ROOM_STORAGE_KEY);
    if (stored && ROOMS.some((r) => r.id === stored)) return stored;
  } catch {
    // ignore
  }
  return "all";
}

// ─── Component ──────────────────────────────────────────

interface LibraryBrowserProps {
  onSelectTemplate: (template: LibraryTemplate) => void;
  onAddGLB?: (name: string, glbPath: string) => void;
  onClose: () => void;
  communityTemplates?: CommunityTemplate[];
}

export function LibraryBrowser({ onSelectTemplate, onAddGLB, onClose, communityTemplates }: LibraryBrowserProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(LIBRARY_CATEGORIES[0].id);
  const [selectedRoom, setSelectedRoom] = useState<string>(getInitialRoom);
  const [typeFilter, setTypeFilter] = useState<'all' | 'editable' | 'model'>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');

  // Reset subcategory when room changes
  useEffect(() => {
    setSelectedSubcategory('all');
  }, [selectedRoom]);

  // Persist room selection
  useEffect(() => {
    try {
      localStorage.setItem(ROOM_STORAGE_KEY, selectedRoom);
    } catch {
      // ignore
    }
  }, [selectedRoom]);

  // Merge built-in templates, community templates, and Kenney models
  const allItems = useMemo(() => {
    // Built-in templates → display items
    const builtIn: LibraryDisplayItem[] = LIBRARY_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      icon: t.icon,
      description: t.description,
      dims: t.dims,
      room: inferRoomFromName(t.name),
      template: t,
    }));

    // Community templates → display items
    const community: LibraryDisplayItem[] = (communityTemplates ?? []).map((ct) => {
      const tpl: LibraryTemplate = {
        id: `community-${ct.id}`,
        name: ct.name,
        category: ct.category,
        icon: ct.icon,
        description: ct.description,
        dims: ct.dims,
        buildPanels: () =>
          panelsToWorldSpace(
            ct.group_data.panels,
            ct.group_data.position,
            ct.group_data.rotation ?? [0, 0, 0],
            ct.group_data.scale ?? [1, 1, 1],
          ),
      };
      return {
        id: tpl.id,
        name: tpl.name,
        category: tpl.category,
        icon: tpl.icon,
        description: tpl.description,
        dims: tpl.dims,
        room: inferRoomFromName(tpl.name),
        template: tpl,
        isCommunity: true,
        authorName: ct.author_name,
      };
    });

    // Kenney GLB models → display items
    const kenney: LibraryDisplayItem[] = KENNEY_MODELS.map(kenneyToDisplayItem);

    return [...builtIn, ...community, ...kenney];
  }, [communityTemplates]);

  // Filter by room first
  const roomFilteredItems = useMemo(() => {
    if (selectedRoom === "all") return allItems;
    return allItems.filter((item) => item.room === selectedRoom);
  }, [selectedRoom, allItems]);

  // Apply type filter after room filter
  const typeFilteredItems = useMemo(() => {
    if (typeFilter === 'all') return roomFilteredItems;
    if (typeFilter === 'editable') return roomFilteredItems.filter((item) => !item.kenneyModel);
    return roomFilteredItems.filter((item) => !!item.kenneyModel);
  }, [typeFilter, roomFilteredItems]);

  // Apply subcategory filter after type filter
  const subcategoryFilteredItems = useMemo(() => {
    if (selectedSubcategory === 'all') return typeFilteredItems;
    return typeFilteredItems.filter((item) =>
      inferSubcategoryFromName(item.name) === selectedSubcategory
    );
  }, [selectedSubcategory, typeFilteredItems]);

  // Subcategory item counts (based on typeFilteredItems so counts reflect room+type)
  const subcategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of typeFilteredItems) {
      const sub = inferSubcategoryFromName(item.name);
      counts[sub] = (counts[sub] || 0) + 1;
    }
    return counts;
  }, [typeFilteredItems]);

  // Room item count for the section label
  const roomItemCount = subcategoryFilteredItems.length;
  const activeRoom = ROOMS.find((r) => r.id === selectedRoom);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of subcategoryFilteredItems) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, [subcategoryFilteredItems]);

  // Auto-select first category with items when room changes
  useEffect(() => {
    const currentCount = categoryCounts[selectedCategory] || 0;
    if (currentCount === 0) {
      const firstCatWithItems = LIBRARY_CATEGORIES.find((cat) => (categoryCounts[cat.id] || 0) > 0);
      if (firstCatWithItems) {
        setSelectedCategory(firstCatWithItems.id);
      }
    }
  }, [categoryCounts, selectedCategory]);

  const filtered = useMemo(() => {
    if (!search.trim()) return subcategoryFilteredItems;
    const q = search.toLowerCase();
    return subcategoryFilteredItems.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search, subcategoryFilteredItems]);

  // When searching, auto-select the first category that has matches
  useEffect(() => {
    if (search && filtered.length > 0) {
      const firstCat = filtered[0].category;
      if (!filtered.some((t) => t.category === selectedCategory)) {
        setSelectedCategory(firstCat);
      }
    }
  }, [search, filtered, selectedCategory]);

  const displayTemplates = useMemo(() => {
    return filtered.filter((t) => t.category === selectedCategory);
  }, [filtered, selectedCategory]);

  const handleItemClick = (item: LibraryDisplayItem) => {
    if (item.kenneyModel && onAddGLB) {
      onAddGLB(item.kenneyModel.name, item.kenneyModel.path);
    } else if (item.template) {
      onSelectTemplate(item.template);
    }
  };

  return (
    <div className="w-full lg:w-72 min-w-0 max-w-full bg-[#1B2432] text-white flex flex-col shrink-0 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white/90 tracking-wide">
              Library
            </h2>
            <p className="text-[10px] text-white/30 mt-0.5">
              {allItems.length} items ({KENNEY_MODELS.length} 3D models)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Search templates & models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
          />
        </div>
      </div>

      {/* Type filter pills */}
      <div className="px-3 pb-0 shrink-0 min-w-0">
        <div className="flex gap-1.5 mb-2">
          {([
            { value: 'all' as const, label: 'All' },
            { value: 'editable' as const, label: '\u270F\uFE0F Editable only' },
            { value: 'model' as const, label: '\uD83D\uDCE6 Models only' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTypeFilter(opt.value)}
              className={`shrink-0 rounded-full px-2 py-1 text-xs whitespace-nowrap transition-colors ${
                typeFilter === opt.value
                  ? 'bg-[#1F2940] text-white'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room filter pills */}
      <div className="px-3 pb-2 shrink-0 min-w-0">
        <div
          className="scrollbar-hide flex gap-2 overflow-x-auto pb-2 flex-nowrap"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {ROOMS.map((room) => {
            const active = selectedRoom === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setSelectedRoom(room.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[#C96A3D] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {room.emoji} {room.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory filter pills */}
      {selectedRoom !== 'all' && activeRoom && activeRoom.subcategories.length > 0 && (
        <div className="px-3 pb-2 shrink-0 min-w-0">
          <div
            className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-1 flex-nowrap"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => setSelectedSubcategory('all')}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
                selectedSubcategory === 'all'
                  ? 'bg-[#C96A3D] text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              All
              <span className={`ml-1 text-[9px] ${selectedSubcategory === 'all' ? 'text-white/70' : 'text-white/25'}`}>
                {typeFilteredItems.length}
              </span>
            </button>
            {activeRoom.subcategories.map((sub) => {
              const count = subcategoryCounts[sub.id] || 0;
              const active = selectedSubcategory === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubcategory(sub.id)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#C96A3D] text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                  }`}
                >
                  {sub.label}
                  {count > 0 && (
                    <span className={`ml-1 text-[9px] ${active ? 'text-white/70' : 'text-white/25'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Room section label */}
      {activeRoom && (
        <div className="px-4 pb-1.5 shrink-0">
          <p className="text-xs text-gray-400">
            {activeRoom.emoji} {activeRoom.label} — {roomItemCount} items
          </p>
        </div>
      )}

      {/* Category tab bar */}
      <div className="px-3 pb-2 shrink-0 min-w-0">
        <div
          className="flex w-full min-w-0 gap-1.5 overflow-x-auto overflow-y-hidden pb-1 touch-pan-x overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.28)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 hover:[&::-webkit-scrollbar-thumb]:bg-white/40"
          role="tablist"
          aria-label="Template categories"
        >
          {LIBRARY_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-[#C87D5A] text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-[9px] ${active ? "text-white/70" : "text-white/25"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {roomItemCount === 0 && selectedRoom !== "all" ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/30">
            <p className="text-xs">
              No {activeRoom?.label} furniture yet
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {displayTemplates.map((item) => {
                const isKenney = !!item.kenneyModel;
                const isCommunity = item.isCommunity ?? false;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group/card relative flex flex-col items-start p-2.5 rounded-xl border transition-all duration-150 text-left min-h-[100px] ${
                      isKenney
                        ? "bg-[#1a2a1a]/40 border-emerald-500/20 hover:bg-emerald-900/20 hover:border-emerald-400/30"
                        : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15]"
                    }`}
                  >
                    {isKenney ? (
                      <span className="absolute top-1.5 left-1.5 bg-gray-100 text-gray-500 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                        title="This is a fixed 3D model — dimensions cannot be changed"
                      >
                        📦 Model
                      </span>
                    ) : (
                      <span className="absolute top-1.5 left-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                        title="You can customize dimensions, materials and parts"
                      >
                        ✏️ Editable
                      </span>
                    )}
                    <div className="flex items-start justify-between w-full mb-1 mt-4">
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex gap-1">
                        {isKenney && (
                          <span className="text-[8px] font-semibold uppercase tracking-wide text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded-full shrink-0">
                            3D
                          </span>
                        )}
                        {isCommunity && (
                          <span className="text-[8px] font-semibold uppercase tracking-wide text-[#C87D5A] bg-[#C87D5A]/15 px-1.5 py-0.5 rounded-full shrink-0">
                            Community
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-white/80 leading-tight group-hover/card:text-white transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-white/30 mt-0.5 leading-snug line-clamp-2">
                      {item.description}
                    </span>
                    {!isKenney && (
                      <span className="text-[9px] text-white/20 mt-1 font-mono">
                        {item.dims.w}x{item.dims.h}x{item.dims.d}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {displayTemplates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-white/30">
                <p className="text-xs">
                  No templates {search ? `match "${search}"` : "in this category"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
