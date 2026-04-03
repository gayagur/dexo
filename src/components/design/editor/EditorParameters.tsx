import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MATERIALS, type PanelData, type MaterialOption, type GroupData } from "@/lib/furnitureData";
import { loadSH3DCatalog, getSH3DTextureUrl, type SH3DTexture } from "@/lib/sh3dTextures";
import { Ruler, Palette, RotateCw, ChevronDown, ChevronRight, Search, MousePointerClick, ImagePlus, Circle } from "lucide-react";

// ─── Helper: adjust hex color brightness ─────────────────
function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Duvets / thin throws as cushion or box — no draped mesh until user converts */
function canOfferDrapedBlanketConversion(panel: PanelData): boolean {
  if (panel.shape === "draped") return false;
  if (panel.type !== "horizontal") return false;
  const th = panel.size[1];
  if (th > 0.18 || th <= 0) return false;
  const mat = MATERIALS.find((m) => m.id === panel.materialId);
  if (mat?.category !== "Fabric") return false;
  const L = panel.label.toLowerCase();
  if (/\b(rug|carpet|towel|curtain|doormat)\b/i.test(L)) return false;
  if (/\b(blanket|throw|duvet|comforter|runner|coverlet|quilt|bed\s*scarf|spread)\b/i.test(L)) return true;
  return th <= 0.07;
}

// ─── Material Swatch with 3D-style thumbnail ─────────────
function MaterialSwatch({ material, selected, onClick }: {
  material: MaterialOption;
  selected: boolean;
  onClick: () => void;
}) {
  const isWood = material.category === "Wood" || material.category === "Engineered";
  const isMetal = material.category === "Metal";
  const isFabric = material.category === "Fabric";
  const isGlass = material.category === "Glass";
  const isStone = material.category === "Stone";

  // Build a CSS gradient that suggests the material type
  let background = material.color;
  if (isWood) {
    const c = material.color;
    background = `repeating-linear-gradient(
      0deg,
      ${c} 0px, ${c} 3px,
      ${adjustBrightness(c, -15)} 3px, ${adjustBrightness(c, -15)} 4px,
      ${c} 4px, ${c} 6px,
      ${adjustBrightness(c, -8)} 6px, ${adjustBrightness(c, -8)} 7px
    )`;
  } else if (isMetal) {
    background = `linear-gradient(135deg, ${adjustBrightness(material.color, 30)} 0%, ${material.color} 40%, ${adjustBrightness(material.color, -15)} 60%, ${adjustBrightness(material.color, 20)} 100%)`;
  } else if (isGlass) {
    background = `linear-gradient(135deg, rgba(255,255,255,0.5) 0%, ${material.color}88 50%, rgba(255,255,255,0.3) 100%)`;
  } else if (isStone) {
    background = `radial-gradient(circle at 30% 30%, ${adjustBrightness(material.color, 10)} 0%, ${material.color} 50%, ${adjustBrightness(material.color, -10)} 100%)`;
  } else if (isFabric) {
    const c = material.color;
    background = `repeating-linear-gradient(
      45deg,
      ${c} 0px, ${c} 2px,
      ${adjustBrightness(c, -5)} 2px, ${adjustBrightness(c, -5)} 3px
    ), repeating-linear-gradient(
      -45deg,
      ${c} 0px, ${c} 2px,
      ${adjustBrightness(c, -5)} 2px, ${adjustBrightness(c, -5)} 3px
    )`;
  }

  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-lg border-2 transition-all relative overflow-hidden group ${
        selected
          ? "border-[#C87D5A] ring-2 ring-[#C87D5A]/20 scale-110"
          : "border-gray-200 hover:border-gray-400 hover:scale-105"
      }`}
      style={{ background }}
      title={material.label}
    >
      {/* Sphere highlight overlay for 3D effect */}
      <div
        className="absolute inset-0 rounded-lg opacity-30"
        style={{
          background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6) 0%, transparent 60%)",
        }}
      />
      {/* Label on hover */}
      <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[7px] font-medium text-white bg-black/60 px-1 rounded-t leading-tight">
          {material.label}
        </span>
      </div>
    </button>
  );
}

// ─── SH3D Texture Thumbnail ────────────────────────────────
function SH3DTextureSwatch({ texture, selected, onClick }: {
  texture: SH3DTexture;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={texture.name}
      className={`w-10 h-10 rounded-lg border-2 transition-all relative overflow-hidden group ${
        selected
          ? "border-[#C87D5A] ring-2 ring-[#C87D5A]/30 scale-110"
          : "border-gray-200 hover:border-gray-400 hover:scale-105"
      }`}
    >
      <img
        src={getSH3DTextureUrl(texture.file)}
        alt={texture.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[6px] text-white truncate px-0.5 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
        {texture.name}
      </div>
    </button>
  );
}

// ─── Recent Colors helpers ────────────────────────────────
const RECENT_COLORS_KEY = "dexo_recent_colors";
const MAX_RECENT = 8;

function loadRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveRecentColor(color: string) {
  try {
    const existing = loadRecentColors();
    const updated = [color, ...existing.filter(c => c !== color)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
    return updated;
  } catch { return [color]; }
}

// ─── Recent Materials helpers ─────────────────────────────
const RECENT_MATERIALS_KEY = "dexo_recent_materials";
const MAX_RECENT_MATERIALS = 8;

function loadRecentMaterials(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_MATERIALS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveRecentMaterial(materialId: string) {
  try {
    const existing = loadRecentMaterials();
    const updated = [materialId, ...existing.filter(m => m !== materialId)].slice(0, MAX_RECENT_MATERIALS);
    localStorage.setItem(RECENT_MATERIALS_KEY, JSON.stringify(updated));
    return updated;
  } catch { return [materialId]; }
}

// ─── Surface Types ────────────────────────────────────────
const SURFACE_TYPES = [
  { id: "matte", label: "Flat/Matte", icon: "🎨", roughness: 1.0, metalness: 0 },
  { id: "wood", label: "Wood", icon: "🪵", roughness: 0.7, metalness: 0 },
  { id: "metal", label: "Metal", icon: "🔩", roughness: 0.2, metalness: 1.0 },
  { id: "fabric", label: "Fabric", icon: "🧵", roughness: 0.9, metalness: 0 },
  { id: "glass", label: "Glass", icon: "🪟", roughness: 0.05, metalness: 0.1 },
  { id: "stone", label: "Stone", icon: "🪨", roughness: 0.8, metalness: 0 },
] as const;

type SurfaceTypeId = typeof SURFACE_TYPES[number]["id"];

// ─── Material Picker with search & collapsible categories ──
const SH3D_CATEGORY_LABELS: Record<string, string> = {
  fabric: "Fabric & Carpet",
  floor: "Floor & Tile",
  wall: "Wall & Brick",
  wood: "Wood Grain",
  misc: "Stone & Other",
};

function MaterialPickerSection({
  selectedMaterialId,
  onSelectMaterial,
  onSelectSH3DTexture,
  onCustomColor,
  customColor,
  onUploadTexture,
  onSurfaceType,
  currentSurfaceType,
  label = "Material",
}: {
  selectedMaterialId: string;
  onSelectMaterial: (materialId: string) => void;
  onSelectSH3DTexture?: (textureId: string) => void;
  onCustomColor?: (color: string) => void;
  customColor?: string;
  onUploadTexture?: (textureUrl: string) => void;
  onSurfaceType?: (surfaceType: string) => void;
  currentSurfaceType?: string;
  label?: string;
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sh3dTextures, setSh3dTextures] = useState<SH3DTexture[]>([]);
  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);
  const [recentMaterialIds, setRecentMaterialIds] = useState<string[]>(loadRecentMaterials);
  const [myTextures, setMyTextures] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("dexo_recent_textures") || "[]"); } catch { return []; }
  });
  const matCategories = [...new Set(MATERIALS.map((m) => m.category))];

  // Load SH3D catalog on mount
  useEffect(() => {
    loadSH3DCatalog().then(setSh3dTextures);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return MATERIALS;
    const q = search.toLowerCase();
    return MATERIALS.filter(
      (m) => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredSH3D = useMemo(() => {
    if (!search.trim()) return sh3dTextures;
    const q = search.toLowerCase();
    return sh3dTextures.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [search, sh3dTextures]);

  const filteredCategories = useMemo(() => {
    const cats = new Set(filtered.map((m) => m.category));
    return matCategories.filter((c) => cats.has(c));
  }, [filtered, matCategories]);

  const sh3dCategories = useMemo(() => {
    const cats = new Set(filteredSH3D.map((t) => t.category));
    return [...cats];
  }, [filteredSH3D]);

  const hasResults = filteredCategories.length > 0 || sh3dCategories.length > 0;

  const handleSelectMaterial = (id: string) => {
    onSelectMaterial(id);
    setRecentMaterialIds(saveRecentMaterial(id));
  };

  return (
    <div>
      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Recent</p>
          <div className="flex gap-1.5 flex-wrap">
            {recentColors.map((color, i) => (
              <button
                key={`${color}-${i}`}
                onClick={() => onCustomColor?.(color)}
                className="w-6 h-6 rounded-full border-2 border-gray-200 hover:border-[#C87D5A] transition-colors cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Materials */}
      {recentMaterialIds.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Recent Materials</p>
          <div className="flex gap-1.5 flex-wrap">
            {recentMaterialIds.map((id) => {
              const m = MATERIALS.find(mat => mat.id === id);
              if (!m) return null;
              return (
                <MaterialSwatch
                  key={`recent-${m.id}`}
                  material={m}
                  selected={m.id === selectedMaterialId}
                  onClick={() => handleSelectMaterial(m.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
        <input
          type="text"
          placeholder="Search materials & textures..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-7 pl-7 pr-2 rounded-md bg-gray-50 border border-gray-200 text-[11px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-gray-300"
        />
      </div>

      {/* PBR Materials (collapsible categories) */}
      {filteredCategories.length > 0 && (
        <p className="text-[9px] text-[#C87D5A] font-semibold uppercase tracking-widest mb-1.5">PBR Materials</p>
      )}
      {filteredCategories.map((cat) => {
        const key = `pbr_${cat}`;
        const isCollapsed = collapsed[key] ?? false;
        const catMaterials = filtered.filter((m) => m.category === cat);

        return (
          <div key={key} className="mb-2">
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [key]: !p[key] }))}
              className="flex items-center gap-1.5 w-full text-left mb-1.5 group"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              )}
              <span className="text-[11px] text-gray-400 uppercase tracking-wider group-hover:text-gray-600">
                {cat}
              </span>
              <span className="text-[8px] bg-amber-100 text-amber-700 rounded px-1 ml-1">PBR</span>
              <span className="text-[9px] text-gray-300 ml-auto">{catMaterials.length}</span>
            </button>
            {!isCollapsed && (
              <div className="flex flex-wrap gap-1.5 ml-4">
                {catMaterials.map((m) => (
                  <MaterialSwatch
                    key={m.id}
                    material={m}
                    selected={m.id === selectedMaterialId}
                    onClick={() => handleSelectMaterial(m.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* SH3D Textures */}
      {sh3dCategories.length > 0 && (
        <p className="text-[9px] text-blue-500 font-semibold uppercase tracking-widest mb-1.5 mt-3 pt-2 border-t border-gray-100">
          Textures ({filteredSH3D.length})
        </p>
      )}
      {sh3dCategories.map((cat) => {
        const key = `sh3d_${cat}`;
        const isCollapsed = collapsed[key] ?? true; // SH3D collapsed by default
        const catTextures = filteredSH3D.filter((t) => t.category === cat);

        return (
          <div key={key} className="mb-2">
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [key]: !p[key] }))}
              className="flex items-center gap-1.5 w-full text-left mb-1.5 group"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              )}
              <span className="text-[11px] text-gray-400 uppercase tracking-wider group-hover:text-gray-600">
                {SH3D_CATEGORY_LABELS[cat] || cat}
              </span>
              <span className="text-[9px] text-gray-300 ml-auto">{catTextures.length}</span>
            </button>
            {!isCollapsed && (
              <div className="flex flex-wrap gap-1.5 ml-4">
                {catTextures.map((t) => (
                  <SH3DTextureSwatch
                    key={t.id}
                    texture={t}
                    selected={t.id === selectedMaterialId}
                    onClick={() => onSelectSH3DTexture ? onSelectSH3DTexture(t.id) : onSelectMaterial(t.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!hasResults && search && (
        <p className="text-[10px] text-gray-400 text-center py-3">No materials match "{search}"</p>
      )}

      {/* Custom color */}
      {onCustomColor && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Custom Color</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customColor ?? MATERIALS.find((m) => m.id === selectedMaterialId)?.color ?? "#C4A265"}
              onChange={(e) => {
                onCustomColor(e.target.value);
                // Save to recent with debounce (color pickers fire many events)
                clearTimeout((window as any).__recentColorTimer);
                (window as any).__recentColorTimer = setTimeout(() => {
                  setRecentColors(saveRecentColor(e.target.value));
                }, 300);
              }}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
              style={{ padding: 0 }}
            />
            <span className="text-[10px] text-gray-400">Pick any color</span>
          </div>
        </div>
      )}

      {/* Upload Texture */}
      {onUploadTexture && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Upload Texture</p>
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-[#C87D5A] hover:bg-[#C87D5A]/5 cursor-pointer transition-colors">
            <ImagePlus className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Choose image...</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const { supabase } = await import("@/lib/supabase");
                  const { data: { user: currentUser } } = await supabase.auth.getUser();
                  const uid = currentUser?.id ?? "anon";
                  const ext = file.name.split(".").pop() || "jpg";
                  const path = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                  const { error } = await supabase.storage.from("project-images").upload(path, file);
                  if (error) { console.error("Upload failed:", error); return; }
                  const { data: urlData } = supabase.storage.from("project-images").getPublicUrl(path);
                  if (urlData?.publicUrl) {
                    onUploadTexture(urlData.publicUrl);
                    try {
                      const key = "dexo_recent_textures";
                      const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]");
                      const updated = [urlData.publicUrl, ...existing.filter(u => u !== urlData.publicUrl)].slice(0, 6);
                      localStorage.setItem(key, JSON.stringify(updated));
                      setMyTextures(updated);
                    } catch {}
                  }
                } catch (err) {
                  console.error("Texture upload error:", err);
                }
                e.target.value = "";
              }}
            />
          </label>
          {/* My Textures — previously uploaded */}
          {myTextures.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-400 mb-1">My Textures</p>
              <div className="flex gap-1.5 flex-wrap">
                {myTextures.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => onUploadTexture(url)}
                    className="w-10 h-10 rounded-lg border border-gray-200 hover:border-[#C87D5A] overflow-hidden transition-colors"
                    title="Apply this texture"
                  >
                    <img src={url} alt="texture" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Surface Type selector — always visible when prop provided */}
      {onSurfaceType && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Surface Type</p>
          <div className="flex flex-wrap gap-1">
            {SURFACE_TYPES.map((st) => (
              <button
                key={st.id}
                onClick={() => onSurfaceType(st.id)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  (currentSurfaceType ?? "matte") === st.id
                    ? "bg-[#C87D5A]/10 text-[#C87D5A] border border-[#C87D5A]/30"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                }`}
                title={`Roughness: ${st.roughness}, Metalness: ${st.metalness}`}
              >
                {st.icon} {st.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────
function CollapsibleSection({ label, icon, defaultOpen = false, children }: {
  label: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

interface EditorParametersProps {
  panel: PanelData | null;
  selectedGroup: GroupData | null;
  overallDims: { w: number; h: number; d: number };
  showOverallDims: boolean;
  editingGroupId: string | null;
  onUpdatePanel: (id: string, updates: Partial<PanelData>) => void;
  onUpdateGroup: (groupId: string, updates: Partial<GroupData>) => void;
  onScaleGroup: (groupId: string, scaleX: number, scaleY: number, scaleZ: number) => void;
  onUpdateGroupMaterial: (groupId: string, materialId: string) => void;
  onCustomGroupColor: (groupId: string, color: string) => void;
  onUpdateGroupTexture?: (groupId: string, textureUrl: string) => void;
  onUpdateGroupSurfaceType?: (groupId: string, surfaceType: string) => void;
  onUpdateDims: (dims: { w: number; h: number; d: number }) => void;
  style: string;
  onStyleChange: (style: string) => void;
  multiSelectCount: number;
  /** Cycle smart blanket/pillow placement preset (bed/sofa). */
  onCycleSoftDecorVariant?: (panelId: string) => void;
}

export function EditorParameters({
  panel,
  selectedGroup,
  overallDims,
  showOverallDims,
  editingGroupId,
  onUpdatePanel,
  onUpdateGroup,
  onScaleGroup,
  onUpdateGroupMaterial,
  onCustomGroupColor,
  onUpdateGroupTexture,
  onUpdateGroupSurfaceType,
  onUpdateDims,
  style,
  onStyleChange,
  multiSelectCount,
  onCycleSoftDecorVariant,
}: EditorParametersProps) {
  // Shared SH3D texture cache for both group and panel material pickers
  const [sh3dTextures, setSh3dTextures] = useState<SH3DTexture[]>([]);
  const sh3dTexturesRef = { current: sh3dTextures };
  useEffect(() => { loadSH3DCatalog().then(setSh3dTextures); }, []);

  const renderGroupProperties = () => {
    if (!selectedGroup) return null;

    // Compute group bounding box size from panels
    const panels = selectedGroup.panels;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of panels) {
      const [px, py, pz] = p.position;
      const [sx, sy, sz] = p.size;
      minX = Math.min(minX, px - sx / 2); maxX = Math.max(maxX, px + sx / 2);
      minY = Math.min(minY, py - sy / 2); maxY = Math.max(maxY, py + sy / 2);
      minZ = Math.min(minZ, pz - sz / 2); maxZ = Math.max(maxZ, pz + sz / 2);
    }
    const groupSize = panels.length > 0
      ? [maxX - minX, maxY - minY, maxZ - minZ]
      : [0, 0, 0];

    // Find most common material in the group
    const matCounts: Record<string, number> = {};
    for (const p of panels) {
      matCounts[p.materialId] = (matCounts[p.materialId] || 0) + 1;
    }
    const dominantMaterial = Object.entries(matCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "oak";

    return (
      <>
        {/* Group name header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            value={selectedGroup.name}
            onChange={(e) => onUpdateGroup(selectedGroup.id, { name: e.target.value })}
            className="text-sm font-semibold text-gray-900 w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#C87D5A] focus:outline-none pb-0.5 transition-colors"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            {selectedGroup.panels.length} panels
          </p>
        </div>

        {/* Material (open by default) */}
        <CollapsibleSection
          label="Material"
          icon={<Palette className="w-3.5 h-3.5 text-gray-400" />}
          defaultOpen={true}
        >
          <MaterialPickerSection
            selectedMaterialId={dominantMaterial}
            onSelectMaterial={(id) => onUpdateGroupMaterial(selectedGroup.id, id)}
            onSelectSH3DTexture={(texId) => {
              const tex = sh3dTexturesRef.current.find(t => t.id === texId);
              if (tex && onUpdateGroupTexture) onUpdateGroupTexture(selectedGroup.id, getSH3DTextureUrl(tex.file));
            }}
            onCustomColor={(color) => onCustomGroupColor(selectedGroup.id, color)}
            customColor={selectedGroup.panels[0]?.customColor ?? MATERIALS.find((m) => m.id === dominantMaterial)?.color}
            label="Material (All)"
            onUploadTexture={onUpdateGroupTexture ? (url) => onUpdateGroupTexture(selectedGroup.id, url) : undefined}
            onSurfaceType={(type) => onUpdateGroupSurfaceType?.(selectedGroup.id, type)}
            currentSurfaceType={(selectedGroup.panels[0] as any)?.surfaceType}
          />
        </CollapsibleSection>

        {/* Scale (collapsed by default) */}
        <CollapsibleSection
          label="Scale"
          icon={<Ruler className="w-3.5 h-3.5 text-gray-400" />}
          defaultOpen={false}
        >
          <div className="grid grid-cols-3 gap-2 mt-1">
            {(["W", "H", "D"] as const).map((axis, i) => (
              <div key={axis}>
                <Label className="text-[11px] text-gray-500">{axis}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={10}
                    inputMode="decimal"
                    value={Math.round(groupSize[i] * 1000)}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value) || 0;
                      if (newVal < 10 || groupSize[i] === 0) return;
                      const oldVal = groupSize[i] * 1000;
                      const scale = newVal / oldVal;
                      const scales: [number, number, number] = [1, 1, 1];
                      scales[i] = scale;
                      onScaleGroup(selectedGroup.id, scales[0], scales[1], scales[2]);
                    }}
                    className="h-8 text-base lg:text-xs pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    mm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </>
    );
  };

  const renderPanelProperties = () => {
    if (!panel) return null;

    const showCornerRadius =
      !panel.shape ||
      panel.shape === "box" ||
      panel.shape === "rounded_rect" ||
      panel.shape === "cushion" ||
      panel.shape === "mattress";

    return (
      <>
        {/* Element name header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={panel.label}
              onChange={(e) => onUpdatePanel(panel.id, { label: e.target.value })}
              className="text-sm font-semibold text-gray-900 flex-1 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#C87D5A] focus:outline-none pb-0.5 transition-colors"
            />
            {panel.shape && panel.shape !== "box" && (
              <span className="text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 capitalize whitespace-nowrap">
                {panel.shape.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {panel.softDecor && onCycleSoftDecorVariant && (
          <div className="px-4 py-2.5 border-b border-gray-100 bg-amber-50/40">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Smart placement</p>
            <button
              type="button"
              onClick={() => onCycleSoftDecorVariant(panel.id)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-amber-200/80 bg-white text-xs font-medium text-gray-800 hover:bg-amber-50/80 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#C87D5A]" />
              Next variant
            </button>
            <p className="text-[9px] text-gray-400 mt-1.5 leading-snug">
              {panel.softDecor.variantId.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Material (open by default) */}
        <CollapsibleSection
          label="Material"
          icon={<Palette className="w-3.5 h-3.5 text-gray-400" />}
          defaultOpen={true}
        >
          <MaterialPickerSection
            selectedMaterialId={panel.materialId}
            onSelectMaterial={(id) => onUpdatePanel(panel.id, { materialId: id, customColor: undefined, textureUrl: undefined })}
            onSelectSH3DTexture={(texId) => {
              const tex = sh3dTexturesRef.current.find(t => t.id === texId);
              if (tex) onUpdatePanel(panel.id, { textureUrl: getSH3DTextureUrl(tex.file), customColor: undefined });
            }}
            onCustomColor={(color) => onUpdatePanel(panel.id, { customColor: color, textureUrl: undefined })}
            customColor={panel.customColor}
            onUploadTexture={(url) => onUpdatePanel(panel.id, { textureUrl: url })}
            onSurfaceType={(type) => onUpdatePanel(panel.id, { surfaceType: type } as any)}
            currentSurfaceType={(panel as any).surfaceType}
          />
        </CollapsibleSection>

        {/* Corner radius — own section, open by default (was hidden inside closed Size) */}
        {showCornerRadius && (
          <CollapsibleSection
            label="Corner radius"
            icon={<Circle className="w-3.5 h-3.5 text-gray-400" />}
            defaultOpen={true}
          >
            <div className="mt-1">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[11px] text-gray-500">Roundness</Label>
                <span className="text-[10px] text-gray-400 font-mono">
                  {Math.round((panel.cornerRadius ?? 0.002) * 1000)} mm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={Math.round((panel.cornerRadius ?? 0.002) * 1000)}
                onChange={(e) => {
                  const mm = parseInt(e.target.value, 10);
                  const r = mm / 1000;
                  if (panel.shape === "rounded_rect") {
                    onUpdatePanel(panel.id, {
                      cornerRadius: r,
                      shapeParams: { ...(panel.shapeParams ?? {}), cornerRadius: r },
                    });
                  } else {
                    onUpdatePanel(panel.id, { cornerRadius: r });
                  }
                }}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C87D5A]"
              />
              <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                <span>Sharp</span>
                <span>Round</span>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Offer draped shape for duvets / flat fabric labeled as blanket */}
        {canOfferDrapedBlanketConversion(panel) && (
          <CollapsibleSection
            label="Blanket folds"
            icon={<span className="text-[11px]">〰️</span>}
            defaultOpen={true}
          >
            <p className="text-[10px] text-gray-500 leading-relaxed mb-2">
              This piece uses the <span className="font-medium text-gray-600">{panel.shape ?? "box"}</span> shape. Switch to{" "}
              <span className="font-medium text-gray-600">draped</span> fabric to add pinch folds, wrinkles, and draggable
              controls in the viewport.
            </p>
            <button
              type="button"
              onClick={() =>
                onUpdatePanel(panel.id, {
                  shape: "draped",
                  shapeParams: {
                    ...(panel.shapeParams ?? {}),
                    softness:
                      panel.shapeParams?.softness ??
                      (panel.shape === "cushion" || panel.shape === "cushion_firm" ? 0.55 : 0.62),
                    foldSpread: panel.shapeParams?.foldSpread ?? 0.14,
                  },
                })
              }
              className="w-full h-8 rounded-lg bg-[#C87D5A] hover:bg-[#B06B4A] text-white text-[11px] font-medium transition-colors"
            >
              Switch to draped blanket
            </button>
          </CollapsibleSection>
        )}

        {/* Draped blanket / throw — folds */}
        {panel.shape === "draped" && (
          <CollapsibleSection
            label="Blanket folds"
            icon={<span className="text-[11px]">〰️</span>}
            defaultOpen={true}
          >
            <p className="text-[10px] text-gray-500 leading-relaxed mb-2">
              Double-click the fabric to add a pinch. Drag the gold handles (camera orbit pauses while dragging); hold{" "}
              <kbd className="px-1 py-0.5 rounded bg-gray-100 text-[9px]">Shift</kbd> to adjust fold depth.
            </p>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const pts = panel.drapedControlPoints ?? [];
                  if (pts.length >= 16) return;
                  onUpdatePanel(panel.id, {
                    drapedControlPoints: [...pts, { u: 0.5, v: 0.5, lift: 0.04 }],
                  });
                }}
                className="w-full h-8 rounded-lg bg-[#C87D5A]/15 hover:bg-[#C87D5A]/25 text-[11px] font-medium text-[#8b5a3c] transition-colors"
              >
                Add fold at center
              </button>
              <button
                type="button"
                onClick={() => onUpdatePanel(panel.id, { drapedControlPoints: [] })}
                className="w-full h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-[11px] font-medium text-gray-600 transition-colors"
              >
                Clear hand-placed folds
              </button>
            </div>
            {(panel.drapedControlPoints?.length ?? 0) > 0 && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-0.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Pinches</p>
                <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_auto] gap-1.5 text-[9px] text-gray-400 px-0.5">
                  <span />
                  <span>U</span>
                  <span>V</span>
                  <span>Lift</span>
                  <span />
                </div>
                {(panel.drapedControlPoints ?? []).map((pt, i) => (
                  <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_1fr_auto] gap-1.5 items-center text-[10px]">
                    <span className="text-gray-400">#{i + 1}</span>
                    <Input
                      type="number"
                      step={0.05}
                      min={0}
                      max={1}
                      className="h-7 text-[10px]"
                      title="U"
                      value={pt.u}
                      onChange={(e) => {
                        const u = Math.min(1, Math.max(0, parseFloat(e.target.value) || 0));
                        const next = (panel.drapedControlPoints ?? []).map((p, j) =>
                          j === i ? { ...p, u } : p,
                        );
                        onUpdatePanel(panel.id, { drapedControlPoints: next });
                      }}
                    />
                    <Input
                      type="number"
                      step={0.05}
                      min={0}
                      max={1}
                      className="h-7 text-[10px]"
                      title="V"
                      value={pt.v}
                      onChange={(e) => {
                        const v = Math.min(1, Math.max(0, parseFloat(e.target.value) || 0));
                        const next = (panel.drapedControlPoints ?? []).map((p, j) =>
                          j === i ? { ...p, v } : p,
                        );
                        onUpdatePanel(panel.id, { drapedControlPoints: next });
                      }}
                    />
                    <Input
                      type="number"
                      step={1}
                      className="h-7 text-[10px]"
                      title="Lift mm"
                      value={Math.round(pt.lift * 1000)}
                      onChange={(e) => {
                        const lift = Math.min(140, Math.max(-120, (parseInt(e.target.value, 10) || 0) / 1000));
                        const next = (panel.drapedControlPoints ?? []).map((p, j) =>
                          j === i ? { ...p, lift } : p,
                        );
                        onUpdatePanel(panel.id, { drapedControlPoints: next });
                      }}
                    />
                    <button
                      type="button"
                      className="h-7 rounded bg-red-50 text-red-600 text-[10px] hover:bg-red-100 px-1"
                      onClick={() => {
                        const next = (panel.drapedControlPoints ?? []).filter((_, j) => j !== i);
                        onUpdatePanel(panel.id, { drapedControlPoints: next });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[11px] text-gray-500">Fold spread</Label>
                <span className="text-[10px] text-gray-400 font-mono">
                  {Math.round((panel.shapeParams?.foldSpread ?? 0.14) * 1000)} mm
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={280}
                step={5}
                value={Math.round((panel.shapeParams?.foldSpread ?? 0.14) * 1000)}
                onChange={(e) => {
                  const foldSpread = parseInt(e.target.value, 10) / 1000;
                  onUpdatePanel(panel.id, {
                    shapeParams: { ...(panel.shapeParams ?? {}), foldSpread },
                  });
                }}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C87D5A]"
              />
              <p className="text-[9px] text-gray-400 mt-1">Wider = softer, narrower hill for each pinch</p>
            </div>
          </CollapsibleSection>
        )}

        {/* Softness slider — available on all panels */}
        <CollapsibleSection
          label="Softness"
          icon={<span className="text-[11px]">🧸</span>}
          defaultOpen={false}
        >
          <div className="mt-1">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[11px] text-gray-500">Surface softness</Label>
              <span className="text-[10px] text-gray-400 font-mono">
                {Math.round((panel.shapeParams?.softness ?? (panel.shape === "cushion" ? 0.85 : panel.shape === "cushion_firm" ? 0.35 : panel.shape === "padded_block" ? 0.18 : panel.shape === "draped" ? 0.62 : 0)) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round((panel.shapeParams?.softness ?? (panel.shape === "cushion" ? 0.85 : panel.shape === "cushion_firm" ? 0.35 : panel.shape === "padded_block" ? 0.18 : panel.shape === "draped" ? 0.62 : 0)) * 100)}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) / 100;
                // When softness > 0 on a plain box, convert to cushion_firm for deformation
                const currentShape = panel.shape ?? "box";
                const needsShapeUpgrade = val > 0 && (currentShape === "box" || currentShape === "rounded_rect");
                onUpdatePanel(panel.id, {
                  ...(needsShapeUpgrade ? { shape: "cushion_firm" as any } : {}),
                  shapeParams: { ...(panel.shapeParams ?? {}), softness: val },
                });
              }}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C87D5A]"
            />
            <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
              <span>Firm</span>
              <span>Plush</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Size (collapsed by default) */}
        <CollapsibleSection
          label="Size"
          icon={<Ruler className="w-3.5 h-3.5 text-gray-400" />}
          defaultOpen={false}
        >
          <div className="grid grid-cols-3 gap-2 mt-1">
            {(["w", "h", "d"] as const).map((axis, i) => (
              <div key={axis}>
                <Label className="text-[11px] text-gray-500 uppercase">
                  {axis === "w" ? "W" : axis === "h" ? "H" : "D"}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={Math.round(panel.size[i] * 1000)}
                    onChange={(e) => {
                      const newSize = [...panel.size] as [number, number, number];
                      newSize[i] = (parseInt(e.target.value) || 0) / 1000;
                      onUpdatePanel(panel.id, { size: newSize });
                    }}
                    className="h-8 text-base lg:text-xs pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    mm
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Shape Parameters (if applicable) */}
          {panel.shapeParams && Object.keys(panel.shapeParams).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Shape Parameters</p>
              <div className="space-y-2">
                {Object.entries(panel.shapeParams).map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
                  const isAngle = key.toLowerCase().includes("angle");
                  const isRatio = key.toLowerCase().includes("ratio");
                  return (
                    <div key={key}>
                      <Label className="text-[11px] text-gray-500">{label}</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step={isAngle ? "5" : isRatio ? "0.05" : "1"}
                          value={isAngle ? value : isRatio ? value : Math.round(value * 1000)}
                          onChange={(e) => {
                            const raw = parseFloat(e.target.value) || 0;
                            const newVal = isAngle ? raw : isRatio ? raw : raw / 1000;
                            onUpdatePanel(panel.id, {
                              shapeParams: { ...panel.shapeParams, [key]: newVal },
                            });
                          }}
                          className="h-8 text-base lg:text-xs pr-8"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                          {isAngle ? "°" : isRatio ? "" : "mm"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* Position (collapsed by default) */}
        <CollapsibleSection
          label="Position"
          icon={<Ruler className="w-3.5 h-3.5 text-gray-400" />}
          defaultOpen={false}
        >
          <div className="grid grid-cols-3 gap-2 mt-1">
            {(["X", "Y", "Z"] as const).map((axis, i) => (
              <div key={axis}>
                <Label className="text-[11px] text-gray-500">{axis}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="10"
                    value={Math.round(panel.position[i] * 1000)}
                    onChange={(e) => {
                      const newPos = [...panel.position] as [number, number, number];
                      newPos[i] = (parseInt(e.target.value) || 0) / 1000;
                      onUpdatePanel(panel.id, { position: newPos });
                    }}
                    className="h-8 text-base lg:text-xs pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    mm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Rotation (collapsed by default) */}
        <CollapsibleSection
          label="Rotation"
          icon={<RotateCw className="w-3.5 h-3.5 text-gray-400" />}
          defaultOpen={false}
        >
          <div className="grid grid-cols-3 gap-2 mt-1 mb-3">
            {(["X", "Y", "Z"] as const).map((axis, i) => {
              const rot = panel.rotation ?? [0, 0, 0];
              return (
                <div key={`rot-${axis}`}>
                  <Label className="text-[11px] text-gray-500">{axis}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="15"
                      value={Math.round((rot[i] * 180) / Math.PI)}
                      onChange={(e) => {
                        const newRot = [...rot] as [number, number, number];
                        newRot[i] = ((parseInt(e.target.value) || 0) * Math.PI) / 180;
                        onUpdatePanel(panel.id, { rotation: newRot });
                      }}
                      className="h-8 text-base lg:text-xs pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      °
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick rotate buttons */}
          <p className="text-[10px] text-gray-400 mb-1.5">Quick Rotate</p>
          <div className="flex flex-wrap gap-1.5">
            {(["X", "Y", "Z"] as const).map((axis, i) => (
              <button
                key={`qr-${axis}`}
                onClick={() => {
                  const rot = [...(panel.rotation ?? [0, 0, 0])] as [number, number, number];
                  rot[i] += Math.PI / 2; // +90°
                  onUpdatePanel(panel.id, { rotation: rot });
                }}
                className="h-7 px-2.5 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] font-medium text-gray-600 transition-colors flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" />
                {axis} +90°
              </button>
            ))}
            <button
              onClick={() => {
                onUpdatePanel(panel.id, { rotation: [0, 0, 0] });
              }}
              className="h-7 px-2.5 rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-500 text-[11px] font-medium text-gray-500 transition-colors"
            >
              Reset
            </button>
          </div>
        </CollapsibleSection>
      </>
    );
  };

  const renderContent = () => {
    // Priority 1: Multi-select indicator
    if (multiSelectCount > 0) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-gray-400 text-center">
            {multiSelectCount} panels selected. Right-click to group.
          </p>
        </div>
      );
    }

    // Priority 2: Group properties (scene mode with group selected)
    if (selectedGroup && !editingGroupId) {
      return renderGroupProperties();
    }

    // Priority 3: Panel properties
    if (panel) {
      return renderPanelProperties();
    }

    // Priority 4: Empty state
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <MousePointerClick className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">Click an object to edit</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Select any element in the viewport or sidebar to change its material, size, and position.
        </p>
      </div>
    );
  };

  return (
    <div className="w-72 shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto">
      {renderContent()}
    </div>
  );
}
