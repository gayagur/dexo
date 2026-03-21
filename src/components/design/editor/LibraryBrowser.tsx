import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_TEMPLATES,
  type LibraryTemplate,
} from "@/lib/libraryData";

interface LibraryBrowserProps {
  onSelectTemplate: (template: LibraryTemplate) => void;
  onClose: () => void;
}

export function LibraryBrowser({ onSelectTemplate, onClose }: LibraryBrowserProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of LIBRARY_TEMPLATES) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
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

  return (
    <div className="w-72 bg-[#1B2432] text-white flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Search templates..."
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
            All ({LIBRARY_TEMPLATES.length})
          </button>
          {LIBRARY_CATEGORIES.map((cat) => (
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
              {cat.icon} {cat.label} ({categoryCounts[cat.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/30">
            <p className="text-xs">No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((template) => (
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
        )}
      </div>
    </div>
  );
}
