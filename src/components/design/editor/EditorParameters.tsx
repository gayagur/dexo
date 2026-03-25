import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MATERIALS, type PanelData, type MaterialOption, type GroupData } from "@/lib/furnitureData";
import { Ruler, Layers, Palette, RotateCw, ChevronDown, ChevronRight } from "lucide-react";

// ─── Helper: adjust hex color brightness ─────────────────
function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
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
  onUpdateDims: (dims: { w: number; h: number; d: number }) => void;
  style: string;
  onStyleChange: (style: string) => void;
  multiSelectCount: number;
}

const STYLES = [
  "Modern", "Classic", "Industrial", "Minimalist", "Scandinavian", "Rustic",
  "Mid-Century", "Art Deco", "Japandi", "Farmhouse",
];

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
  onUpdateDims,
  style,
  onStyleChange,
  multiSelectCount,
}: EditorParametersProps) {
  const matCategories = [...new Set(MATERIALS.map((m) => m.category))];

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
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {selectedGroup.name}
          </h3>
          <p className="text-[10px] text-gray-400 mb-3">
            {selectedGroup.panels.length} panels
          </p>

          {/* Group Size (proportional scale) */}
          <div className="flex items-center gap-2 mb-1.5">
            <Ruler className="w-3 h-3 text-gray-400" />
            <p className="text-[11px] text-gray-400">Size (proportional)</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["W", "H", "D"] as const).map((axis, i) => (
              <div key={axis}>
                <Label className="text-[11px] text-gray-500">{axis}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={10}
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
                    className="h-8 text-xs pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    mm
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Position (in mm) */}
          <p className="text-[11px] text-gray-400 mb-1.5">Position</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["X", "Y", "Z"] as const).map((axis, i) => (
              <div key={axis}>
                <Label className="text-[11px] text-gray-500">{axis}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="10"
                    value={Math.round(selectedGroup.position[i] * 1000)}
                    onChange={(e) => {
                      const newPos = [...selectedGroup.position] as [number, number, number];
                      newPos[i] = (parseInt(e.target.value) || 0) / 1000;
                      onUpdateGroup(selectedGroup.id, { position: newPos });
                    }}
                    className="h-8 text-xs pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    mm
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Rotation (in degrees) */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <RotateCw className="w-3 h-3 text-gray-400" />
            <p className="text-[11px] text-gray-400">Rotation</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["X", "Y", "Z"] as const).map((axis, i) => {
              const rot = selectedGroup.rotation ?? [0, 0, 0];
              return (
                <div key={`rot-${axis}`}>
                  <Label className="text-[11px] text-gray-500">{axis}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="15"
                      value={Math.round((rot[i] * 180) / Math.PI)}
                      onChange={(e) => {
                        const newRot = [...rot] as [number, number, number];
                        newRot[i] = ((parseInt(e.target.value) || 0) * Math.PI) / 180;
                        onUpdateGroup(selectedGroup.id, { rotation: newRot });
                      }}
                      className="h-8 text-xs pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      °
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Group Material — apply to all panels */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Material (All)</h3>
          </div>
          {matCategories.map((cat) => (
            <div key={cat} className="mb-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">
                {cat}
              </p>
              <div className="flex flex-wrap gap-2">
                {MATERIALS.filter((m) => m.category === cat).map((m) => (
                  <MaterialSwatch
                    key={m.id}
                    material={m}
                    selected={m.id === dominantMaterial}
                    onClick={() => onUpdateGroupMaterial(selectedGroup.id, m.id)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Custom Color</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={MATERIALS.find(m => m.id === dominantMaterial)?.color ?? "#C4A265"}
                onChange={(e) => onCustomGroupColor(selectedGroup.id, e.target.value)}
                className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                style={{ padding: 0 }}
              />
              <span className="text-[10px] text-gray-400">Pick any color</span>
            </div>
          </div>
        </div>
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
      return (
        <>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {panel.label}
            </h3>
            {panel.shape && panel.shape !== "box" && (
              <p className="text-[10px] text-gray-400 mb-2 capitalize">
                {panel.shape.replace(/_/g, " ")}
              </p>
            )}

            {/* Panel dimensions (in mm, displayed) */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["w", "h", "d"] as const).map((axis, i) => (
                <div key={axis}>
                  <Label className="text-[11px] text-gray-500 uppercase">
                    {axis === "w" ? "W" : axis === "h" ? "H" : "D"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={Math.round(panel.size[i] * 1000)}
                      onChange={(e) => {
                        const newSize = [...panel.size] as [number, number, number];
                        newSize[i] = (parseInt(e.target.value) || 0) / 1000;
                        onUpdatePanel(panel.id, { size: newSize });
                      }}
                      className="h-8 text-xs pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      mm
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Position (in mm) */}
            <p className="text-[11px] text-gray-400 mb-1.5">Position</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["X", "Y", "Z"] as const).map((axis, i) => (
                <div key={axis}>
                  <Label className="text-[11px] text-gray-500">{axis}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="10"
                      value={Math.round(panel.position[i] * 1000)}
                      onChange={(e) => {
                        const newPos = [...panel.position] as [number, number, number];
                        newPos[i] = (parseInt(e.target.value) || 0) / 1000;
                        onUpdatePanel(panel.id, { position: newPos });
                      }}
                      className="h-8 text-xs pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      mm
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Rotation (in degrees) */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <RotateCw className="w-3 h-3 text-gray-400" />
              <p className="text-[11px] text-gray-400">Rotation</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {(["X", "Y", "Z"] as const).map((axis, i) => {
                const rot = panel.rotation ?? [0, 0, 0];
                return (
                  <div key={`rot-${axis}`}>
                    <Label className="text-[11px] text-gray-500">{axis}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="15"
                        value={Math.round((rot[i] * 180) / Math.PI)}
                        onChange={(e) => {
                          const newRot = [...rot] as [number, number, number];
                          newRot[i] = ((parseInt(e.target.value) || 0) * Math.PI) / 180;
                          onUpdatePanel(panel.id, { rotation: newRot });
                        }}
                        className="h-8 text-xs pr-6"
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
          </div>

          {/* Shape Parameters (if applicable) */}
          {panel.shapeParams && Object.keys(panel.shapeParams).length > 0 && (
            <div className="p-4 border-t border-gray-100">
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
                          step={isAngle ? "5" : isRatio ? "0.05" : "1"}
                          value={isAngle ? value : isRatio ? value : Math.round(value * 1000)}
                          onChange={(e) => {
                            const raw = parseFloat(e.target.value) || 0;
                            const newVal = isAngle ? raw : isRatio ? raw : raw / 1000;
                            onUpdatePanel(panel.id, {
                              shapeParams: { ...panel.shapeParams, [key]: newVal },
                            });
                          }}
                          className="h-8 text-xs pr-8"
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

          {/* Material Picker */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Material</h3>
            </div>
            {matCategories.map((cat) => (
              <div key={cat} className="mb-3">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">
                  {cat}
                </p>
                <div className="flex flex-wrap gap-2">
                  {MATERIALS.filter((m) => m.category === cat).map((m) => (
                    <MaterialSwatch
                      key={m.id}
                      material={m}
                      selected={m.id === panel.materialId}
                      onClick={() => onUpdatePanel(panel.id, { materialId: m.id })}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Custom Color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={panel.customColor ?? MATERIALS.find(m => m.id === panel.materialId)?.color ?? "#C4A265"}
                  onChange={(e) => onUpdatePanel(panel.id, { customColor: e.target.value })}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                  style={{ padding: 0 }}
                />
                <span className="text-[10px] text-gray-400">Pick any color</span>
                {panel.customColor && (
                  <button
                    onClick={() => onUpdatePanel(panel.id, { customColor: undefined })}
                    className="text-[10px] text-red-400 hover:text-red-600"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      );
    }

    // Priority 4: Empty state
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-gray-400 text-center">
          Select a panel in the viewport or sidebar to edit its properties.
        </p>
      </div>
    );
  };

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Overall Dimensions */}
      {showOverallDims && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Overall Size</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["w", "h", "d"] as const).map((axis) => (
              <div key={axis}>
                <Label className="text-[11px] text-gray-500 uppercase">
                  {axis === "w" ? "Width" : axis === "h" ? "Height" : "Depth"}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={10}
                    value={overallDims[axis]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 10) {
                        onUpdateDims({ ...overallDims, [axis]: val });
                      }
                    }}
                    className="h-8 text-xs pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    mm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Style</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => onStyleChange(s)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                s === style
                  ? "bg-[#C87D5A] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content area (priority-based rendering) */}
      {renderContent()}
    </div>
  );
}
