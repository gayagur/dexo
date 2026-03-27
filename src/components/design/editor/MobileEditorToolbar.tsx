import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Undo2, Redo2, MoreVertical, Magnet, Sun, Moon,
  RotateCcw, HelpCircle, Upload, LogOut, Save,
  Box, Square, PanelTop, PanelLeft, Loader2, Check,
} from "lucide-react";
import type { ViewMode, EditorLightMode, EditorFloorPreset } from "./EditorViewport";
import { EDITOR_FLOOR_OPTIONS } from "./EditorViewport";

interface MobileEditorToolbarProps {
  furnitureLabel: string;
  onBack: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  lightMode: EditorLightMode;
  onLightModeChange: (mode: EditorLightMode) => void;
  floorPreset: EditorFloorPreset;
  onFloorPresetChange: (preset: EditorFloorPreset) => void;
  saveStatus: "idle" | "saving" | "saved" | "unsaved";
  onSave: () => void;
  onReset: () => void;
  onToggleHelp: () => void;
  onSubmitLibrary: () => void;
  onSaveAndExit: () => void;
}

export function MobileEditorToolbar({
  furnitureLabel, onBack, canUndo, canRedo, onUndo, onRedo,
  snapEnabled, onToggleSnap, viewMode, onViewModeChange,
  lightMode, onLightModeChange, floorPreset, onFloorPresetChange,
  saveStatus, onSave, onReset, onToggleHelp, onSubmitLibrary, onSaveAndExit,
}: MobileEditorToolbarProps) {
  const truncatedLabel = furnitureLabel.length > 15
    ? furnitureLabel.slice(0, 15) + "\u2026"
    : furnitureLabel;

  return (
    <div className="shrink-0 h-12 bg-white border-b border-gray-200 px-2 flex items-center gap-1">
      {/* Back + Name */}
      <button onClick={onBack} className="h-11 w-11 flex items-center justify-center shrink-0" title="Back">
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
        {truncatedLabel}
      </span>

      <div className="flex-1" />

      {/* Save status */}
      {saveStatus === "saving" && <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />}
      {saveStatus === "saved" && <Check className="w-4 h-4 text-green-600 shrink-0" />}
      {saveStatus === "unsaved" && <span className="text-amber-500 text-lg shrink-0">●</span>}

      {/* Undo */}
      <button onClick={onUndo} disabled={!canUndo} className="h-11 w-11 flex items-center justify-center shrink-0 disabled:opacity-30" title="Undo">
        <Undo2 className="w-5 h-5 text-gray-700" />
      </button>

      {/* Redo */}
      <button onClick={onRedo} disabled={!canRedo} className="h-11 w-11 flex items-center justify-center shrink-0 disabled:opacity-30" title="Redo">
        <Redo2 className="w-5 h-5 text-gray-700" />
      </button>

      {/* Overflow Menu */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="h-11 w-11 flex items-center justify-center shrink-0" title="More options">
            <MoreVertical className="w-5 h-5 text-gray-700" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-2 space-y-1">
          {/* View Mode */}
          <div className="px-2 py-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">View</p>
            <div className="flex gap-1">
              {([
                { mode: "3d" as ViewMode, label: "3D", icon: Box },
                { mode: "front" as ViewMode, label: "Front", icon: Square },
                { mode: "top" as ViewMode, label: "Top", icon: PanelTop },
                { mode: "side" as ViewMode, label: "Side", icon: PanelLeft },
              ]).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  className={`flex-1 h-8 flex items-center justify-center gap-1 rounded text-xs font-medium transition-colors ${
                    viewMode === mode ? "bg-[#1B2432] text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-gray-100" />

          {/* Snap */}
          <button onClick={onToggleSnap} className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 transition-colors">
            <Magnet className={`w-4 h-4 ${snapEnabled ? "text-[#C87D5A]" : "text-gray-400"}`} />
            Snap {snapEnabled ? "ON" : "OFF"}
          </button>

          {/* Lighting */}
          <div className="flex gap-1 px-2">
            <button
              onClick={() => onLightModeChange("day")}
              className={`flex-1 h-8 flex items-center justify-center gap-1 rounded text-xs transition-colors ${
                lightMode === "day" ? "bg-[#1B2432] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Day
            </button>
            <button
              onClick={() => onLightModeChange("night")}
              className={`flex-1 h-8 flex items-center justify-center gap-1 rounded text-xs transition-colors ${
                lightMode === "night" ? "bg-[#1B2432] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Night
            </button>
          </div>
          <div className="h-px bg-gray-100" />

          {/* Floor */}
          <div className="px-2 py-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Floor Style</p>
            <Select value={floorPreset} onValueChange={(v) => onFloorPresetChange(v as EditorFloorPreset)}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Floor" />
              </SelectTrigger>
              <SelectContent>
                {EDITOR_FLOOR_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-px bg-gray-100" />

          {/* Actions */}
          <button onClick={onSave} className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100">
            <Save className="w-4 h-4 text-gray-400" /> Save
          </button>
          <button onClick={onReset} className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100">
            <RotateCcw className="w-4 h-4 text-gray-400" /> Reset to default
          </button>
          <button onClick={onToggleHelp} className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100">
            <HelpCircle className="w-4 h-4 text-gray-400" /> Help
          </button>
          <button onClick={onSubmitLibrary} className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100">
            <Upload className="w-4 h-4 text-gray-400" /> Submit to Library
          </button>
          <div className="h-px bg-gray-100" />
          <button onClick={onSaveAndExit} className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100">
            <LogOut className="w-4 h-4 text-gray-400" /> Save &amp; Exit
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
