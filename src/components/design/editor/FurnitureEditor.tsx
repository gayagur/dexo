import { useState, useCallback, useEffect } from "react";
import { EditorViewport, type TransformMode } from "./EditorViewport";
import { EditorSidebar } from "./EditorSidebar";
import { EditorParameters } from "./EditorParameters";
import { DesignChatPanel } from "./DesignChatPanel";
import { AddPartPicker } from "./AddPartPicker";
import { LibraryBrowser } from "./LibraryBrowser";
import { Button } from "@/components/ui/button";
import {
  getDefaultTemplate,
  type PanelData,
  type PanelShape,
  type FurnitureOption,
} from "@/lib/furnitureData";
import type { LibraryTemplate } from "@/lib/libraryData";
import { ArrowLeft, Save, RotateCcw, MessageSquare, Move, RotateCw, Maximize2, Magnet, HelpCircle, X, BookOpen } from "lucide-react";

interface FurnitureEditorProps {
  furnitureType: FurnitureOption;
  roomLabel: string;
  onBack: () => void;
  onSave?: (data: {
    panels: PanelData[];
    dims: { w: number; h: number; d: number };
    style: string;
    furnitureId: string;
  }) => void | Promise<void>;
}

let nextPanelId = 100;

export function FurnitureEditor({
  furnitureType,
  roomLabel,
  onBack,
  onSave,
}: FurnitureEditorProps) {
  const [dims, setDims] = useState(furnitureType.defaultDims);
  const [style, setStyle] = useState("Modern");
  const [chatOpen, setChatOpen] = useState(true);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const defaultTemplate = getDefaultTemplate(furnitureType.id, furnitureType.defaultDims);
  const [panels, setPanels] = useState<PanelData[]>(defaultTemplate.panels);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;

  const handleUpdatePanel = useCallback((id: string, updates: Partial<PanelData>) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const handleAddPart = useCallback((preset: {
    shape: PanelShape;
    type: PanelData["type"];
    label: string;
    size: [number, number, number];
    materialId: string;
  }) => {
    const id = `p${++nextPanelId}`;
    const newPanel: PanelData = {
      id,
      type: preset.type,
      shape: preset.shape === "box" ? undefined : preset.shape,
      label: preset.label,
      position: [0, 0.5, 0],
      size: preset.size,
      materialId: preset.materialId,
    };
    setPanels((prev) => [...prev, newPanel]);
    setSelectedPanelId(id);
  }, []);

  const handleDuplicatePanel = useCallback((id: string) => {
    const source = panels.find((p) => p.id === id);
    if (!source) return;
    const newId = `p${++nextPanelId}`;
    const clone: PanelData = {
      ...source,
      id: newId,
      label: `${source.label} Copy`,
      // Offset slightly so it's visible
      position: [
        source.position[0] + 0.05,
        source.position[1],
        source.position[2] - 0.05,
      ],
    };
    setPanels((prev) => [...prev, clone]);
    setSelectedPanelId(newId);
  }, [panels]);

  const handleDeletePanel = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
    if (selectedPanelId === id) setSelectedPanelId(null);
  }, [selectedPanelId]);

  // Keyboard shortcuts for transform modes + duplicate + delete
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedPanelId) handleDuplicatePanel(selectedPanelId);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedPanelId) {
        handleDeletePanel(selectedPanelId);
        return;
      }
      switch (e.key) {
        case "g": case "w": case "G": case "W": setTransformMode("translate"); break;
        case "r": case "e": case "R": case "E": setTransformMode("rotate"); break;
        case "s": case "S": setTransformMode("scale"); break;
        case "?": setShowHelp((v) => !v); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedPanelId, handleDuplicatePanel, handleDeletePanel]);

  const handleReset = useCallback(() => {
    const template = getDefaultTemplate(furnitureType.id, dims);
    setPanels(template.panels);
    setSelectedPanelId(null);
  }, [furnitureType.id, dims]);

  const handleSave = useCallback(() => {
    onSave?.({
      panels,
      dims,
      style,
      furnitureId: furnitureType.id,
    });
  }, [panels, dims, style, furnitureType.id, onSave]);

  const handleLoadTemplate = useCallback((template: LibraryTemplate) => {
    const newDims = template.dims;
    setDims(newDims);
    const newPanels = template.buildPanels(newDims);
    setPanels(newPanels);
    setSelectedPanelId(null);
    setShowLibrary(false);
  }, []);

  // ─── Chat panel callbacks ──────────────────────────────

  const handleUpdatePanelMaterial = useCallback(
    (panelLabel: string, materialId: string) => {
      setPanels((prev) =>
        prev.map((p) =>
          p.label.toLowerCase() === panelLabel.toLowerCase()
            ? { ...p, materialId }
            : p
        )
      );
    },
    []
  );

  const handleUpdateAllMaterials = useCallback((materialId: string) => {
    setPanels((prev) => prev.map((p) => ({ ...p, materialId })));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA]">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {furnitureType.label}
            </h2>
            <p className="text-[11px] text-gray-400">{roomLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Transform mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-1">
            {([
              { mode: "translate" as TransformMode, icon: Move, label: "Move (W)", key: "W" },
              { mode: "rotate" as TransformMode, icon: RotateCw, label: "Rotate (E)", key: "E" },
              { mode: "scale" as TransformMode, icon: Maximize2, label: "Scale (S)", key: "S" },
            ]).map(({ mode, icon: Icon, label, key }) => (
              <button
                key={mode}
                title={label}
                onClick={() => setTransformMode(mode)}
                className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                  transformMode === mode
                    ? "bg-white shadow-sm text-[#C87D5A]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* Snap toggle */}
          <button
            title={snapEnabled ? "Snap ON (10mm grid)" : "Snap OFF"}
            onClick={() => setSnapEnabled((v) => !v)}
            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${
              snapEnabled
                ? "border-[#C87D5A]/30 bg-[#C87D5A]/10 text-[#C87D5A]"
                : "border-gray-200 bg-white text-gray-400"
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Help button */}
          <button
            title="Shortcuts & Help (?)"
            onClick={() => setShowHelp((v) => !v)}
            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${
              showHelp
                ? "border-[#C87D5A]/30 bg-[#C87D5A]/10 text-[#C87D5A]"
                : "border-gray-200 bg-white text-gray-400 hover:text-gray-600"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          <Button
            variant={showLibrary ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLibrary((v) => !v)}
            className={`h-8 ${showLibrary ? "bg-[#1B2432] hover:bg-[#2A3544] text-white" : ""}`}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Library
          </Button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <Button
            variant={chatOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setChatOpen((v) => !v)}
            className={`h-8 ${
              chatOpen
                ? "bg-[#1B2432] hover:bg-[#2A3544] text-white"
                : ""
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            AI Assistant
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="h-8">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 bg-[#C87D5A] hover:bg-[#B06B4A] text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save Design
          </Button>
        </div>
      </div>

      {/* Four-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {showLibrary ? (
          <LibraryBrowser
            onSelectTemplate={handleLoadTemplate}
            onClose={() => setShowLibrary(false)}
          />
        ) : (
          <EditorSidebar
            panels={panels}
            selectedPanelId={selectedPanelId}
            onSelectPanel={setSelectedPanelId}
            onAddPanel={() => setShowAddPicker(true)}
            onDuplicatePanel={handleDuplicatePanel}
            onDeletePanel={handleDeletePanel}
          />
        )}

        <div className="flex-1 p-3">
          <EditorViewport
            panels={panels}
            selectedPanelId={selectedPanelId}
            transformMode={transformMode}
            snapEnabled={snapEnabled}
            onSelectPanel={setSelectedPanelId}
            onUpdatePanel={handleUpdatePanel}
          />
        </div>

        <EditorParameters
          panel={selectedPanel}
          overallDims={dims}
          onUpdatePanel={handleUpdatePanel}
          onUpdateDims={setDims}
          style={style}
          onStyleChange={setStyle}
        />

        {chatOpen && (
          <DesignChatPanel
            furnitureType={furnitureType}
            dims={dims}
            style={style}
            panels={panels}
            onUpdateDims={setDims}
            onUpdateStyle={setStyle}
            onUpdatePanelMaterial={handleUpdatePanelMaterial}
            onUpdateAllMaterials={handleUpdateAllMaterials}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {/* Add Part Picker modal */}
      {showAddPicker && (
        <AddPartPicker
          onAdd={handleAddPart}
          onClose={() => setShowAddPicker(false)}
        />
      )}

      {/* Help / Shortcuts overlay */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[80vh] overflow-y-auto border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="text-base font-serif font-semibold text-gray-900">Shortcuts & Instructions</h3>
                <p className="text-xs text-gray-400 mt-0.5">Keyboard shortcuts and how to use the editor</p>
              </div>
              <button onClick={() => setShowHelp(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              {/* Transform */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Transform Tools</h4>
                <div className="space-y-1.5">
                  {[
                    ["W / G", "Move selected element"],
                    ["E / R", "Rotate selected element"],
                    ["S", "Scale selected element"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-3">
                      <kbd className="min-w-[56px] px-2 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-600">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Actions</h4>
                <div className="space-y-1.5">
                  {[
                    ["Ctrl + D", "Duplicate selected element"],
                    ["Delete", "Delete selected element"],
                    ["Click", "Select an element"],
                    ["Click empty", "Deselect all"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-3">
                      <kbd className="min-w-[56px] px-2 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-600">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doors & Drawers */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Doors & Drawers</h4>
                <div className="space-y-1.5">
                  {[
                    ["Double-click", "Toggle open/close door or drawer"],
                    ["Right-click", "Context menu with Open/Close option"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-3">
                      <kbd className="min-w-[56px] px-2 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-600">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">3D Navigation</h4>
                <div className="space-y-1.5">
                  {[
                    ["Left drag", "Orbit / rotate camera"],
                    ["Right drag", "Pan camera"],
                    ["Scroll", "Zoom in/out"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-3">
                      <kbd className="min-w-[56px] px-2 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-600">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-[#FDF8F4] rounded-xl p-4 border border-[#C87D5A]/10">
                <h4 className="text-xs font-semibold text-[#C87D5A] uppercase tracking-wider mb-2">Tips</h4>
                <ul className="space-y-1.5 text-xs text-gray-600 leading-relaxed">
                  <li>• Use the <strong>Parameters panel</strong> (right side) to type exact dimensions, position, and rotation values</li>
                  <li>• <strong>Quick Rotate</strong> buttons let you rotate 90° on any axis with one click</li>
                  <li>• The <strong>magnet icon</strong> toggles snap-to-grid (10mm increments)</li>
                  <li>• <strong>+ Add</strong> opens a picker — choose panels, 3D shapes, or furniture parts</li>
                  <li>• Hover over any panel in the sidebar to see <strong>duplicate</strong> and <strong>delete</strong> buttons</li>
                  <li>• Use the <strong>AI Assistant</strong> to change materials or dimensions by chatting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
