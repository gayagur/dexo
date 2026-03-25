import { useState, useMemo } from "react";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of LIBRARY_TEMPLATES) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return LIBRARY_TEMPLATES;
    const q = search.toLowerCase();
    return LIBRARY_TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredCategories = useMemo(() => {
    const cats = new Set(filtered.map((t) => t.category));
    return LIBRARY_CATEGORIES.filter((c) => cats.has(c.id));
  }, [filtered]);

  return (
    <div className="w-72 bg-[#1B2432] text-white flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white/90 tracking-wide">
              Library
            </h2>
            <p className="text-[10px] text-white/30 mt-0.5">
              {LIBRARY_TEMPLATES.length} component templates
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
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
          />
        </div>
      </div>

      {/* Category list with templates */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filteredCategories.map((cat) => {
          const isCollapsed = collapsed[cat.id] ?? false;
          const catTemplates = filtered.filter((t) => t.category === cat.id);

          return (
            <div key={cat.id} className="mb-2">
              <button
                onClick={() => setCollapsed((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                className="flex items-center gap-2 w-full text-left py-2 px-1 rounded-lg hover:bg-white/5 transition-colors group"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-white/30" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-white/30" />
                )}
                <span className="text-base">{cat.icon}</span>
                <span className="text-[11px] font-medium text-white/70 group-hover:text-white transition-colors flex-1">
                  {cat.label}
                </span>
                <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full">
                  {categoryCounts[cat.id] || 0}
                </span>
              </button>

              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-1.5 ml-2 mr-1 mb-2">
                  {catTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => onSelectTemplate(template)}
                      className="group/card flex flex-col items-start p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-150 text-left"
                    >
                      <span className="text-lg mb-1">{template.icon}</span>
                      <span className="text-[11px] font-medium text-white/80 leading-tight group-hover/card:text-white transition-colors">
                        {template.name}
                      </span>
                      <span className="text-[9px] text-white/30 mt-0.5 leading-snug line-clamp-2">
                        {template.description}
                      </span>
                      <span className="text-[9px] text-white/20 mt-1 font-mono">
                        {template.dims.w}×{template.dims.h}×{template.dims.d}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && search && (
          <div className="flex flex-col items-center justify-center py-12 text-white/30">
            <p className="text-xs">No templates match "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
