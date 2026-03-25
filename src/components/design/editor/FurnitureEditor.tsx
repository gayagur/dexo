import { useState, useCallback, useEffect, useRef } from "react";
import { EditorViewport } from "./EditorViewport";
import { EditorSidebar } from "./EditorSidebar";
import { EditorParameters } from "./EditorParameters";
import { DesignChatPanel } from "./DesignChatPanel";
import { AddPartPicker } from "./AddPartPicker";
import { LibraryBrowser } from "./LibraryBrowser";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDefaultTemplate,
  type PanelData,
  type PanelShape,
  type FurnitureOption,
} from "@/lib/furnitureData";
import type { GroupData, EditorSceneData } from "@/lib/furnitureData";
import {
  createGroupFromPanels,
  panelsToWorldSpace,
  panelsToRelative,
  computeBoundingBoxCenter,
  computeGroupXOffset,
  flattenScene,
  getWorldPointOnPanelTop,
  findGroupContainingPanel,
} from "@/lib/groupUtils";
import type { LibraryTemplate } from "@/lib/libraryData";
import { ArrowLeft, Save, RotateCcw, RotateCw, MessageSquare, Magnet, HelpCircle, X, BookOpen, Undo2, Redo2, Box, Square, PanelTop, PanelLeft, ImagePlus, Loader2, Home, Sun, Moon, Check, LogOut, SendHorizonal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ViewMode, EditorLightMode, EditorFloorPreset } from "./EditorViewport";
import { EDITOR_FLOOR_OPTIONS } from "./EditorViewport";
import { uploadFurnitureImage, analyzeFurnitureImage, type FurnitureAnalysis } from "@/lib/ai";

interface FurnitureEditorProps {
  furnitureType: FurnitureOption;
  roomLabel: string;
  spaceType?: "home" | "commercial";
  onBack: () => void;
  onSave?: (data: {
    panels: EditorSceneData;
    dims: { w: number; h: number; d: number };
    style: string;
    furnitureId: string;
    cameraPosition?: [number, number, number];
    materialsUsed?: string[];
  }) => void | Promise<void>;
}

let nextPanelId = 100;

export function FurnitureEditor({
  furnitureType,
  roomLabel,
  spaceType,
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
  const [lightMode, setLightMode] = useState<EditorLightMode>("day");
  const [floorPreset, setFloorPreset] = useState<EditorFloorPreset>("studio");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<{ action: () => void } | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHistoryIndex = useRef(0);
  const editorNavigate = useNavigate();

  const defaultTemplate = getDefaultTemplate(furnitureType.id, furnitureType.defaultDims);

  // ─── Group / Edit mode state ─────────────────────────
  const initialGroup = createGroupFromPanels(furnitureType.label, defaultTemplate.panels);
  const [groups, setGroups] = useState<GroupData[]>([initialGroup]);
  const [ungroupedPanels, setUngroupedPanels] = useState<PanelData[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);

  // ─── Undo / Redo History ───────────────────────────────
  const MAX_HISTORY = 50;
  const historyRef = useRef<EditorSceneData[]>([
    { groups: structuredClone([initialGroup]), ungroupedPanels: [] },
  ]);
  const historyIndexRef = useRef(0);
  const [, setHistoryVersion] = useState(0);

  const pushHistory = useCallback((newGroups: GroupData[], newUngrouped: PanelData[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({
      groups: structuredClone(newGroups),
      ungroupedPanels: structuredClone(newUngrouped),
    });
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryVersion((v) => v + 1);
    // Mark as unsaved when user makes changes
    setSaveStatus((s) => s === "saving" ? s : "unsaved");
    // Auto-save: debounce 60s after last change
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSaveRef.current?.();
    }, 60_000);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const prev = structuredClone(historyRef.current[historyIndexRef.current]);
    setGroups(prev.groups);
    setUngroupedPanels(prev.ungroupedPanels);
    setSelectedPanelId(null);
    setSelectedGroupId(null);
    setHistoryVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const next = structuredClone(historyRef.current[historyIndexRef.current]);
    setGroups(next.groups);
    setUngroupedPanels(next.ungroupedPanels);
    setSelectedPanelId(null);
    setSelectedGroupId(null);
    setHistoryVersion((v) => v + 1);
  }, []);

  // ─── Refs & updateScene wrapper ────────────────────────
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const ungroupedRef = useRef(ungroupedPanels);
  ungroupedRef.current = ungroupedPanels;

  const updateScene = useCallback((
    groupsUpdater: (prev: GroupData[]) => GroupData[],
    ungroupedUpdater?: (prev: PanelData[]) => PanelData[]
  ) => {
    const nextGroups = groupsUpdater(groupsRef.current);
    const nextUngrouped = ungroupedUpdater ? ungroupedUpdater(ungroupedRef.current) : ungroupedRef.current;
    setGroups(nextGroups);
    setUngroupedPanels(nextUngrouped);
    pushHistory(nextGroups, nextUngrouped);
  }, [pushHistory]);

  // ─── Edit mode state ───────────────────────────────────
  const [editModePanels, setEditModePanels] = useState<PanelData[] | null>(null);

  const enterEditMode = useCallback((groupId: string) => {
    const group = groupsRef.current.find((g) => g.id === groupId);
    if (!group) return;
    const worldPanels = panelsToWorldSpace(group.panels, group.position, group.rotation);
    setEditModePanels(worldPanels);
    setEditingGroupId(groupId);
    setSelectedGroupId(null);
    setSelectedPanelId(null);
    setSelectedPanelIds([]);
    pushHistory(groupsRef.current, ungroupedRef.current);
  }, [pushHistory]);

  const exitEditMode = useCallback(() => {
    if (!editingGroupId) return;
    const group = groupsRef.current.find((g) => g.id === editingGroupId);
    if (!group) { setEditingGroupId(null); setEditModePanels(null); return; }
    const worldPanels = editModePanels ?? panelsToWorldSpace(group.panels, group.position, group.rotation);
    const center = computeBoundingBoxCenter(worldPanels);
    const relativePanels = panelsToRelative(worldPanels, center, [0, 0, 0]);
    const updatedGroup: GroupData = { ...group, position: center, rotation: [0, 0, 0], panels: relativePanels };
    updateScene((prev) => prev.map((g) => g.id === editingGroupId ? updatedGroup : g));
    setEditingGroupId(null);
    setSelectedGroupId(editingGroupId);
    setSelectedPanelId(null);
    setEditModePanels(null);
  }, [editingGroupId, editModePanels, updateScene]);

  // ─── Derived state ─────────────────────────────────────
  const activePanels: PanelData[] = editingGroupId ? (editModePanels ?? []) : ungroupedPanels;
  const selectedPanel = activePanels.find((p) => p.id === selectedPanelId) ?? null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  // ─── Panel callbacks ───────────────────────────────────
  const handleUpdatePanel = useCallback((id: string, updates: Partial<PanelData>) => {
    if (editingGroupId) {
      setEditModePanels((prev) =>
        (prev ?? []).map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    } else {
      // Check ungrouped first
      const inUngrouped = ungroupedRef.current.some((p) => p.id === id);
      if (inUngrouped) {
        updateScene(
          (g) => g,
          (prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
        );
      } else {
        // Panel is inside a group — update within its group
        updateScene((prev) =>
          prev.map((g) => ({
            ...g,
            panels: g.panels.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          }))
        );
      }
    }
  }, [editingGroupId, updateScene]);

  const handleAddPart = useCallback((preset: {
    shape: PanelShape;
    type: PanelData["type"];
    label: string;
    size: [number, number, number];
    materialId: string;
    shapeParams?: Record<string, number>;
    placeOnSelected?: boolean;
  }) => {
    const id = `p${++nextPanelId}`;
    const currentPanels = editingGroupId ? (editModePanels ?? []) : flattenScene(groupsRef.current, ungroupedRef.current);

    let posX = 0;
    let posZ = 0;
    let startY = preset.size[1] / 2;

    const tryPlaceOnSelection = (): boolean => {
      const sid = selectedPanelId;
      if (!sid) return false;

      if (editingGroupId) {
        const panel = (editModePanels ?? []).find((p) => p.id === sid);
        if (!panel) return false;
        const [wx, wy, wz] = getWorldPointOnPanelTop(panel, null);
        posX = wx;
        posZ = wz;
        startY = wy + preset.size[1] / 2;
        return true;
      }

      const ung = ungroupedRef.current.find((p) => p.id === sid);
      if (ung) {
        const [wx, wy, wz] = getWorldPointOnPanelTop(ung, null);
        posX = wx;
        posZ = wz;
        startY = wy + preset.size[1] / 2;
        return true;
      }

      const grp = findGroupContainingPanel(sid, groupsRef.current);
      const panel = grp?.panels.find((p) => p.id === sid);
      if (grp && panel) {
        const [wx, wy, wz] = getWorldPointOnPanelTop(panel, grp);
        posX = wx;
        posZ = wz;
        startY = wy + preset.size[1] / 2;
        return true;
      }
      return false;
    };

    if (preset.placeOnSelected) {
      if (!tryPlaceOnSelection()) {
        const horizontalSurfaces = currentPanels.filter((p) => p.type === "horizontal");
        if (horizontalSurfaces.length > 0) {
          let bestWy = -Infinity;
          let bestX = 0;
          let bestZ = 0;
          for (const p of horizontalSurfaces) {
            const [wx, wy, wz] = getWorldPointOnPanelTop(p, null);
            if (wy > bestWy) {
              bestWy = wy;
              bestX = wx;
              bestZ = wz;
            }
          }
          posX = bestX;
          posZ = bestZ;
          startY = bestWy + preset.size[1] / 2;
        }
      }
    } else {
      const horizontalSurfaces = currentPanels.filter((p) => p.type === "horizontal");
      if (horizontalSurfaces.length > 0) {
        const highestSurfaceTop = Math.max(
          ...horizontalSurfaces.map((p) => p.position[1] + p.size[1] / 2)
        );
        startY = highestSurfaceTop + preset.size[1] / 2;
      }
    }

    const newPanel: PanelData = {
      id,
      type: preset.type,
      shape: preset.shape === "box" ? undefined : preset.shape,
      shapeParams: preset.shapeParams,
      label: preset.label,
      position: [posX, startY, posZ],
      size: preset.size,
      materialId: preset.materialId,
    };

    if (editingGroupId) {
      setEditModePanels((prev) => [...(prev ?? []), newPanel]);
    } else {
      updateScene((g) => g, (prev) => [...prev, newPanel]);
    }
    setSelectedPanelId(id);
  }, [editingGroupId, editModePanels, updateScene, selectedPanelId]);

  const handleDuplicatePanel = useCallback((id: string) => {
    const currentPanels = editingGroupId ? (editModePanels ?? []) : [...ungroupedRef.current, ...groupsRef.current.flatMap((g) => g.panels)];
    const source = currentPanels.find((p) => p.id === id);
    if (!source) return;
    const newId = `p${++nextPanelId}`;
    const clone: PanelData = {
      ...source,
      id: newId,
      label: `${source.label} Copy`,
      position: [
        source.position[0] + 0.05,
        source.position[1],
        source.position[2] - 0.05,
      ],
    };

    if (editingGroupId) {
      setEditModePanels((prev) => [...(prev ?? []), clone]);
    } else {
      updateScene((g) => g, (prev) => [...prev, clone]);
    }
    setSelectedPanelId(newId);
  }, [editingGroupId, editModePanels, updateScene]);

  const handleDuplicateGroup = useCallback((groupId: string) => {
    const source = groupsRef.current.find((g) => g.id === groupId);
    if (!source) return;
    const newGroupId = crypto.randomUUID();
    const clonedPanels = source.panels.map((p) => ({
      ...p,
      id: `p${++nextPanelId}`,
      label: p.label,
    }));
    const clone: GroupData = {
      ...source,
      id: newGroupId,
      name: `${source.name} Copy`,
      position: [source.position[0] + 0.05, source.position[1], source.position[2] - 0.05] as [number, number, number],
      panels: clonedPanels,
    };
    updateScene((prev) => [...prev, clone]);
    setSelectedGroupId(newGroupId);
    setSelectedPanelId(null);
  }, [updateScene]);

  const handleDeletePanel = useCallback((id: string) => {
    if (editingGroupId) {
      setEditModePanels((prev) => (prev ?? []).filter((p) => p.id !== id));
    } else {
      // Try ungrouped first
      const inUngrouped = ungroupedRef.current.some((p) => p.id === id);
      if (inUngrouped) {
        updateScene((g) => g, (prev) => prev.filter((p) => p.id !== id));
      } else {
        // Remove from within a group
        updateScene(
          (prev) => prev.map((g) => ({
            ...g,
            panels: g.panels.filter((p) => p.id !== id),
          })).filter((g) => g.panels.length > 0)
        );
      }
    }
    if (selectedPanelId === id) setSelectedPanelId(null);
  }, [editingGroupId, selectedPanelId, updateScene]);

  // ─── Group callbacks ───────────────────────────────────
  const handleUpdateGroup = useCallback((groupId: string, updates: Partial<GroupData>) => {
    updateScene((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  }, [updateScene]);

  const handleDeleteGroup = useCallback((groupId: string) => {
    updateScene((prev) => prev.filter((g) => g.id !== groupId));
    if (selectedGroupId === groupId) setSelectedGroupId(null);
    if (editingGroupId === groupId) {
      setEditingGroupId(null);
      setEditModePanels(null);
    }
  }, [selectedGroupId, editingGroupId, updateScene]);

  const handleGroupPanels = useCallback((panelIds: string[], name?: string) => {
    const panelsToGroup = ungroupedRef.current.filter((p) => panelIds.includes(p.id));
    if (panelsToGroup.length === 0) return;
    const newGroup = createGroupFromPanels(name ?? "Group", panelsToGroup);
    updateScene(
      (prev) => [...prev, newGroup],
      (prev) => prev.filter((p) => !panelIds.includes(p.id))
    );
    setSelectedGroupId(newGroup.id);
    setSelectedPanelId(null);
    setSelectedPanelIds([]);
  }, [updateScene]);

  const handleUngroupGroup = useCallback((groupId: string) => {
    const group = groupsRef.current.find((g) => g.id === groupId);
    if (!group) return;
    const worldPanels = panelsToWorldSpace(group.panels, group.position, group.rotation);
    updateScene(
      (prev) => prev.filter((g) => g.id !== groupId),
      (prev) => [...prev, ...worldPanels]
    );
    setSelectedGroupId(null);
  }, [updateScene]);

  const handleRenameGroup = useCallback((groupId: string, name: string) => {
    updateScene((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name } : g))
    );
  }, [updateScene]);

  // ─── Build from image analysis ────────────────────────
  const handleBuildFromImage = useCallback((analysis: FurnitureAnalysis, mode: "replace" | "add") => {
    const newPanels: PanelData[] = analysis.panels.map((p) => ({
      id: `p${++nextPanelId}`,
      type: p.type,
      shape: p.shape === "box" ? undefined : (p.shape as PanelShape),
      label: p.label,
      position: p.position,
      size: p.size,
      materialId: p.materialId,
    }));

    const newGroup = createGroupFromPanels(analysis.name ?? "Imported", newPanels);

    if (mode === "replace") {
      setDims(analysis.estimatedDims);
      const nextGroups = [newGroup];
      setGroups(nextGroups);
      setUngroupedPanels([]);
      pushHistory(nextGroups, []);
    } else {
      const offset = computeGroupXOffset(groupsRef.current);
      const offsetGroup: GroupData = {
        ...newGroup,
        position: [newGroup.position[0] + offset, newGroup.position[1], newGroup.position[2]],
      };
      updateScene((prev) => [...prev, offsetGroup]);
    }
    setSelectedPanelId(null);
  }, [pushHistory, updateScene]);

  // ─── Toolbar image import ────────────────────────────
  // Camera position ref (updated by viewport via onCameraMove)
  const cameraPositionRef = useRef<[number, number, number]>([2.5, 2, 3]);
  const handleSaveRef = useRef<(() => void) | null>(null);
  const toolbarFileRef = useRef<HTMLInputElement>(null);
  const [isToolbarAnalyzing, setIsToolbarAnalyzing] = useState(false);

  const handleToolbarImageImport = useCallback(async (file: File) => {
    setIsToolbarAnalyzing(true);
    const { url, error: uploadErr } = await uploadFurnitureImage(file);
    if (uploadErr || !url) {
      setIsToolbarAnalyzing(false);
      alert(uploadErr || "Upload failed");
      return;
    }
    const { data: analysis, error: analysisErr } = await analyzeFurnitureImage(url);
    setIsToolbarAnalyzing(false);
    if (analysisErr || !analysis) {
      alert(analysisErr || "Analysis failed");
      return;
    }
    const action = window.confirm(
      `Detected: ${analysis.name} (${analysis.panels.length} components)\n\nOK = Replace current design\nCancel = Add alongside`
    );
    handleBuildFromImage(analysis, action ? "replace" : "add");
  }, [handleBuildFromImage]);

  const handleSave = useCallback(async () => {
    if (!onSave || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const allPanels = [...groups.flatMap((g) => g.panels), ...ungroupedPanels];
      const materialsUsed = [...new Set(allPanels.map((p) => p.materialId))];
      await onSave({
        panels: { groups, ungroupedPanels },
        dims,
        style,
        furnitureId: furnitureType.id,
        cameraPosition: cameraPositionRef.current,
        materialsUsed,
      });
      lastSavedHistoryIndex.current = historyIndexRef.current;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => s === "saved" ? "idle" : s), 2500);
    } catch {
      setSaveStatus("unsaved");
    }
  }, [groups, ungroupedPanels, dims, style, furnitureType.id, onSave, saveStatus]);

  // Keep ref in sync for auto-save timer
  handleSaveRef.current = handleSave;

  const handleSaveAndExit = useCallback(async () => {
    await handleSave();
    editorNavigate("/dashboard");
  }, [handleSave, editorNavigate]);

  const handleFinishSubmit = useCallback(async () => {
    await handleSave();
    // Navigate to project creation with design context
    editorNavigate("/create-project");
  }, [handleSave, editorNavigate]);

  const guardedNavigate = useCallback((action: () => void) => {
    if (saveStatus === "unsaved" || historyIndexRef.current !== lastSavedHistoryIndex.current) {
      setShowLeaveConfirm({ action });
    } else {
      action();
    }
  }, [saveStatus]);

  const handleLoadTemplate = useCallback((template: LibraryTemplate) => {
    const newDims = template.dims;
    const newPanels = template.buildPanels(newDims).map((p) => ({
      ...p,
      id: `p${++nextPanelId}`,
    }));
    const newGroup = createGroupFromPanels(template.name ?? "Template", newPanels);
    const offset = computeGroupXOffset(groupsRef.current);
    const offsetGroup: GroupData = {
      ...newGroup,
      position: [newGroup.position[0] + offset, newGroup.position[1], newGroup.position[2]],
    };
    updateScene((prev) => [...prev, offsetGroup]);
    setSelectedPanelId(null);
    setShowLibrary(false);
  }, [updateScene]);

  const handleImportModel = useCallback((group: GroupData) => {
    const offset = computeGroupXOffset(groupsRef.current);
    const offsetGroup: GroupData = {
      ...group,
      position: [group.position[0] + offset, group.position[1], group.position[2]],
    };
    updateScene((prev) => [...prev, offsetGroup]);
    setSelectedGroupId(offsetGroup.id);
    setSelectedPanelId(null);
    setShowLibrary(false);
  }, [updateScene]);

  const handleDimsChange = useCallback((newDims: { w: number; h: number; d: number }) => {
    const oldDims = dims;
    setDims(newDims);

    const scaleX = newDims.w / (oldDims.w || 1);
    const scaleY = newDims.h / (oldDims.h || 1);
    const scaleZ = newDims.d / (oldDims.d || 1);

    if (scaleX !== 1 || scaleY !== 1 || scaleZ !== 1) {
      if (editingGroupId) {
        // Scale panels within edit mode
        setEditModePanels((prev) =>
          (prev ?? []).map((p) => ({
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
      } else if (groups.length === 1 && ungroupedPanels.length === 0) {
        // Scale the single group's panels
        updateScene((prev) =>
          prev.map((g) => ({
            ...g,
            position: [
              g.position[0] * scaleX,
              g.position[1] * scaleY,
              g.position[2] * scaleZ,
            ] as [number, number, number],
            panels: g.panels.map((p) => ({
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
            })),
          }))
        );
      }
    }
  }, [dims, editingGroupId, groups.length, ungroupedPanels.length, updateScene]);

  const handleReset = useCallback(() => {
    const template = getDefaultTemplate(furnitureType.id, dims);
    const newGroup = createGroupFromPanels(furnitureType.label, template.panels);
    const nextGroups = [newGroup];
    setGroups(nextGroups);
    setUngroupedPanels([]);
    setSelectedPanelId(null);
    setSelectedGroupId(null);
    setEditingGroupId(null);
    setEditModePanels(null);
    setSelectedPanelIds([]);
    pushHistory(nextGroups, []);
  }, [furnitureType.id, furnitureType.label, dims, pushHistory]);

  // ─── Chat panel callbacks ──────────────────────────────
  const handleUpdatePanelMaterial = useCallback(
    (panelLabel: string, materialId: string) => {
      if (editingGroupId) {
        setEditModePanels((prev) =>
          (prev ?? []).map((p) =>
            p.label.toLowerCase() === panelLabel.toLowerCase()
              ? { ...p, materialId }
              : p
          )
        );
      } else {
        updateScene(
          (prev) => prev.map((g) => ({
            ...g,
            panels: g.panels.map((p) =>
              p.label.toLowerCase() === panelLabel.toLowerCase()
                ? { ...p, materialId }
                : p
            ),
          })),
          (prev) => prev.map((p) =>
            p.label.toLowerCase() === panelLabel.toLowerCase()
              ? { ...p, materialId }
              : p
          )
        );
      }
    },
    [editingGroupId, updateScene]
  );

  // Scale all panels in a group proportionally
  const handleScaleGroup = useCallback((groupId: string, scaleX: number, scaleY: number, scaleZ: number) => {
    updateScene((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      // For GLB models, accumulate scale transform
      const prevScale = g.scale ?? [1, 1, 1];
      return {
        ...g,
        scale: [prevScale[0] * scaleX, prevScale[1] * scaleY, prevScale[2] * scaleZ] as [number, number, number],
        panels: g.panels.map((p) => ({
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
        })),
      };
    }));
  }, [updateScene]);

  // Change material of all panels in a group
  const handleUpdateGroupMaterial = useCallback((groupId: string, materialId: string) => {
    updateScene((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        panels: g.panels.map((p) => ({ ...p, materialId, customColor: undefined })),
      };
    }));
  }, [updateScene]);

  const handleCustomGroupColor = useCallback((groupId: string, color: string) => {
    updateScene((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        panels: g.panels.map((p) => ({ ...p, customColor: color })),
      };
    }));
  }, [updateScene]);

  const handleUpdateGroupTexture = useCallback((groupId: string, textureUrl: string) => {
    updateScene((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        glbUrl: undefined,
        panels: g.panels.map((p) => ({ ...p, textureUrl, customColor: undefined })),
      };
    }));
  }, [updateScene]);

  const handleUpdateAllMaterials = useCallback((materialId: string) => {
    if (editingGroupId) {
      setEditModePanels((prev) =>
        (prev ?? []).map((p) => ({ ...p, materialId }))
      );
    } else {
      updateScene(
        (prev) => prev.map((g) => ({
          ...g,
          panels: g.panels.map((p) => ({ ...p, materialId })),
        })),
        (prev) => prev.map((p) => ({ ...p, materialId }))
      );
    }
  }, [editingGroupId, updateScene]);

  const handleChatRemovePanel = useCallback((panelLabel: string) => {
    if (editingGroupId) {
      setEditModePanels((prev) =>
        (prev ?? []).filter((p) => p.label.toLowerCase() !== panelLabel.toLowerCase())
      );
    } else {
      updateScene(
        (prev) => prev.map((g) => ({
          ...g,
          panels: g.panels.filter((p) => p.label.toLowerCase() !== panelLabel.toLowerCase()),
        })).filter((g) => g.panels.length > 0),
        (prev) => prev.filter((p) => p.label.toLowerCase() !== panelLabel.toLowerCase())
      );
    }
  }, [editingGroupId, updateScene]);

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
    if (editingGroupId) {
      setEditModePanels((prev) => [...(prev ?? []), newPanel]);
    } else {
      updateScene((g) => g, (prev) => [...prev, newPanel]);
    }
  }, [editingGroupId, updateScene]);

  // ─── Warn on navigation with unsaved changes ──────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" || historyIndexRef.current !== lastSavedHistoryIndex.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [saveStatus]);

  // ─── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Ctrl+S — Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

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

      // Ctrl+G — group selected panels
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault();
        if (selectedPanelIds.length >= 2 && !editingGroupId) {
          handleGroupPanels(selectedPanelIds);
        }
        return;
      }

      // Ctrl+Shift+G — ungroup selected group
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && e.shiftKey) {
        e.preventDefault();
        if (selectedGroupId && !editingGroupId) {
          handleUngroupGroup(selectedGroupId);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedPanelId) handleDuplicatePanel(selectedPanelId);
        else if (selectedGroupId && !editingGroupId) handleDuplicateGroup(selectedGroupId);
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace")) {
        // Multi-select delete
        if (selectedPanelIds.length > 0 && editingGroupId) {
          for (const pid of selectedPanelIds) handleDeletePanel(pid);
          setSelectedPanelIds([]);
          return;
        }
        // Single panel delete
        if (selectedPanelId) {
          handleDeletePanel(selectedPanelId);
          return;
        }
        // Group delete
        if (selectedGroupId && !editingGroupId) {
          handleDeleteGroup(selectedGroupId);
          return;
        }
        return;
      }

      // Arrow keys — nudge selected panel or group
      const nudge = e.shiftKey ? 0.001 : 0.01;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (selectedPanelId) {
          const panels = editingGroupId ? (editModePanels ?? []) : ungroupedRef.current;
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
        } else if (selectedGroupId && !editingGroupId) {
          const group = groupsRef.current.find((g) => g.id === selectedGroupId);
          if (group) {
            const pos = [...group.position] as [number, number, number];
            switch (e.key) {
              case "ArrowLeft": pos[0] -= nudge; break;
              case "ArrowRight": pos[0] += nudge; break;
              case "ArrowUp": pos[1] += nudge; break;
              case "ArrowDown": pos[1] -= nudge; break;
            }
            handleUpdateGroup(selectedGroupId, { position: pos });
          }
        }
        return;
      }

      switch (e.key) {
        case "r":
        case "R":
          if (!e.ctrlKey && !e.metaKey) setRotationMode((v) => !v);
          break;
        case "Escape":
          if (rotationMode) {
            setRotationMode(false);
          } else if (editingGroupId) {
            exitEditMode();
          }
          break;
        case "1": if (!e.ctrlKey && !e.metaKey) setViewMode("3d"); break;
        case "2": if (!e.ctrlKey && !e.metaKey) setViewMode("front"); break;
        case "3": if (!e.ctrlKey && !e.metaKey) setViewMode("top"); break;
        case "4": if (!e.ctrlKey && !e.metaKey) setViewMode("side"); break;
        case "l":
        case "L":
          if (!e.ctrlKey && !e.metaKey) {
            setLightMode((m) => (m === "day" ? "night" : "day"));
          }
          break;
        case "?": setShowHelp((v) => !v); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedPanelId, selectedGroupId, selectedPanelIds, editingGroupId, editModePanels, rotationMode, handleUpdatePanel, handleDuplicatePanel, handleDuplicateGroup, handleDeletePanel, handleDeleteGroup, handleGroupPanels, handleUngroupGroup, handleUpdateGroup, exitEditMode, undo, redo, handleSave]);

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA]">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8" title="Back to selection">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <nav className="flex items-center gap-1 text-xs">
            <button onClick={() => editorNavigate("/dashboard")} className="text-gray-400 hover:text-[#C87D5A] transition-colors font-medium" title="Home">
              DEXO
            </button>
            <span className="text-gray-300">/</span>
            <button onClick={() => editorNavigate("/new-project")} className="text-gray-400 hover:text-[#C87D5A] transition-colors">
              Design Studio
            </button>
            {spaceType && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-400">{spaceType === "home" ? "Home" : "Commercial"}</span>
              </>
            )}
            {roomLabel && (
              <>
                <span className="text-gray-300">/</span>
                <button onClick={onBack} className="text-gray-400 hover:text-[#C87D5A] transition-colors">
                  {roomLabel}
                </button>
              </>
            )}
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold">{furnitureType.label}</span>
          </nav>
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

          {/* Scene lighting — day vs dim night */}
          <div className="flex items-center h-8 rounded-lg border border-gray-200 overflow-hidden">
            {([
              { mode: "day" as const, label: "Day", icon: Sun },
              { mode: "night" as const, label: "Night", icon: Moon },
            ]).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                title={`${label} lighting (L)`}
                onClick={() => setLightMode(mode)}
                className={`h-full px-2 flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  lightMode === mode
                    ? "bg-[#1B2432] text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          <Select
            value={floorPreset}
            onValueChange={(v) => setFloorPreset(v as EditorFloorPreset)}
          >
            <SelectTrigger
              className="h-8 w-[132px] shrink-0 text-xs border-gray-200 bg-white"
              title="Floor & backdrop style"
            >
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              {EDITOR_FLOOR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          {/* Mode indicator badge */}
          {editingGroupId ? (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                Editing: {groups.find((g) => g.id === editingGroupId)?.name ?? "Group"}
              </span>
              <Button variant="outline" size="sm" onClick={exitEditMode} className="h-7 text-xs">Done</Button>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">Scene Mode</span>
          )}

          <Button
            variant={showLibrary ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLibrary((v) => !v)}
            className={`h-8 ${showLibrary ? "bg-[#1B2432] hover:bg-[#2A3544] text-white" : ""}`}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Library
          </Button>

          {/* Import from Image */}
          <input
            ref={toolbarFileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleToolbarImageImport(file);
              e.target.value = "";
            }}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => toolbarFileRef.current?.click()}
            disabled={isToolbarAnalyzing}
            className="h-8"
          >
            {isToolbarAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isToolbarAnalyzing ? "Analyzing..." : "From Image"}
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

          {/* Save status indicator */}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-[11px] text-green-600">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
              ● Unsaved
            </span>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="h-8 bg-[#C87D5A] hover:bg-[#B06B4A] text-white"
            title="Save (Ctrl+S)"
          >
            {saveStatus === "saving" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => guardedNavigate(handleSaveAndExit)}
            className="h-8"
            title="Save and return to dashboard"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Save & Exit
          </Button>
          <Button
            size="sm"
            onClick={() => guardedNavigate(handleFinishSubmit)}
            className="h-8 bg-[#1B2432] hover:bg-[#2A3544] text-white"
            title="Save and submit to creators"
          >
            <SendHorizonal className="w-3.5 h-3.5 mr-1.5" />
            Finish & Submit
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
            panels={activePanels}
            selectedPanelId={selectedPanelId}
            onSelectPanel={setSelectedPanelId}
            onAddPanel={() => setShowAddPicker(true)}
            onDuplicatePanel={handleDuplicatePanel}
            onDeletePanel={handleDeletePanel}
            groups={groups}
            ungroupedPanels={ungroupedPanels}
            editingGroupId={editingGroupId}
            editingPanels={editModePanels}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onDeleteGroup={handleDeleteGroup}
            onEnterEditMode={enterEditMode}
            onExitEditMode={exitEditMode}
            onRenameGroup={handleRenameGroup}
            onGroupPanels={handleGroupPanels}
            onUngroupGroup={handleUngroupGroup}
          />
        )}

        <div className="flex-1 p-3">
          <EditorViewport
            panels={activePanels}
            selectedPanelId={selectedPanelId}
            snapEnabled={snapEnabled}
            rotationMode={rotationMode}
            viewMode={viewMode}
            onSelectPanel={setSelectedPanelId}
            onUpdatePanel={handleUpdatePanel}
            groups={groups}
            ungroupedPanels={ungroupedPanels}
            editingGroupId={editingGroupId}
            editingPanels={editModePanels}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onUpdateGroup={handleUpdateGroup}
            onEnterEditMode={enterEditMode}
            onExitEditMode={exitEditMode}
            onRenameGroup={handleRenameGroup}
            onUngroupGroup={handleUngroupGroup}
            onDeleteGroup={handleDeleteGroup}
            onScaleGroup={handleScaleGroup}
            lightMode={lightMode}
            floorPreset={floorPreset}
            onCameraMove={(pos) => { cameraPositionRef.current = pos; }}
          />
        </div>

        <EditorParameters
          panel={selectedPanel}
          overallDims={dims}
          onUpdatePanel={handleUpdatePanel}
          onUpdateDims={handleDimsChange}
          style={style}
          onStyleChange={setStyle}
          selectedGroup={selectedGroup}
          showOverallDims={!editingGroupId}
          editingGroupId={editingGroupId}
          onUpdateGroup={handleUpdateGroup}
          onScaleGroup={handleScaleGroup}
          onUpdateGroupMaterial={handleUpdateGroupMaterial}
          onCustomGroupColor={handleCustomGroupColor}
          onUpdateGroupTexture={handleUpdateGroupTexture}
          multiSelectCount={selectedPanelIds.length}
        />

        {chatOpen && (
          <DesignChatPanel
            furnitureType={furnitureType}
            dims={dims}
            style={style}
            panels={flattenScene(groups, ungroupedPanels)}
            onUpdateDims={handleDimsChange}
            onUpdateStyle={setStyle}
            onUpdatePanelMaterial={handleUpdatePanelMaterial}
            onUpdateAllMaterials={handleUpdateAllMaterials}
            onRemovePanel={handleChatRemovePanel}
            onAddPanel={handleChatAddPanel}
            onBuildFromImage={handleBuildFromImage}
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
                    ["Esc", "Exit rotation mode / edit mode"],
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

              {/* Groups & Edit Mode */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Groups & Edit Mode</h4>
                <div className="space-y-1.5">
                  {[
                    ["Double-click", "Enter edit mode (edit parts inside a group)"],
                    ["Escape", "Exit edit mode (back to scene)"],
                    ["Ctrl + G", "Group selected panels"],
                    ["Ctrl + Shift + G", "Ungroup selected group"],
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

              {/* Lighting */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Canvas lighting</h4>
                <div className="space-y-1.5">
                  {[
                    ["Floor (dropdown)", "Bright studio, parquet, tile, or grass — backdrop matches preset"],
                    ["Day / Night (toolbar)", "Day is bright; Night dims the scene and backdrop"],
                    ["L", "Toggle day ↔ night lighting"],
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
                    ["Double-click", "Toggle door/drawer (in edit mode)"],
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
                  <li>• <strong>+ Add</strong> — use <strong>On selected surface</strong> to drop pillows, cushions, vases, etc. on whatever you clicked; other parts stack on the highest surface by default</li>
                  <li>• Hover over any panel in the sidebar to see <strong>duplicate</strong> and <strong>delete</strong> buttons</li>
                  <li>• <strong>Objects snap</strong> to each other when edges are close — blue guide lines appear when aligned</li>
                  <li>• Press <strong>R</strong> to enter rotation mode, then drag an object to rotate it. Angle display shown while dragging</li>
                  <li>• Use the <strong>AI Assistant</strong> to change materials or dimensions by chatting</li>
                  <li>• <strong>Ctrl+G</strong> groups selected panels; <strong>Ctrl+Shift+G</strong> ungroups</li>
                  <li>• <strong>Double-click</strong> a group to enter edit mode; press <strong>Esc</strong> or click <strong>Done</strong> to exit</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes confirmation dialog */}
      {showLeaveConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6 border border-gray-200">
            <h3 className="text-base font-serif font-semibold text-gray-900 mb-2">Unsaved Changes</h3>
            <p className="text-sm text-gray-500 mb-5">You have unsaved changes. Would you like to save before leaving?</p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowLeaveConfirm(null); showLeaveConfirm.action(); }}
              >
                Don't Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#C87D5A] hover:bg-[#B06B4A] text-white"
                onClick={async () => {
                  await handleSave();
                  setShowLeaveConfirm(null);
                  showLeaveConfirm.action();
                }}
              >
                Save & Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
