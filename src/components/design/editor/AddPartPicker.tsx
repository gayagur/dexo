import { useState } from "react";
import { X } from "lucide-react";
import type { PanelData, PanelShape } from "@/lib/furnitureData";

// ─── Part definition ───────────────────────────────────

interface PartPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  shape: PanelShape;
  type: PanelData["type"];
  size: [number, number, number]; // default size in meters
  materialId: string;
  comingSoon?: boolean;
}

interface PartCategory {
  label: string;
  items: PartPreset[];
}

const PART_CATEGORIES: PartCategory[] = [
  {
    label: "Panel Shapes",
    items: [
      {
        id: "h_panel",
        label: "Horizontal Panel",
        icon: "━",
        description: "Shelf, tabletop, seat",
        shape: "box",
        type: "horizontal",
        size: [0.6, 0.018, 0.4],
        materialId: "oak",
      },
      {
        id: "v_panel",
        label: "Vertical Panel",
        icon: "┃",
        description: "Side, divider, partition",
        shape: "box",
        type: "vertical",
        size: [0.018, 0.6, 0.4],
        materialId: "oak",
      },
      {
        id: "back_panel",
        label: "Back Panel",
        icon: "▣",
        description: "Back, backer board",
        shape: "box",
        type: "back",
        size: [0.6, 0.6, 0.006],
        materialId: "plywood",
      },
    ],
  },
  {
    label: "3D Shapes",
    items: [
      {
        id: "box",
        label: "Box / Cube",
        icon: "◻",
        description: "Generic rectangular solid",
        shape: "box",
        type: "horizontal",
        size: [0.3, 0.3, 0.3],
        materialId: "oak",
      },
      {
        id: "cylinder",
        label: "Cylinder",
        icon: "⊚",
        description: "Legs, columns, rods",
        shape: "cylinder",
        type: "vertical",
        size: [0.05, 0.7, 0.05],
        materialId: "black_metal",
      },
      {
        id: "sphere",
        label: "Sphere",
        icon: "●",
        description: "Decorative ball, knob",
        shape: "sphere",
        type: "horizontal",
        size: [0.1, 0.1, 0.1],
        materialId: "brass",
      },
      {
        id: "cone",
        label: "Cone",
        icon: "▲",
        description: "Tapered leg, finial",
        shape: "cone",
        type: "vertical",
        size: [0.06, 0.5, 0.06],
        materialId: "oak",
      },
    ],
  },
  {
    label: "Furniture Parts",
    items: [
      {
        id: "door",
        label: "Door Panel",
        icon: "🚪",
        description: "Cabinet or wardrobe door",
        shape: "box",
        type: "vertical",
        size: [0.45, 0.7, 0.018],
        materialId: "melamine_white",
      },
      {
        id: "drawer_front",
        label: "Drawer Front",
        icon: "🗄️",
        description: "Drawer facade panel",
        shape: "box",
        type: "vertical",
        size: [0.45, 0.2, 0.018],
        materialId: "melamine_white",
      },
      {
        id: "leg_short",
        label: "Short Leg",
        icon: "⏐",
        description: "Sofa, bed, cabinet leg (100mm)",
        shape: "cylinder",
        type: "vertical",
        size: [0.04, 0.1, 0.04],
        materialId: "black_metal",
      },
      {
        id: "leg_medium",
        label: "Medium Leg",
        icon: "⏐",
        description: "Desk, table leg (450mm)",
        shape: "cylinder",
        type: "vertical",
        size: [0.05, 0.45, 0.05],
        materialId: "black_metal",
      },
      {
        id: "leg_tall",
        label: "Tall Leg",
        icon: "⏐",
        description: "Dining table, bar stool (720mm)",
        shape: "cylinder",
        type: "vertical",
        size: [0.05, 0.72, 0.05],
        materialId: "black_metal",
      },
      {
        id: "handle",
        label: "Handle / Knob",
        icon: "◉",
        description: "Door or drawer pull",
        shape: "cylinder",
        type: "horizontal",
        size: [0.03, 0.12, 0.03],
        materialId: "steel",
      },
      {
        id: "bracket",
        label: "Support Bracket",
        icon: "⌐",
        description: "L-bracket, support rail",
        shape: "box",
        type: "horizontal",
        size: [0.04, 0.04, 0.3],
        materialId: "black_metal",
      },
      {
        id: "glass_panel",
        label: "Glass Panel",
        icon: "◇",
        description: "Glass shelf or door",
        shape: "box",
        type: "vertical",
        size: [0.45, 0.6, 0.006],
        materialId: "glass",
      },
      {
        id: "mirror",
        label: "Mirror",
        icon: "🪞",
        description: "Flat mirror panel",
        shape: "box",
        type: "back",
        size: [0.5, 0.7, 0.006],
        materialId: "glass",
      },
    ],
  },
  {
    label: "Freeform",
    items: [
      {
        id: "custom_shape",
        label: "Draw Custom Shape",
        icon: "✏️",
        description: "Coming soon",
        shape: "box",
        type: "horizontal",
        size: [0.3, 0.018, 0.3],
        materialId: "oak",
        comingSoon: true,
      },
    ],
  },
];

// ─── Component ─────────────────────────────────────────

interface AddPartPickerProps {
  onAdd: (preset: {
    shape: PanelShape;
    type: PanelData["type"];
    label: string;
    size: [number, number, number];
    materialId: string;
  }) => void;
  onClose: () => void;
}

export function AddPartPicker({ onAdd, onClose }: AddPartPickerProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[540px] max-h-[80vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-serif font-semibold text-gray-900">
              Add Part
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Choose what to add to your design
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {PART_CATEGORIES.map((category) => (
            <div key={category.label}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 px-1">
                {category.label}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.comingSoon}
                    onClick={() => {
                      if (item.comingSoon) return;
                      onAdd({
                        shape: item.shape,
                        type: item.type,
                        label: item.label,
                        size: item.size,
                        materialId: item.materialId,
                      });
                      onClose();
                    }}
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`relative group rounded-xl border p-3 text-left transition-all duration-200 ${
                      item.comingSoon
                        ? "border-dashed border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60"
                        : hovered === item.id
                        ? "border-[#C87D5A]/40 bg-[#C87D5A]/[0.04] shadow-md shadow-[#C87D5A]/10 scale-[1.02]"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 text-lg transition-colors ${
                        hovered === item.id && !item.comingSoon
                          ? "bg-[#C87D5A]/10"
                          : "bg-gray-100"
                      }`}
                    >
                      {item.icon}
                    </div>
                    {/* Label */}
                    <p className="text-xs font-medium text-gray-900 leading-tight">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                      {item.description}
                    </p>
                    {/* Coming soon badge */}
                    {item.comingSoon && (
                      <span className="absolute top-2 right-2 text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
