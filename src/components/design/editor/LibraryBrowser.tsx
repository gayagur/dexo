import { useState, useMemo, useCallback } from "react";
import { Search, X, Loader2, Box, Package } from "lucide-react";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_TEMPLATES,
  type LibraryTemplate,
} from "@/lib/libraryData";
import {
  KENNEY_CATEGORIES,
  KENNEY_MODELS,
  type KenneyModel,
} from "@/lib/kenneyModels";
import type { GroupData } from "@/lib/furnitureData";

type Tab = "build" | "quickadd";

interface LibraryBrowserProps {
  onSelectTemplate: (template: LibraryTemplate) => void;
  onImportModel?: (group: GroupData) => void;
  onClose: () => void;
}

export function LibraryBrowser({ onSelectTemplate, onImportModel, onClose }: LibraryBrowserProps) {
  const [tab, setTab] = useState<Tab>("build");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);

  // ── Build tab ──────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of LIBRARY_TEMPLATES) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredTemplates = useMemo(() => {
    let list = LIBRARY_TEMPLATES;
    if (activeCategory) {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeCategory]);

  // ── Quick Add tab ──────────────────────
  const kenneyCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of KENNEY_MODELS) {
      counts[m.category] = (counts[m.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredModels = useMemo(() => {
    let list = KENNEY_MODELS;
    if (activeCategory) {
      list = list.filter((m) => m.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [search, activeCategory]);

  const handleImportModel = useCallback(async (model: KenneyModel) => {
    if (!onImportModel || loadingModel) return;
    setLoadingModel(model.id);
    try {
      // Dynamic import to avoid loading GLTFLoader unless needed
      const { loadGLBAsGroup } = await import("@/lib/glbLoader");
      const group = await loadGLBAsGroup(model.path, model.name);
      onImportModel(group);
    } catch (err) {
      console.error("Failed to import model:", err);
    } finally {
      setLoadingModel(null);
    }
  }, [onImportModel, loadingModel]);

  // Reset category when switching tabs
  const handleTabSwitch = (newTab: Tab) => {
    setTab(newTab);
    setActiveCategory(null);
    setSearch("");
  };

  const categories = tab === "build" ? LIBRARY_CATEGORIES : KENNEY_CATEGORIES;
  const counts = tab === "build" ? categoryCounts : kenneyCategoryCounts;
  const totalCount = tab === "build" ? LIBRARY_TEMPLATES.length : KENNEY_MODELS.length;

  return (
    <div className="w-72 bg-[#1B2432] text-white flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/90 tracking-wide">
            Library
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-3 bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => handleTabSwitch("build")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
              tab === "build"
                ? "bg-[#C87D5A] text-white shadow-sm"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <Box className="w-3 h-3" />
            Build from Scratch
          </button>
          <button
            onClick={() => handleTabSwitch("quickadd")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
              tab === "quickadd"
                ? "bg-[#C87D5A] text-white shadow-sm"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <Package className="w-3 h-3" />
            Quick Add
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder={tab === "build" ? "Search templates..." : "Search 3D models..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
              activeCategory === null
                ? "bg-[#C87D5A] text-white"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
            }`}
          >
            All ({totalCount})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setActiveCategory(activeCategory === cat.id ? null : cat.id)
              }
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-[#C87D5A] text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              {cat.icon} {cat.label} ({counts[cat.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {tab === "build" ? (
          /* ── Build from Scratch grid ── */
          filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <p className="text-xs">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className="group flex flex-col items-start p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-150 text-left"
                >
                  <span className="text-xl mb-1.5">{template.icon}</span>
                  <span className="text-[11px] font-medium text-white/80 leading-tight group-hover:text-white transition-colors">
                    {template.name}
                  </span>
                  <span className="text-[9px] text-white/30 mt-0.5 leading-snug line-clamp-2">
                    {template.description}
                  </span>
                  <span className="text-[9px] text-white/20 mt-1 font-mono">
                    {template.dims.w}x{template.dims.h}x{template.dims.d}
                  </span>
                </button>
              ))}
            </div>
          )
        ) : (
          /* ── Quick Add (Kenney 3D models) grid ── */
          filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <p className="text-xs">No models found</p>
            </div>
          ) : (
            <>
              <p className="text-[9px] text-white/25 mb-2 px-0.5">
                140 free 3D models · CC0 · Kenney.nl
              </p>
              <div className="grid grid-cols-2 gap-2">
                {filteredModels.map((model) => {
                  const isLoading = loadingModel === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleImportModel(model)}
                      disabled={!!loadingModel}
                      className={`group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 text-center ${
                        isLoading
                          ? "bg-[#C87D5A]/20 border-[#C87D5A]/30"
                          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15]"
                      } ${loadingModel && !isLoading ? "opacity-40" : ""}`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 text-[#C87D5A] animate-spin mb-1.5" />
                      ) : (
                        <Package className="w-5 h-5 text-white/20 group-hover:text-[#C87D5A]/60 transition-colors mb-1.5" />
                      )}
                      <span className="text-[11px] font-medium text-white/80 leading-tight group-hover:text-white transition-colors">
                        {model.name}
                      </span>
                      <span className="text-[9px] text-white/25 mt-0.5">
                        {isLoading ? "Loading..." : "Click to add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
