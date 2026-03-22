import { useState, useCallback, useEffect, useRef } from "react";
import { EditorViewport } from "./EditorViewport";
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
import { ArrowLeft, Save, RotateCcw, RotateCw, MessageSquare, Magnet, HelpCircle, X, BookOpen, Undo2, Redo2, Box, Square, PanelTop, PanelLeft } from "lucide-react";
import type { ViewMode } from "./EditorViewport";

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
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [rotationMode, setRotationMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");

  const defaultTemplate = getDefaultTemplate(furnitureType.id, furnitureType.defaultDims);
  const [panels, setPanels] = useState<PanelData[]>(defaultTemplate.panels);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);

  // ─── Undo / Redo History ───────────────────────────────
  const MAX_HISTORY = 50;
  const historyRef = useRef<PanelData[][]>([structuredClone(defaultTemplate.panels)]);
  const historyIndexRef = useRef(0);
  const [, setHistoryVersion] = useState(0);

  const pushHistory = useCallback((newPanels: PanelData[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(structuredClone(newPanels));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryVersion((v) => v + 1);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const prev = structuredClone(historyRef.current[historyIndexRef.current]);
    setPanels(prev);
    setSelectedPanelId(null);
    setHistoryVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const next = structuredClone(historyRef.current[historyIndexRef.current]);
    setPanels(next);
    setSelectedPanelId(null);
    setHistoryVersion((v) => v + 1);
  }, []);

  /** Wrapper that updates panels AND pushes to history */
  const updatePanels = useCallback((updater: (prev: PanelData[]) => PanelData[]) => {
    setPanels((prev) => {
      const next = updater(prev);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;

  const handleUpdatePanel = useCallback((id: string, updates: Partial<PanelData>) => {
    updatePanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, [updatePanels]);

  const handleAddPart = useCallback((preset: {
    shape: PanelShape;
    type: PanelData["type"];
    label: string;
    size: [number, number, number];
    materialId: string;
    shapeParams?: Record<string, number>;
  }) => {
    const id = `p${++nextPanelId}`;
    const newPanel: PanelData = {
      id,
      type: preset.type,
      shape: preset.shape === "box" ? undefined : preset.shape,
      shapeParams: preset.shapeParams,
      label: preset.label,
      position: [0, 0.5, 0],
      size: preset.size,
      materialId: preset.materialId,
    };
    updatePanels((prev) => [...prev, newPanel]);
    setSelectedPanelId(id);
  }, [updatePanels]);

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
    updatePanels((prev) => [...prev, clone]);
    setSelectedPanelId(newId);
  }, [panels, updatePanels]);

  const handleDeletePanel = useCallback((id: string) => {
    updatePanels((prev) => prev.filter((p) => p.id !== id));
    if (selectedPanelId === id) setSelectedPanelId(null);
  }, [selectedPanelId, updatePanels]);

  // Keyboard shortcuts for transform modes + duplicate + delete + undo/redo
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedPanelId) handleDuplicatePanel(selectedPanelId);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedPanelId) {
        handleDeletePanel(selectedPanelId);
        return;
      }

      // Arrow keys — nudge selected panel position
      const nudge = e.shiftKey ? 0.001 : 0.01; // 1mm with shift, 10mm without
      if (selectedPanelId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const panel = panels.find((p) => p.id === selectedPanelId);
        if (panel) {
          const pos = [...panel.position] as [number, number, number];
          switch (e.key) {
            case "ArrowLeft": pos[0] -= nudge; break;
            case "ArrowRight": pos[0] += nudge; break;
            case "ArrowUp": pos[1] += nudge; break;
            case "ArrowDown": pos[1] -= nudge; break;
          }
          handleUpdatePanel(selectedPanelId, { position: pos });
        }
        return;
      }

      switch (e.key) {
        case "r":
        case "R":
          if (!e.ctrlKey && !e.metaKey) setRotationMode((v) => !v);
          break;
        case "Escape":
          setRotationMode(false);
          break;
        case "1": if (!e.ctrlKey && !e.metaKey) setViewMode("3d"); break;
        case "2": if (!e.ctrlKey && !e.metaKey) setViewMode("front"); break;
        case "3": if (!e.ctrlKey && !e.metaKey) setViewMode("top"); break;
        case "4": if (!e.ctrlKey && !e.metaKey) setViewMode("side"); break;
        case "?": setShowHelp((v) => !v); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedPanelId, panels, handleUpdatePanel, handleDuplicatePanel, handleDeletePanel, undo, redo]);

  const handleDimsChange = useCallback((newDims: { w: number; h: number; d: number }) => {
    const oldDims = dims;
    setDims(newDims);

    // Scale existing panels proportionally instead of rebuilding from template
    const scaleX = newDims.w / (oldDims.w || 1);
    const scaleY = newDims.h / (oldDims.h || 1);
    const scaleZ = newDims.d / (oldDims.d || 1);

    if (scaleX !== 1 || scaleY !== 1 || scaleZ !== 1) {
      updatePanels((prev) =>
        prev.map((p) => ({
          ...p,
          position: [
            p.position[0] * scaleX,
            p.position[1] * scaleY,
            p.position[2] * scaleZ,
          ] as [number, number, number],
          size: [
            p.size[0] * scaleX,
            p.size[1] * scaleY,
            p.size[2] * scaleZ,
          ] as [number, number, number],
        }))
      );
    }
  }, [dims, updatePanels]);

  const handleReset = useCallback(() => {
    const template = getDefaultTemplate(furnitureType.id, dims);
    updatePanels(() => template.panels);
    setSelectedPanelId(null);
  }, [furnitureType.id, dims, updatePanels]);

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
    const newPanels = template.buildPanels(newDims);
    // Offset new panels so they don't overlap existing ones
    // Place them 0.5m to the right of the rightmost existing panel
    const maxX = panels.length > 0
      ? Math.max(...panels.map(p => p.position[0] + (p.size[0] / 2))) + 0.5
      : 0;
    const offsetPanels = newPanels.map(p => ({
      ...p,
      id: `p${++nextPanelId}`,
      position: [p.position[0] + maxX, p.position[1], p.position[2]] as [number, number, number],
    }));
    updatePanels((prev) => [...prev, ...offsetPanels]);
    setSelectedPanelId(null);
    setShowLibrary(false);
  }, [panels, updatePanels]);

  // ─── Chat panel callbacks ──────────────────────────────

  const handleUpdatePanelMaterial = useCallback(
    (panelLabel: string, materialId: string) => {
      updatePanels((prev) =>
        prev.map((p) =>
          p.label.toLowerCase() === panelLabel.toLowerCase()
            ? { ...p, materialId }
            : p
        )
      );
    },
    [updatePanels]
  );

  const handleUpdateAllMaterials = useCallback((materialId: string) => {
    updatePanels((prev) => prev.map((p) => ({ ...p, materialId })));
  }, [updatePanels]);

  // AI chat: remove panel by label
  const handleChatRemovePanel = useCallback((panelLabel: string) => {
    updatePanels((prev) =>
      prev.filter((p) => p.label.toLowerCase() !== panelLabel.toLowerCase())
    );
  }, [updatePanels]);

  // AI chat: add panel
  const handleChatAddPanel = useCallback((preset: {
    label: string;
    type: PanelData["type"];
    position: [number, number, number];
    size: [number, number, number];
    materialId: string;
  }) => {
    const id = `p${++nextPanelId}`;
    const newPanel: PanelData = {
      id,
      type: preset.type,
      label: preset.label,
      position: preset.position,
      size: preset.size,
      materialId: preset.materialId,
    };
    updatePanels((prev) => [...prev, newPanel]);
  }, [updatePanels]);

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

          {/* Rotation mode toggle */}
          <button
            title={rotationMode ? "Rotation Mode ON (R)" : "Rotation Mode OFF (R)"}
            onClick={() => setRotationMode((v) => !v)}
            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${
              rotationMode
                ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                : "border-gray-200 bg-white text-gray-400"
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* View mode selector */}
          <div className="flex items-center h-8 rounded-lg border border-gray-200 overflow-hidden">
            {([
              { mode: "3d" as ViewMode, label: "3D", icon: Box },
              { mode: "front" as ViewMode, label: "Front", icon: Square },
              { mode: "top" as ViewMode, label: "Top", icon: PanelTop },
              { mode: "side" as ViewMode, label: "Side", icon: PanelLeft },
            ]).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                title={`${label} View`}
                onClick={() => setViewMode(mode)}
                className={`h-full px-2 flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-[#1B2432] text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

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
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndexRef.current <= 0}
            className="h-8 px-2"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndexRef.current >= historyRef.current.length - 1}
            className="h-8 px-2"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
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
            snapEnabled={snapEnabled}
            rotationMode={rotationMode}
            viewMode={viewMode}
            onSelectPanel={setSelectedPanelId}
            onUpdatePanel={handleUpdatePanel}
          />
        </div>

        <EditorParameters
          panel={selectedPanel}
          overallDims={dims}
          onUpdatePanel={handleUpdatePanel}
          onUpdateDims={handleDimsChange}
          style={style}
          onStyleChange={setStyle}
        />

        {chatOpen && (
          <DesignChatPanel
            furnitureType={furnitureType}
            dims={dims}
            style={style}
            panels={panels}
            onUpdateDims={handleDimsChange}
            onUpdateStyle={setStyle}
            onUpdatePanelMaterial={handleUpdatePanelMaterial}
            onUpdateAllMaterials={handleUpdateAllMaterials}
            onRemovePanel={handleChatRemovePanel}
            onAddPanel={handleChatAddPanel}
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
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Move & Resize</h4>
                <div className="space-y-1.5">
                  {[
                    ["Drag panel", "Move on ground plane (X/Z)"],
                    ["Shift + Drag", "Move on Y axis (up/down)"],
                    ["Drag handle", "Resize from edge or corner"],
                    ["R", "Toggle rotation mode"],
                    ["R + Drag", "Rotate selected panel (drag horizontally)"],
                    ["Esc", "Exit rotation mode"],
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
                    ["Ctrl + Z", "Undo last action"],
                    ["Ctrl + Shift + Z", "Redo last action"],
                    ["Ctrl + D", "Duplicate selected element"],
                    ["Delete", "Delete selected element"],
                    ["Click", "Select an element"],
                    ["Click empty", "Deselect all"],
                    ["Arrow keys", "Nudge selected element (10mm)"],
                    ["Shift + Arrow", "Fine nudge (1mm)"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-3">
                      <kbd className="min-w-[56px] px-2 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-600">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Views */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">View Modes</h4>
                <div className="space-y-1.5">
                  {[
                    ["1", "3D view (default perspective)"],
                    ["2", "Front view (XY)"],
                    ["3", "Top view (XZ)"],
                    ["4", "Side view (YZ)"],
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
                  <li>• <strong>Objects snap</strong> to each other when edges are close — blue guide lines appear when aligned</li>
                  <li>• Press <strong>R</strong> to enter rotation mode, then drag an object to rotate it. Angle display shown while dragging</li>
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
