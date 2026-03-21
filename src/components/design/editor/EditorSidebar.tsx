import { Plus, Trash2, Copy, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PanelData } from "@/lib/furnitureData";

interface EditorSidebarProps {
  panels: PanelData[];
  selectedPanelId: string | null;
  onSelectPanel: (id: string | null) => void;
  onAddPanel: () => void;
  onDuplicatePanel: (id: string) => void;
  onDeletePanel: (id: string) => void;
}

export function EditorSidebar({
  panels,
  selectedPanelId,
  onSelectPanel,
  onAddPanel,
  onDuplicatePanel,
  onDeletePanel,
}: EditorSidebarProps) {
  const cylinders = panels.filter((p) => p.shape === "cylinder");
  const boxes = panels.filter((p) => p.shape !== "cylinder");
  const grouped = {
    horizontal: boxes.filter((p) => p.type === "horizontal"),
    vertical: boxes.filter((p) => p.type === "vertical"),
    back: boxes.filter((p) => p.type === "back"),
    cylinder: cylinders,
  };

  const typeLabel: Record<string, string> = {
    horizontal: "Horizontal Panels",
    vertical: "Vertical Panels",
    back: "Back Panels",
    cylinder: "Cylindrical Parts",
  };

  const typeIcon: Record<string, string> = {
    horizontal: "━",
    vertical: "┃",
    back: "▣",
    cylinder: "⊚",
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Panels</h3>
        <Button variant="ghost" size="sm" onClick={onAddPanel} className="h-7 px-2">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* Panel list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map((type) => {
          const items = grouped[type];
          if (items.length === 0) return null;

          return (
            <div key={type}>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider px-2 mb-1.5">
                {typeIcon[type]} {typeLabel[type]}
              </p>
              <div className="space-y-0.5">
                {items.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => onSelectPanel(panel.id)}
                    className={`w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors group ${
                      panel.id === selectedPanelId
                        ? "bg-[#C87D5A]/10 text-[#C87D5A]"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span className="flex-1 truncate text-xs">{panel.label}</span>
                    {/* Duplicate button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePanel(panel.id);
                      }}
                      title="Duplicate (Ctrl+D)"
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#C87D5A] transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePanel(panel.id);
                      }}
                      title="Delete (Del)"
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {panels.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            No panels yet. Click Add to start building.
          </div>
        )}
      </div>

      {/* Footer: panel count */}
      <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
        {panels.length} panel{panels.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
