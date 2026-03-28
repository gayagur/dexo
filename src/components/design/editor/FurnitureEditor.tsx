import { useState, useCallback, useEffect, useRef } from "react";
import { EditorViewport } from "./EditorViewport";
import { EditorSidebar } from "./EditorSidebar";
import { EditorParameters } from "./EditorParameters";
import { DesignChatPanel } from "./DesignChatPanel";
import { AddPartPicker } from "./AddPartPicker";
import { LibraryBrowser } from "./LibraryBrowser";
import { SubmitToLibraryDialog } from "./SubmitToLibraryDialog";
import { fetchCommunityTemplates, type CommunityTemplate } from "@/lib/library-api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getDefaultTemplate,
  type PanelData,
  type PanelShape,
  type FurnitureOption,
} from "@/lib/furnitureData";
import type { GroupData, EditorSceneData } from "@/lib/furnitureData";
import {
  alignPanelsBottomToWorldY,
  createGroupFromPanels,
  EDITOR_LIBRARY_FLOOR_Y,
  panelsToWorldSpace,
  panelsToRelative,
  computeBoundingBoxCenter,
  computeGroupXOffset,
  flattenScene,
  getWorldPointOnPanelTop,
  findGroupContainingPanel,
} from "@/lib/groupUtils";
import type { LibraryTemplate } from "@/lib/libraryData";
import { ArrowLeft, Save, RotateCcw, MessageSquare, Magnet, HelpCircle, X, Undo2, Redo2, Box, Square, PanelTop, PanelLeft, Loader2, Sun, Moon, Check, LogOut, SendHorizonal, MoreVertical, Upload, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMobileInfo } from "@/hooks/use-mobile";
import { MobileDrawer } from "@/components/ui/MobileDrawer";
import { MobileEditorToolbar } from "./MobileEditorToolbar";
import { MobileEditorBar } from "./MobileEditorBar";
import type { ViewMode, EditorLightMode, EditorFloorPreset } from "./EditorViewport";
import { EDITOR_FLOOR_OPTIONS } from "./EditorViewport";
import { uploadFurnitureImage, analyzeFurnitureImage, generate3DFromImage, type FurnitureAnalysis } from "@/lib/ai";
import { panelsFromFurnitureAnalysis } from "@/lib/furnitureImageAnalysis";

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
  /** Resume a row from `furniture_designs` (groups, dims, style, camera). */
  initialEditorState?: {
    groups: GroupData[];
    ungroupedPanels?: PanelData[];
    dims?: { w: number; h: number; d: number };
    style?: string;
    cameraPosition?: [number, number, number];
  };
}

function buildEditorBootstrap(
  furnitureType: FurnitureOption,
  initialEditorState?: FurnitureEditorProps["initialEditorState"],
): {
  scene: EditorSceneData;
  dims: { w: number; h: number; d: number };
  style: string;
  cameraPosition: [number, number, number];
} {
  if (initialEditorState?.groups?.length) {
    return {
      scene: {
        groups: structuredClone(initialEditorState.groups),
        ungroupedPanels: structuredClone(initialEditorState.ungroupedPanels ?? []),
      },
      dims: initialEditorState.dims ?? furnitureType.defaultDims,
      style: initialEditorState.style ?? "Modern",
      cameraPosition: initialEditorState.cameraPosition ?? [2.5, 2, 3],
    };
  }
  const defaultTemplate = getDefaultTemplate(furnitureType.id, furnitureType.defaultDims);
  const initialGroup = createGroupFromPanels(furnitureType.label, defaultTemplate.panels);
  return {
    scene: { groups: [initialGroup], ungroupedPanels: [] },
    dims: furnitureType.defaultDims,
    style: "Modern",
    cameraPosition: [2.5, 2, 3],
  };
}

let nextPanelId = 100;

// ─── Context Menu Component ──────────────────────────────

function EditorContextMenu({
  x, y, panelId, groupId, onDuplicate, onDelete, onEditParts, onGroup, onUngroup, hasGroup, onClose,
}: {
  x: number; y: number; panelId: string | null; groupId: string | null;
  onDuplicate: () => void; onDelete: () => void; onEditParts: () => void;
  onGroup: () => void; onUngroup: () => void; hasGroup: boolean; onClose: () => void;
}) {
  useEffect(() => {
    const handle = () => onClose();
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handle);
      document.addEventListener("contextmenu", handle);
      document.addEventListener("touchstart", handle);
    }, 150);
    document.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("contextmenu", handle);
      document.removeEventListener("touchstart", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const items: { label: string; shortcut: string; action: () => void; show: boolean }[] = [
    { label: "Duplicate", shortcut: "Ctrl+D", action: onDuplicate, show: true },
    { label: "Delete", shortcut: "Del", action: onDelete, show: true },
    { label: "Edit Parts", shortcut: "Double-click", action: onEditParts, show: hasGroup },
    { label: "Ungroup", shortcut: "Ctrl+Shift+G", action: onUngroup, show: hasGroup },
  ];

  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {items.filter(i => i.show).map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <span>{item.label}</span>
          <span className="text-[10px] text-gray-400 ml-4">{item.shortcut}</span>
        </button>
      ))}
    </div>
  );
}

export function FurnitureEditor({
  furnitureType,
  roomLabel,
  spaceType,
  onBack,
  onSave,
  initialEditorState,
}: FurnitureEditorProps) {
  const bootstrapRef = useRef<ReturnType<typeof buildEditorBootstrap> | null>(null);
  if (bootstrapRef.current === null) {
    bootstrapRef.current = buildEditorBootstrap(furnitureType, initialEditorState);
  }
  const boot = bootstrapRef.current;

  const [dims, setDims] = useState(() => boot.dims);
  const [style, setStyle] = useState(() => boot.style);
  const [chatOpen, setChatOpen] = useState(false);
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
  const [submitLibraryGroup, setSubmitLibraryGroup] = useState<GroupData | null>(null);
  const [communityTemplates, setCommunityTemplates] = useState<CommunityTemplate[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    panelId: string | null;
    groupId: string | null;
  } | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHistoryIndex = useRef(0);
  const editorNavigate = useNavigate();

  const { isMobileLayout, isDesktop } = useMobileInfo();
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const mobileActiveSheet = mobileLibraryOpen ? "library" as const
    : mobilePropsOpen ? "properties" as const
    : mobileChatOpen ? "chat" as const
    : null;

  const openMobileSheet = (sheet: "library" | "properties" | "chat") => {
    setMobileLibraryOpen(sheet === "library");
    setMobilePropsOpen(sheet === "properties");
    setMobileChatOpen(sheet === "chat");
  };
  const closeMobileSheets = () => {
    setMobileLibraryOpen(false);
    setMobilePropsOpen(false);
    setMobileChatOpen(false);
  };

  const [hintsVisible, setHintsVisible] = useState(() => {
    try { return !localStorage.getItem("dexo_editor_hints_seen"); } catch { return false; }
  });

  const dismissHints = useCallback(() => {
    setHintsVisible(false);
    try { localStorage.setItem("dexo_editor_hints_seen", "1"); } catch {}
  }, []);

  // ─── Group / Edit mode state ─────────────────────────
  const [groups, setGroups] = useState<GroupData[]>(() => boot.scene.groups);
  const [ungroupedPanels, setUngroupedPanels] = useState<PanelData[]>(() => boot.scene.ungroupedPanels);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);

  // ─── Undo / Redo History ───────────────────────────────
  const MAX_HISTORY = 50;
  const historyRef = useRef<EditorSceneData[]>([
    { groups: structuredClone(boot.scene.groups), ungroupedPanels: structuredClone(boot.scene.ungroupedPanels) },
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
    // Eagerly update refs so back-to-back calls in the same tick read fresh data.
    // Without this, a second updateScene/setGroups before React renders would read
    // stale ref values and overwrite the first change (causing material reverts).
    groupsRef.current = nextGroups;
    ungroupedRef.current = nextUngrouped;
    setGroups(nextGroups);
    setUngroupedPanels(nextUngrouped);
    pushHistory(nextGroups, nextUngrouped);
  }, [pushHistory]);

  // ─── Edit mode state ───────────────────────────────────
  const [editModePanels, setEditModePanels] = useState<PanelData[] | null>(null);

  const enterEditMode = useCallback((groupId: string) => {
    const group = groupsRef.current.find((g) => g.id === groupId);
    if (!group) return;
    const worldPanels = panelsToWorldSpace(group.panels, group.position, group.rotation, group.scale ?? [1, 1, 1]);
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
    const worldPanels = editModePanels ?? panelsToWorldSpace(group.panels, group.position, group.rotation, group.scale ?? [1, 1, 1]);
    const center = computeBoundingBoxCenter(worldPanels);
    // Use identity rotation & scale since transforms are now baked into world-space panels
    const relativePanels = panelsToRelative(worldPanels, center, [0, 0, 0], [1, 1, 1]);
    const updatedGroup: GroupData = { ...group, position: center, rotation: [0, 0, 0], scale: [1, 1, 1], panels: relativePanels };
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

  /** Update a panel AND record undo history. Use on mouse-up or sidebar value changes. */
  const handleUpdatePanelCommit = handleUpdatePanel;

  /** Update a panel visually during drag/resize WITHOUT recording undo history. */
  const handleUpdatePanelLive = useCallback((id: string, updates: Partial<PanelData>) => {
    if (editingGroupId && editModePanels) {
      setEditModePanels((prev) =>
        prev!.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    } else {
      // Use functional updaters to avoid overwriting pending state changes.
      // Eagerly sync refs so updateScene reads fresh data in the same tick.
      setGroups((prev) => {
        const next = prev.map((g) => ({
          ...g,
          panels: g.panels.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        groupsRef.current = next;
        return next;
      });
      setUngroupedPanels((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        ungroupedRef.current = next;
        return next;
      });
    }
  }, [editingGroupId, editModePanels]);

  const handleUpdateGroupLive = useCallback((groupId: string, updates: Partial<GroupData>) => {
    setGroups((prev) => {
      const next = prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g));
      groupsRef.current = next;
      return next;
    });
  }, []);

  const handleAddPart = useCallback((preset: {
    shape: PanelShape;
    type: PanelData["type"];
    label: string;
    size: [number, number, number];
    materialId: string;
    shapeParams?: Record<string, number>;
    placeOnSelected?: boolean;
    placeOnFloor?: boolean;
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

    if (!preset.placeOnFloor && preset.placeOnSelected) {
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
    } else if (!preset.placeOnFloor) {
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

  const handleContextMenu = useCallback((x: number, y: number, panelId: string | null, groupId: string | null) => {
    setContextMenu({ x, y, panelId, groupId });
  }, []);

  // ─── Build from image analysis ────────────────────────
  const handleBuildFromImage = useCallback((analysis: FurnitureAnalysis, mode: "replace" | "add") => {
    const newPanels = panelsFromFurnitureAnalysis(analysis, () => `p${++nextPanelId}`);

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

  // ─── Add GLB group from URL, optionally with analysis panels for editability ───
  const handleAddGLBGroup = useCallback(async (name: string, glbUrl: string, analysis?: FurnitureAnalysis) => {
    const { loadGLBAsGroup } = await import("@/lib/glbLoader");

    let group: GroupData;
    if (analysis && analysis.panels?.length > 0) {
      // Hybrid mode: GLB mesh for visuals + analysis panels for editing
      const analysisPanels = panelsFromFurnitureAnalysis(analysis, () => `p${++nextPanelId}`);
      group = createGroupFromPanels(analysis.name ?? name, analysisPanels);
      group = { ...group, glbUrl, preserveGlbDiffuseMaps: false };
      if (analysis.estimatedDims) {
        setDims(analysis.estimatedDims);
      }
    } else {
      // GLB-only mode: load mesh and extract panels from geometry
      group = await loadGLBAsGroup(glbUrl, name, undefined, { preserveOriginalMaterials: false });
    }

    const offset = computeGroupXOffset(groupsRef.current);
    const offsetGroup: GroupData = {
      ...group,
      position: [group.position[0] + offset, group.position[1], group.position[2]],
    };
    updateScene((prev) => [...prev, offsetGroup]);
    setSelectedGroupId(offsetGroup.id);
    setSelectedPanelId(null);
  }, [updateScene, pushHistory]);

  // ─── Toolbar image import ────────────────────────────
  // Camera position ref (updated by viewport via onCameraMove)
  const cameraPositionRef = useRef<[number, number, number]>(boot.cameraPosition);
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

    // Ask user which mode to use
    const use3D = window.confirm(
      "How would you like to import this image?\n\nOK = Generate 3D model (higher quality, slower)\nCancel = Analyze & build from components (faster)"
    );

    if (use3D) {
      // ─── 3D generation + part analysis path ───
      const { glbUrl, analysis, error: genErr } = await generate3DFromImage(url);
      setIsToolbarAnalyzing(false);
      if (genErr || (!glbUrl && !analysis)) {
        alert(genErr || "3D generation failed");
        return;
      }
      try {
        if (glbUrl) {
          await handleAddGLBGroup(analysis?.name ?? "Imported 3D", glbUrl, analysis);
        } else if (analysis) {
          // Fallback: no GLB, use analysis panels only
          handleBuildFromImage(analysis, "add");
        }
      } catch (err) {
        console.error("Failed to load generated model:", err);
        alert("Failed to load the generated 3D model.");
      }
    } else {
      // ─── Component analysis path (existing) ───
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
    }
  }, [handleBuildFromImage, updateScene]);

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
    const rawPanels = template.buildPanels(newDims).map((p) => ({
      ...p,
      id: `p${++nextPanelId}`,
    }));
    const newPanels = alignPanelsBottomToWorldY(rawPanels, EDITOR_LIBRARY_FLOOR_Y);
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
      // Keep glbUrl — GLBModelRenderer applies materials via applyDesignMaterialToGlbRoot
      return {
        ...g,
        preserveGlbDiffuseMaps: false,
        panels: g.panels.map((p) => ({ ...p, materialId, customColor: undefined, textureUrl: undefined })),
      };
    }));
  }, [updateScene]);

  const handleCustomGroupColor = useCallback((groupId: string, color: string) => {
    updateScene((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        preserveGlbDiffuseMaps: false,
        panels: g.panels.map((p) => ({ ...p, customColor: color, textureUrl: undefined })),
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

  const handleUpdateGroupSurfaceType = useCallback((groupId: string, surfaceType: string) => {
    updateScene((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        panels: g.panels.map((p) => ({ ...p, surfaceType })),
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
          ...(g.glbUrl ? { preserveGlbDiffuseMaps: false } : {}),
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

  // ─── Fetch community templates on mount ───────────────
  useEffect(() => {
    fetchCommunityTemplates().then((r) => setCommunityTemplates(r.data));
  }, []);

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

  const statusText = (() => {
    if (editingGroupId) {
      return "Editing group parts — Esc to exit | Drag: move | Handles: resize | + Add to insert parts";
    }
    if (selectedPanelId) {
      return "Drag: move X/Z | Green arrow: height | Handles: resize | R: rotate | Del: delete | Right-click: options";
    }
    if (selectedGroupId) {
      return "Drag: move group | Handles: scale | Double-click: edit parts | Right-click: options";
    }
    return "Click to select | Right-click for options | ?: shortcuts";
  })();

  return (
    <div className="h-dvh flex flex-col bg-[#FAFAFA] overflow-hidden min-h-0">
      {/* Top toolbar */}
      {isDesktop ? (
      <div className="shrink-0 bg-white border-b border-gray-200 px-3 sm:px-4 py-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto [scrollbar-width:none]">

          {/* Back + Breadcrumb */}
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0" title="Back to selection">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <nav className="flex items-center gap-1 text-xs shrink-0 whitespace-nowrap">
            <button onClick={() => editorNavigate("/dashboard")} className="text-gray-400 hover:text-[#C87D5A] transition-colors font-medium" title="Home">
              DEXO
            </button>
            <span className="text-gray-300">/</span>
            <button onClick={() => editorNavigate("/new-project")} className="text-gray-400 hover:text-[#C87D5A] transition-colors">
              Studio
            </button>
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

          <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

          {/* Undo / Redo */}
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={historyIndexRef.current <= 0}
            className="h-8 w-8 shrink-0"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={historyIndexRef.current >= historyRef.current.length - 1}
            className="h-8 w-8 shrink-0"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>

          <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

          {/* Snap toggle */}
          <button
            title={snapEnabled ? "Snap ON (10mm grid)" : "Snap OFF"}
            onClick={() => setSnapEnabled((v) => !v)}
            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors shrink-0 ${
              snapEnabled
                ? "border-[#C87D5A]/30 bg-[#C87D5A]/10 text-[#C87D5A]"
                : "border-gray-200 bg-white text-gray-400"
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

          {/* View mode selector */}
          <div className="flex items-center h-8 rounded-lg border border-gray-200 overflow-hidden shrink-0">
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

          <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

          {/* Day / Night lighting */}
          <div className="flex items-center h-8 rounded-lg border border-gray-200 overflow-hidden shrink-0">
            {([
              { mode: "day" as const, icon: Sun, title: "Day lighting (L)" },
              { mode: "night" as const, icon: Moon, title: "Night lighting (L)" },
            ]).map(({ mode, icon: Icon, title }) => (
              <button
                key={mode}
                type="button"
                title={title}
                onClick={() => setLightMode(mode)}
                className={`h-full px-2.5 flex items-center justify-center transition-colors ${
                  lightMode === mode
                    ? "bg-[#1B2432] text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* Library toggle */}
          <button
            title="Template Library"
            onClick={() => setShowLibrary((v) => !v)}
            className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
              showLibrary
                ? "border-[#C87D5A]/30 bg-[#C87D5A]/10 text-[#C87D5A]"
                : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Library
          </button>

          {/* AI Assistant toggle */}
          <button
            title="AI Assistant"
            onClick={() => setChatOpen((v) => !v)}
            className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
              chatOpen
                ? "border-[#C87D5A]/30 bg-[#C87D5A]/10 text-[#C87D5A]"
                : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI Agent
          </button>

          {/* Overflow ⋮ menu */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                title="More options"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5 space-y-0.5">
              {/* Floor preset */}
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Floor Style</p>
                <Select
                  value={floorPreset}
                  onValueChange={(v) => setFloorPreset(v as EditorFloorPreset)}
                >
                  <SelectTrigger className="h-7 w-full text-xs border-gray-200 bg-white">
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
              </div>
              <div className="h-px bg-gray-100 mx-1" />
              {/* Reset */}
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                Reset to default
              </button>
              {/* Help */}
              <button
                onClick={() => setShowHelp((v) => !v)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                Shortcuts &amp; Help
              </button>
              <div className="h-px bg-gray-100 mx-1" />
              {/* Submit to Library */}
              <button
                onClick={() => {
                  const targetGroup = selectedGroup || groups[0];
                  if (targetGroup) setSubmitLibraryGroup(targetGroup);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
                disabled={groups.length === 0}
              >
                <Upload className="w-3.5 h-3.5 text-gray-400" />
                Submit to Library
              </button>
              {/* Save & Exit */}
              <button
                onClick={() => guardedNavigate(handleSaveAndExit)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-400" />
                Save &amp; Exit
              </button>
            </PopoverContent>
          </Popover>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Editing badge (only when inside a group) */}
          {editingGroupId && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-orange-600 font-medium">
                Editing: {groups.find((g) => g.id === editingGroupId)?.name ?? "Group"}
              </span>
              <button
                onClick={exitEditMode}
                className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Save status dot */}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 animate-pulse shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-[11px] text-green-600 shrink-0">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="text-[11px] text-amber-500 font-medium shrink-0">● Unsaved</span>
          )}

          {/* Save */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="h-8 bg-[#C87D5A] hover:bg-[#B06B4A] text-white shrink-0"
            title="Save (Ctrl+S)"
          >
            {saveStatus === "saving" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save
          </Button>

          {/* Finish & Submit */}
          <Button
            size="sm"
            onClick={() => guardedNavigate(handleFinishSubmit)}
            className="h-8 bg-[#1B2432] hover:bg-[#2A3544] text-white shrink-0"
            title="Save and submit to creators"
          >
            <SendHorizonal className="w-3.5 h-3.5 mr-1.5" />
            Finish
          </Button>

        </div>
      </div>
      ) : (
      <>
        <MobileEditorToolbar
          furnitureLabel={furnitureType.label}
          onBack={onBack}
          canUndo={historyIndexRef.current > 0}
          canRedo={historyIndexRef.current < historyRef.current.length - 1}
          onUndo={undo}
          onRedo={redo}
          snapEnabled={snapEnabled}
          onToggleSnap={() => setSnapEnabled(v => !v)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          lightMode={lightMode}
          onLightModeChange={setLightMode}
          floorPreset={floorPreset}
          onFloorPresetChange={setFloorPreset}
          saveStatus={saveStatus}
          onSave={handleSave}
          onReset={handleReset}
          onToggleHelp={() => setShowHelp(v => !v)}
          onSubmitLibrary={() => {
            const targetGroup = selectedGroup || groups[0];
            if (targetGroup) setSubmitLibraryGroup(targetGroup);
          }}
          onSaveAndExit={() => guardedNavigate(handleSaveAndExit)}
        />
        {editingGroupId && (
          <div className="shrink-0 h-9 bg-orange-50 border-b border-orange-200 px-4 flex items-center justify-between">
            <span className="text-xs text-orange-700 font-medium">
              Editing: {groups.find(g => g.id === editingGroupId)?.name ?? "Group"}
            </span>
            <button
              onClick={exitEditMode}
              className="text-xs text-orange-600 font-semibold px-3 py-1 rounded-full bg-orange-100 active:bg-orange-200"
            >
              Exit
            </button>
          </div>
        )}
      </>
      )}

      {/* Four-panel layout */}
      {isDesktop ? (
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {showLibrary ? (
          <LibraryBrowser
            onSelectTemplate={handleLoadTemplate}
            onClose={() => setShowLibrary(false)}
            communityTemplates={communityTemplates}
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

        <div className="flex-1 min-w-0 min-h-0 p-3 flex flex-col">
          <div className="flex-1 min-h-0 min-w-0 relative">
            <EditorViewport
              panels={activePanels}
              selectedPanelId={selectedPanelId}
              snapEnabled={snapEnabled}
              rotationMode={rotationMode}
              viewMode={viewMode}
              onSelectPanel={setSelectedPanelId}
              onUpdatePanel={handleUpdatePanelCommit}
              onUpdatePanelLive={handleUpdatePanelLive}
              groups={groups}
              ungroupedPanels={ungroupedPanels}
              editingGroupId={editingGroupId}
              editingPanels={editModePanels}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              onUpdateGroup={handleUpdateGroup}
              onUpdateGroupLive={handleUpdateGroupLive}
              onEnterEditMode={enterEditMode}
              onExitEditMode={exitEditMode}
              onRenameGroup={handleRenameGroup}
              onUngroupGroup={handleUngroupGroup}
              onDeleteGroup={handleDeleteGroup}
              onScaleGroup={handleScaleGroup}
              onContextMenu={handleContextMenu}
              lightMode={lightMode}
              floorPreset={floorPreset}
              initialCameraPosition={boot.cameraPosition}
              onCameraMove={(pos) => { cameraPositionRef.current = pos; }}
              suspendPointerEvents={showAddPicker}
            />
            {hintsVisible && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                {/* Center hint */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 pointer-events-auto">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 max-w-[220px] text-center">
                    <p className="text-xs font-medium text-gray-700 mb-1">Drag to move</p>
                    <p className="text-[10px] text-gray-400">Click any object, then drag to reposition it</p>
                  </div>
                </div>

                {/* Right hint */}
                <div className="absolute top-1/3 right-4 pointer-events-auto">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 max-w-[200px] text-center">
                    <p className="text-xs font-medium text-gray-700 mb-1">Edit in sidebar</p>
                    <p className="text-[10px] text-gray-400">Change materials, size, and position</p>
                  </div>
                </div>

                {/* Bottom dismiss */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto">
                  <button
                    onClick={dismissHints}
                    className="px-4 py-1.5 bg-[#1B2432] text-white text-xs rounded-full shadow-lg hover:bg-[#2A3544] transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 px-3 py-1 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex items-center text-[10px] text-gray-400 select-none">
            {statusText}
          </div>
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
          onUpdateGroupSurfaceType={handleUpdateGroupSurfaceType}
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
            onAddGLBGroup={handleAddGLBGroup}
            onClose={() => setChatOpen(false)}
          />
        )}

      </div>
      ) : (
      <>
        {/* Full viewport */}
        <div className="flex-1 min-h-0 min-w-0 relative">
          <EditorViewport
            panels={activePanels}
            selectedPanelId={selectedPanelId}
            snapEnabled={snapEnabled}
            rotationMode={rotationMode}
            viewMode={viewMode}
            onSelectPanel={setSelectedPanelId}
            onUpdatePanel={handleUpdatePanelCommit}
            onUpdatePanelLive={handleUpdatePanelLive}
            groups={groups}
            ungroupedPanels={ungroupedPanels}
            editingGroupId={editingGroupId}
            editingPanels={editModePanels}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onUpdateGroup={handleUpdateGroup}
            onUpdateGroupLive={handleUpdateGroupLive}
            onEnterEditMode={enterEditMode}
            onExitEditMode={exitEditMode}
            onRenameGroup={handleRenameGroup}
            onUngroupGroup={handleUngroupGroup}
            onDeleteGroup={handleDeleteGroup}
            onScaleGroup={handleScaleGroup}
            onContextMenu={handleContextMenu}
            lightMode={lightMode}
            floorPreset={floorPreset}
            initialCameraPosition={boot.cameraPosition}
            onCameraMove={(pos) => { cameraPositionRef.current = pos; }}
            suspendPointerEvents={showAddPicker}
          />
          {/* Mobile hints */}
          {hintsVisible && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 pointer-events-auto">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 max-w-[220px] text-center">
                  <p className="text-xs font-medium text-gray-700 mb-1">Tap to select</p>
                  <p className="text-[10px] text-gray-400">Pinch to zoom, drag to orbit</p>
                </div>
              </div>
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto">
                <button onClick={dismissHints} className="px-4 py-1.5 bg-[#1B2432] text-white text-xs rounded-full shadow-lg">
                  Got it
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <MobileEditorBar
          onOpenLibrary={() => openMobileSheet("library")}
          onOpenProperties={() => openMobileSheet("properties")}
          onOpenChat={() => openMobileSheet("chat")}
          editingGroupId={editingGroupId}
          selectedGroupId={selectedGroupId}
          onEnterEditMode={enterEditMode}
          onExitEditMode={exitEditMode}
          activeSheet={mobileActiveSheet}
        />

        {/* Library bottom sheet */}
        <MobileDrawer isOpen={mobileLibraryOpen} onClose={closeMobileSheets} title="Library" height="half">
          {showLibrary ? (
            <LibraryBrowser
              onSelectTemplate={(t) => { handleLoadTemplate(t); closeMobileSheets(); }}
              onClose={() => setShowLibrary(false)}
              communityTemplates={communityTemplates}
            />
          ) : (
            <EditorSidebar
              panels={activePanels}
              selectedPanelId={selectedPanelId}
              onSelectPanel={(id) => { setSelectedPanelId(id); closeMobileSheets(); }}
              onAddPanel={() => setShowAddPicker(true)}
              onDuplicatePanel={handleDuplicatePanel}
              onDeletePanel={handleDeletePanel}
              groups={groups}
              ungroupedPanels={ungroupedPanels}
              editingGroupId={editingGroupId}
              editingPanels={editModePanels}
              selectedGroupId={selectedGroupId}
              onSelectGroup={(id) => { setSelectedGroupId(id); closeMobileSheets(); }}
              onDeleteGroup={handleDeleteGroup}
              onEnterEditMode={enterEditMode}
              onExitEditMode={exitEditMode}
              onRenameGroup={handleRenameGroup}
              onGroupPanels={handleGroupPanels}
              onUngroupGroup={handleUngroupGroup}
            />
          )}
        </MobileDrawer>

        {/* Properties bottom sheet */}
        <MobileDrawer isOpen={mobilePropsOpen} onClose={closeMobileSheets} title="Properties" height="half">
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
            onUpdateGroupSurfaceType={handleUpdateGroupSurfaceType}
            multiSelectCount={selectedPanelIds.length}
          />
        </MobileDrawer>

        {/* AI Chat bottom sheet */}
        <MobileDrawer isOpen={mobileChatOpen} onClose={closeMobileSheets} title="AI Assistant" height="full">
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
            onAddGLBGroup={handleAddGLBGroup}
            onClose={closeMobileSheets}
          />
        </MobileDrawer>
      </>
      )}

      {/* Context menu for 3D viewport elements */}
      {contextMenu && (
        <EditorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          panelId={contextMenu.panelId}
          groupId={contextMenu.groupId}
          onDuplicate={() => {
            if (contextMenu.panelId) handleDuplicatePanel(contextMenu.panelId);
            else if (contextMenu.groupId) handleDuplicateGroup(contextMenu.groupId);
            setContextMenu(null);
          }}
          onDelete={() => {
            if (contextMenu.panelId) handleDeletePanel(contextMenu.panelId);
            else if (contextMenu.groupId) handleDeleteGroup(contextMenu.groupId);
            setContextMenu(null);
          }}
          onEditParts={() => {
            if (contextMenu.groupId) enterEditMode(contextMenu.groupId);
            setContextMenu(null);
          }}
          onGroup={() => {
            if (contextMenu.panelId) handleGroupPanels([contextMenu.panelId]);
            setContextMenu(null);
          }}
          onUngroup={() => {
            if (contextMenu.groupId) handleUngroupGroup(contextMenu.groupId);
            setContextMenu(null);
          }}
          hasGroup={!!contextMenu.groupId}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Add Part Picker modal */}
      {showAddPicker && (
        <AddPartPicker
          onAdd={handleAddPart}
          onAddGroup={(name, panels) => {
            const group = createGroupFromPanels(name, panels);
            const offset = computeGroupXOffset(groupsRef.current);
            const offsetGroup = { ...group, position: [group.position[0] + offset, group.position[1], group.position[2]] as [number,number,number] };
            updateScene((prev) => [...prev, offsetGroup]);
            setSelectedGroupId(offsetGroup.id);
            setSelectedPanelId(null);
          }}
          onAddGLB={async (name, glbPath) => {
            try {
              const { loadGLBAsGroup } = await import("@/lib/glbLoader");
              const group = await loadGLBAsGroup(glbPath, name);
              const offset = computeGroupXOffset(groupsRef.current);
              const offsetGroup: GroupData = { ...group, position: [group.position[0] + offset, group.position[1], group.position[2]] };
              updateScene((prev) => [...prev, offsetGroup]);
              setSelectedGroupId(offsetGroup.id);
              setSelectedPanelId(null);
            } catch (err) {
              console.error("Failed to load GLB:", err);
            }
          }}
          onClose={() => setShowAddPicker(false)}
        />
      )}

      {/* Submit to Library dialog */}
      {submitLibraryGroup && (
        <SubmitToLibraryDialog
          group={submitLibraryGroup}
          dims={dims}
          onClose={() => setSubmitLibraryGroup(null)}
        />
      )}

      {/* Help / Shortcuts overlay */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[75vh] overflow-y-auto border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <button onClick={() => setShowHelp(false)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
              {/* Column 1: Transform */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Transform</h4>
                <div className="space-y-1.5">
                  {[
                    ["Drag", "Move on ground (X/Z)"],
                    ["Green arrow", "Move up/down (Y)"],
                    ["Handles", "Resize from edge/corner"],
                    ["R + Drag", "Rotate selected"],
                    ["Shift + Drag", "Move vertically (alt)"],
                    ["Arrow keys", "Nudge 10mm"],
                    ["Shift + Arrow", "Nudge 1mm"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-2">
                      <kbd className="min-w-[72px] px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-500">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Actions */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actions</h4>
                <div className="space-y-1.5">
                  {[
                    ["Ctrl+Z", "Undo"],
                    ["Ctrl+Shift+Z", "Redo"],
                    ["Ctrl+D", "Duplicate"],
                    ["Delete", "Delete selected"],
                    ["Ctrl+G", "Group panels"],
                    ["Ctrl+Shift+G", "Ungroup"],
                    ["Right-click", "Context menu"],
                    ["?", "Toggle this overlay"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-2">
                      <kbd className="min-w-[72px] px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-500">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 1: Navigation */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Navigation</h4>
                <div className="space-y-1.5">
                  {[
                    ["Left drag", "Orbit camera"],
                    ["Right drag", "Pan camera"],
                    ["Scroll", "Zoom"],
                    ["Double-click", "Edit group parts"],
                    ["Escape", "Exit edit mode"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-2">
                      <kbd className="min-w-[72px] px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-500">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Views */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Views</h4>
                <div className="space-y-1.5">
                  {[
                    ["1", "3D perspective"],
                    ["2", "Front view"],
                    ["3", "Top view"],
                    ["4", "Side view"],
                    ["L", "Toggle day/night"],
                    ["Ctrl+S", "Save"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-2">
                      <kbd className="min-w-[72px] px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600 text-center">{key}</kbd>
                      <span className="text-gray-500">{desc}</span>
                    </div>
                  ))}
                </div>
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
