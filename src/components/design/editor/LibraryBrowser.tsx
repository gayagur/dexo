import { useState, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_TEMPLATES,
  type LibraryTemplate,
} from "@/lib/libraryData";
import type { CommunityTemplate } from "@/lib/library-api";

interface LibraryBrowserProps {
  onSelectTemplate: (template: LibraryTemplate) => void;
  onClose: () => void;
  communityTemplates?: CommunityTemplate[];
}

export function LibraryBrowser({ onSelectTemplate, onClose, communityTemplates }: LibraryBrowserProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(LIBRARY_CATEGORIES[0].id);

  // Merge built-in templates with community templates
  const allTemplates = useMemo(() => {
    const community = (communityTemplates ?? []).map(
      (ct): LibraryTemplate & { isCommunity: boolean; authorName: string | null } => ({
        id: `community-${ct.id}`,
        name: ct.name,
        category: ct.category,
        icon: ct.icon,
        description: ct.description,
        dims: ct.dims,
        isCommunity: true,
        authorName: ct.author_name,
        buildPanels: () => ct.group_data.panels,
      }),
    );
    return [...LIBRARY_TEMPLATES, ...community];
  }, [communityTemplates]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of allTemplates) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, [allTemplates]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allTemplates;
    const q = search.toLowerCase();
    return allTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search, allTemplates]);

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

  return (
    <div className="w-full lg:w-72 bg-[#1B2432] text-white flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white/90 tracking-wide">
              Library
            </h2>
            <p className="text-[10px] text-white/30 mt-0.5">
              {allTemplates.length} component templates
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

      {/* Category tab bar — horizontal scrollable pills */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {LIBRARY_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
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
        <div className="grid grid-cols-2 gap-2">
          {displayTemplates.map((template) => {
            const isCommunity = (template as LibraryTemplate & { isCommunity?: boolean }).isCommunity ?? false;
            return (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="group/card flex flex-col items-start p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-150 text-left min-h-[100px]"
              >
                <div className="flex items-start justify-between w-full mb-1">
                  <span className="text-lg">{template.icon}</span>
                  {isCommunity && (
                    <span className="text-[8px] font-semibold uppercase tracking-wide text-[#C87D5A] bg-[#C87D5A]/15 px-1.5 py-0.5 rounded-full shrink-0">
                      Community
                    </span>
                  )}
                </div>
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
      </div>
    </div>
  );
}
