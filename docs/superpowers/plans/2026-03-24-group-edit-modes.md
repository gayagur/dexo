# Group & Edit Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Figma-style group/edit modes so furniture pieces (table = top + legs) move as one unit, with double-click to edit individual parts.

**Architecture:** Introduce `GroupData` wrapper type that holds `PanelData[]` with relative positions. Editor state splits into `groups[]` + `ungroupedPanels[]`. R3F `<group>` nodes handle cascading transforms. World-space conversion on edit-mode enter/exit reuses all existing drag/resize code unchanged.

**Tech Stack:** React, TypeScript, Three.js, @react-three/fiber, @react-three/drei, Supabase

**Spec:** `docs/superpowers/specs/2026-03-24-group-edit-modes-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/furnitureData.ts` | `GroupData` interface, `createGroupFromPanels()` utility | Modify |
| `src/lib/groupUtils.ts` | Pure utility functions: coordinate conversion, bounding box, offset computation | Create |
| `src/components/design/editor/FurnitureEditor.tsx` | Top-level state: `groups`, `ungroupedPanels`, mode/selection state, all callbacks | Modify |
| `src/components/design/editor/EditorViewport.tsx` | R3F rendering: group wrappers, `GroupBoundingBox`, double-click, dimming | Modify |
| `src/components/design/editor/EditorSidebar.tsx` | Group list, edit-mode panel list, rename, context menu | Modify |
| `src/components/design/editor/EditorParameters.tsx` | Group properties in Scene Mode, conditional Overall Size | Modify |
| `src/components/design/editor/DesignChatPanel.tsx` | Update chat messages for group creation | Modify |
| `src/pages/FurnitureDesignFlow.tsx` | Save/load with new data shape + backward compat | Modify |
| `src/components/design/FurniturePreview.tsx` | Render groups in read-only preview | Modify |

---

## Task 1: Data Model — `GroupData` type and utility functions

**Files:**
- Modify: `src/lib/furnitureData.ts:234-248`
- Create: `src/lib/groupUtils.ts`

- [ ] **Step 1: Add `GroupData` interface to `furnitureData.ts`**

After the existing `FurnitureTemplate` interface (line 248), add:

```ts
export interface GroupData {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  panels: PanelData[];
}

/** Snapshot shape for undo/redo and persistence */
export interface EditorSceneData {
  groups: GroupData[];
  ungroupedPanels: PanelData[];
}
```

- [ ] **Step 2: Create `src/lib/groupUtils.ts`**

```ts
import type { PanelData, GroupData } from "./furnitureData";
import * as THREE from "three";

/** Compute axis-aligned bounding box center of a set of panels (world-space positions) */
export function computeBoundingBoxCenter(panels: PanelData[]): [number, number, number] {
  if (panels.length === 0) return [0, 0, 0];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of panels) {
    const [px, py, pz] = p.position;
    const [sx, sy, sz] = p.size;
    minX = Math.min(minX, px - sx / 2);
    maxX = Math.max(maxX, px + sx / 2);
    minY = Math.min(minY, py - sy / 2);
    maxY = Math.max(maxY, py + sy / 2);
    minZ = Math.min(minZ, pz - sz / 2);
    maxZ = Math.max(maxZ, pz + sz / 2);
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
}

/** Convert panels from world-space to group-local (apply inverse group transform) */
export function panelsToRelative(
  panels: PanelData[],
  groupPos: [number, number, number],
  groupRot: [number, number, number] = [0, 0, 0]
): PanelData[] {
  const euler = new THREE.Euler(...groupRot);
  const invQuat = new THREE.Quaternion().setFromEuler(euler).invert();
  const origin = new THREE.Vector3(...groupPos);

  return panels.map((p) => {
    const worldPos = new THREE.Vector3(...p.position).sub(origin);
    worldPos.applyQuaternion(invQuat);
    return {
      ...p,
      position: [worldPos.x, worldPos.y, worldPos.z] as [number, number, number],
    };
  });
}

/** Convert panels from group-local to world-space (apply group transform) */
export function panelsToWorldSpace(
  panels: PanelData[],
  groupPos: [number, number, number],
  groupRot: [number, number, number] = [0, 0, 0]
): PanelData[] {
  const euler = new THREE.Euler(...groupRot);
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const origin = new THREE.Vector3(...groupPos);

  return panels.map((p) => {
    const localPos = new THREE.Vector3(...p.position);
    localPos.applyQuaternion(quat).add(origin);
    return {
      ...p,
      position: [localPos.x, localPos.y, localPos.z] as [number, number, number],
    };
  });
}

/** Create a GroupData from world-space panels (rotation is always [0,0,0] for new groups) */
export function createGroupFromPanels(
  name: string,
  panels: PanelData[]
): GroupData {
  const center = computeBoundingBoxCenter(panels);
  return {
    id: crypto.randomUUID(),
    name,
    position: center,
    rotation: [0, 0, 0],
    panels: panelsToRelative(panels, center, [0, 0, 0]),
  };
}

/** Migrate old PanelData[] format to new EditorSceneData */
export function migrateSceneData(
  data: PanelData[] | { groups: GroupData[]; ungroupedPanels: PanelData[] },
  furnitureName: string = "Furniture"
): { groups: GroupData[]; ungroupedPanels: PanelData[] } {
  if (Array.isArray(data)) {
    // Old format: wrap in a single group
    if (data.length === 0) return { groups: [], ungroupedPanels: [] };
    return { groups: [createGroupFromPanels(furnitureName, data)], ungroupedPanels: [] };
  }
  return data;
}

/** Compute X-offset so a new group doesn't overlap existing ones */
export function computeGroupXOffset(existingGroups: GroupData[]): number {
  if (existingGroups.length === 0) return 0;
  let maxX = -Infinity;
  for (const g of existingGroups) {
    for (const p of g.panels) {
      const worldX = p.position[0] + g.position[0] + p.size[0] / 2;
      if (worldX > maxX) maxX = worldX;
    }
  }
  return maxX + 0.5; // 0.5m gap
}

/** Flatten all groups + ungrouped into a single PanelData[] (for legacy consumers) */
export function flattenScene(groups: GroupData[], ungroupedPanels: PanelData[]): PanelData[] {
  const result: PanelData[] = [];
  for (const g of groups) {
    result.push(...panelsToWorldSpace(g.panels, g.position));
  }
  result.push(...ungroupedPanels);
  return result;
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors related to GroupData or groupUtils.

- [ ] **Step 4: Commit**

```bash
git add src/lib/furnitureData.ts src/lib/groupUtils.ts
git commit -m "feat: add GroupData type and group utility functions"
```

---

## Task 2: FurnitureEditor — Replace flat panels state with groups

**Files:**
- Modify: `src/components/design/editor/FurnitureEditor.tsx`

This is the biggest task. It replaces the core state and all callbacks.

- [ ] **Step 1: Update imports and state declarations**

At the top of `FurnitureEditor.tsx`, add imports:

```ts
import type { GroupData, EditorSceneData } from "@/lib/furnitureData";
import {
  createGroupFromPanels,
  panelsToWorldSpace,
  panelsToRelative,
  computeBoundingBoxCenter,
  computeGroupXOffset,
  flattenScene,
} from "@/lib/groupUtils";
```

Replace the state block (lines 50-52):

```ts
// OLD:
// const [panels, setPanels] = useState<PanelData[]>(defaultTemplate.panels);
// const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);

// NEW:
const initialGroup = createGroupFromPanels(furnitureType.label, defaultTemplate.panels);
const [groups, setGroups] = useState<GroupData[]>([initialGroup]);
const [ungroupedPanels, setUngroupedPanels] = useState<PanelData[]>([]);
const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
```

- [ ] **Step 2: Update undo/redo to use EditorSceneData**

Replace the history ref and undo/redo functions (lines 54-95):

```ts
const MAX_HISTORY = 50;
const historyRef = useRef<EditorSceneData[]>([
  structuredClone({ groups: [initialGroup], ungroupedPanels: [] }),
]);
const historyIndexRef = useRef(0);
const [, setHistoryVersion] = useState(0);

const pushHistory = useCallback((newGroups: GroupData[], newUngrouped: PanelData[]) => {
  historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
  historyRef.current.push(structuredClone({ groups: newGroups, ungroupedPanels: newUngrouped }));
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
```

- [ ] **Step 3: Add refs to avoid stale closures, and `updateScene` wrapper**

Use refs to track current values so `pushHistory` never captures stale state:

```ts
// Refs to avoid stale closures in callbacks
const groupsRef = useRef(groups);
groupsRef.current = groups;
const ungroupedRef = useRef(ungroupedPanels);
ungroupedRef.current = ungroupedPanels;

/** Always use updateScene — it reads current values from refs to avoid stale closures */
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
```

**Important:** All mutation callbacks below must use `updateScene` (never call `setGroups`/`setUngroupedPanels` directly except in undo/redo) to ensure history snapshots are always consistent.

- [ ] **Step 4: Add edit-mode enter/exit functions**

Use state (not ref) for edit-mode panels so mutations trigger re-renders:

```ts
// World-space panels during edit mode — state so React re-renders on change
const [editModePanels, setEditModePanels] = useState<PanelData[] | null>(null);

const enterEditMode = useCallback((groupId: string) => {
  const group = groupsRef.current.find((g) => g.id === groupId);
  if (!group) return;
  // Convert to world-space, applying group rotation
  const worldPanels = panelsToWorldSpace(group.panels, group.position, group.rotation);
  setEditModePanels(worldPanels);
  setEditingGroupId(groupId);
  setSelectedGroupId(null);
  setSelectedPanelId(null);
  setSelectedPanelIds([]);
  // Push snapshot at mode entry
  pushHistory(groupsRef.current, ungroupedRef.current);
}, [pushHistory]);

const exitEditMode = useCallback(() => {
  if (!editingGroupId) return;
  const group = groupsRef.current.find((g) => g.id === editingGroupId);
  if (!group) { setEditingGroupId(null); setEditModePanels(null); return; }

  const worldPanels = editModePanels ?? panelsToWorldSpace(group.panels, group.position, group.rotation);
  const center = computeBoundingBoxCenter(worldPanels);
  // New group has rotation [0,0,0] since panels are now in absolute positions
  const relativePanels = panelsToRelative(worldPanels, center, [0, 0, 0]);

  const updatedGroup: GroupData = {
    ...group,
    position: center,
    rotation: [0, 0, 0], // Reset rotation — it's been "baked" into panel positions
    panels: relativePanels,
  };

  updateScene(
    (prev) => prev.map((g) => g.id === editingGroupId ? updatedGroup : g)
  );
  setEditingGroupId(null);
  setSelectedGroupId(editingGroupId);
  setSelectedPanelId(null);
  setEditModePanels(null);
}, [editingGroupId, editModePanels, updateScene]);
```

- [ ] **Step 5: Add derived state and panel update handlers**

```ts
// The "active panels" that the viewport/sidebar work with
const activePanels: PanelData[] = editingGroupId
  ? (editModePanels ?? [])
  : ungroupedPanels;

const selectedPanel = activePanels.find((p) => p.id === selectedPanelId) ?? null;

const handleUpdatePanel = useCallback((id: string, updates: Partial<PanelData>) => {
  if (editingGroupId && editModePanels) {
    // In edit mode: update world-space panels state directly
    setEditModePanels((prev) =>
      (prev ?? []).map((p) => p.id === id ? { ...p, ...updates } : p)
    );
  } else {
    // Scene mode: update ungrouped panel
    updateScene(
      (g) => g,
      (prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }
}, [editingGroupId, editModePanels, updateScene]);
```

- [ ] **Step 6: Update `handleAddPart` for edit mode**

Replace the existing `handleAddPart` callback:

```ts
const handleAddPart = useCallback((preset: {
  shape: PanelShape;
  type: PanelData["type"];
  label: string;
  size: [number, number, number];
  materialId: string;
  shapeParams?: Record<string, number>;
}) => {
  const id = `p${++nextPanelId}`;
  let startY = preset.size[1] / 2;

  // Smart Y placement
  const currentPanels = editingGroupId ? (editModePanels ?? []) : ungroupedPanels;
  const horizontalSurfaces = currentPanels.filter(p => p.type === "horizontal");
  if (horizontalSurfaces.length > 0) {
    const highestSurfaceTop = Math.max(
      ...horizontalSurfaces.map(p => p.position[1] + p.size[1] / 2)
    );
    startY = highestSurfaceTop + preset.size[1] / 2;
  }

  const newPanel: PanelData = {
    id,
    type: preset.type,
    shape: preset.shape === "box" ? undefined : preset.shape,
    shapeParams: preset.shapeParams,
    label: preset.label,
    position: [0, startY, 0],
    size: preset.size,
    materialId: preset.materialId,
  };

  if (editingGroupId && editModePanels) {
    setEditModePanels((prev) => [...(prev ?? []), newPanel]);
  } else {
    updateScene((g) => g, (prev) => [...prev, newPanel]);
  }
  setSelectedPanelId(id);
}, [editingGroupId, ungroupedPanels, groups, updateGroups, updateUngrouped]);
```

- [ ] **Step 7: Update `handleDuplicatePanel` and `handleDeletePanel`**

```ts
const handleDuplicatePanel = useCallback((id: string) => {
  const currentPanels = editingGroupId ? (editModePanels ?? []) : ungroupedPanels;
  const source = currentPanels.find((p) => p.id === id);
  if (!source) return;
  const newId = `p${++nextPanelId}`;
  const clone: PanelData = {
    ...source,
    id: newId,
    label: `${source.label} Copy`,
    position: [source.position[0] + 0.05, source.position[1], source.position[2] - 0.05],
  };

  if (editingGroupId) {
    setEditModePanels((prev) => [...(prev ?? []), clone]);
  } else {
    updateScene((g) => g, (prev) => [...prev, clone]);
  }
  setSelectedPanelId(newId);
}, [editingGroupId, ungroupedPanels, groups, updateGroups, updateUngrouped]);

const handleDeletePanel = useCallback((id: string) => {
  if (editingGroupId) {
    setEditModePanels((prev) => (prev ?? []).filter((p) => p.id !== id));
  } else {
    updateScene((g) => g, (prev) => prev.filter((p) => p.id !== id));
  }
  if (selectedPanelId === id) setSelectedPanelId(null);
}, [editingGroupId, selectedPanelId, updateScene]);
```

- [ ] **Step 8: Add group-level operations**

```ts
// ─── Group operations ──────────────────────────────────

const handleUpdateGroup = useCallback((groupId: string, updates: Partial<GroupData>) => {
  updateScene((prev) =>
    prev.map((g) => g.id === groupId ? { ...g, ...updates } : g)
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

const handleGroupPanels = useCallback((name: string) => {
  if (selectedPanelIds.length < 2) return;
  const panelsToGroup = ungroupedRef.current.filter((p) => selectedPanelIds.includes(p.id));
  if (panelsToGroup.length < 2) return;

  const newGroup = createGroupFromPanels(name, panelsToGroup);
  updateScene(
    (prev) => [...prev, newGroup],
    (prev) => prev.filter((p) => !selectedPanelIds.includes(p.id))
  );
  setSelectedPanelIds([]);
  setSelectedGroupId(newGroup.id);
}, [selectedPanelIds, updateScene]);

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
    prev.map((g) => g.id === groupId ? { ...g, name } : g)
  );
}, [updateScene]);
```

- [ ] **Step 9: Update `handleBuildFromImage` to create groups**

Replace the existing `handleBuildFromImage`:

```ts
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

  const newGroup = createGroupFromPanels(analysis.name, newPanels);

  if (mode === "replace") {
    setDims(analysis.estimatedDims);
    updateScene(() => [newGroup], () => []);
  } else {
    const offset = computeGroupXOffset(groupsRef.current);
    newGroup.position = [
      newGroup.position[0] + offset,
      newGroup.position[1],
      newGroup.position[2],
    ];
    updateScene((prev) => [...prev, newGroup]);
  }
  setSelectedPanelId(null);
  setSelectedGroupId(newGroup.id);
}, [updateScene]);
```

- [ ] **Step 10: Update `handleLoadTemplate` to create groups**

Replace the existing `handleLoadTemplate`:

```ts
const handleLoadTemplate = useCallback((template: LibraryTemplate) => {
  const newDims = template.dims;
  const newPanels = template.buildPanels(newDims).map((p) => ({
    ...p,
    id: `p${++nextPanelId}`,
  }));

  const newGroup = createGroupFromPanels(template.label ?? "Imported", newPanels);

  // Offset to avoid overlap
  const offset = computeGroupXOffset(groupsRef.current);
  if (offset > 0) {
    newGroup.position = [
      newGroup.position[0] + offset,
      newGroup.position[1],
      newGroup.position[2],
    ];
  }

  updateScene((prev) => [...prev, newGroup]);
  setSelectedPanelId(null);
  setSelectedGroupId(newGroup.id);
  setShowLibrary(false);
}, [updateScene]);
```

- [ ] **Step 11: Update `handleDimsChange` for groups**

```ts
const handleDimsChange = useCallback((newDims: { w: number; h: number; d: number }) => {
  const oldDims = dims;
  setDims(newDims);

  const scaleX = newDims.w / (oldDims.w || 1);
  const scaleY = newDims.h / (oldDims.h || 1);
  const scaleZ = newDims.d / (oldDims.d || 1);

  if (scaleX !== 1 || scaleY !== 1 || scaleZ !== 1) {
    const scalePanel = (p: PanelData) => ({
      ...p,
      position: [p.position[0] * scaleX, p.position[1] * scaleY, p.position[2] * scaleZ] as [number, number, number],
      size: [p.size[0] * scaleX, p.size[1] * scaleY, p.size[2] * scaleZ] as [number, number, number],
    });

    if (editingGroupId) {
      setEditModePanels((prev) => (prev ?? []).map(scalePanel));
    } else if (groups.length === 1 && ungroupedPanels.length === 0) {
      updateScene((prev) => prev.map((g) => ({
        ...g,
        panels: g.panels.map(scalePanel),
      })));
    }
  }
}, [dims, editingGroupId, groups, ungroupedPanels.length, updateGroups]);
```

- [ ] **Step 12: Update `handleReset`**

```ts
const handleReset = useCallback(() => {
  const template = getDefaultTemplate(furnitureType.id, dims);
  const newGroup = createGroupFromPanels(furnitureType.label, template.panels);
  setGroups(() => {
    const next = [newGroup];
    setUngroupedPanels(() => {
      pushHistory(next, []);
      return [];
    });
    return next;
  });
  setSelectedPanelId(null);
  setSelectedGroupId(null);
  setEditingGroupId(null);
  setEditModePanels(null);
}, [furnitureType.id, furnitureType.label, dims, pushHistory]);
```

- [ ] **Step 13: Update `handleSave` and the `onSave` type**

First, update the `FurnitureEditorProps` interface to accept the new data shape:

```ts
interface FurnitureEditorProps {
  furnitureType: FurnitureOption;
  roomLabel: string;
  onBack: () => void;
  onSave?: (data: {
    panels: EditorSceneData;  // Changed from PanelData[]
    dims: { w: number; h: number; d: number };
    style: string;
    furnitureId: string;
  }) => void | Promise<void>;
}
```

Then update `handleSave`:

```ts
const handleSave = useCallback(() => {
  onSave?.({
    panels: { groups, ungroupedPanels },
    dims,
    style,
    furnitureId: furnitureType.id,
  });
}, [groups, ungroupedPanels, dims, style, furnitureType.id, onSave]);
```

- [ ] **Step 14: Update keyboard shortcuts**

Update the `useEffect` keydown handler to include:
- Escape: exit rotation mode first, then exit edit mode
- Ctrl+G: group selected panels
- Ctrl+Shift+G: ungroup selected group
- Delete: handle group deletion and multi-select deletion

```ts
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }

    // Ctrl+G: Group selected panels
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && !e.shiftKey) {
      e.preventDefault();
      if (selectedPanelIds.length >= 2) {
        const name = prompt("Group name:", "Furniture Group");
        if (name) handleGroupPanels(name);
      }
      return;
    }

    // Ctrl+Shift+G: Ungroup
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && e.shiftKey) {
      e.preventDefault();
      if (selectedGroupId) handleUngroupGroup(selectedGroupId);
      return;
    }

    // Ctrl+D: Duplicate
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      if (selectedPanelId) handleDuplicatePanel(selectedPanelId);
      return;
    }

    // Delete
    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedPanelIds.length > 0) {
        updateScene((g) => g, (prev) => prev.filter((p) => !selectedPanelIds.includes(p.id)));
        setSelectedPanelIds([]);
      } else if (selectedPanelId) {
        handleDeletePanel(selectedPanelId);
      } else if (selectedGroupId && !editingGroupId) {
        handleDeleteGroup(selectedGroupId);
      }
      return;
    }

    // Arrow keys — nudge
    const nudge = e.shiftKey ? 0.001 : 0.01;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      if (selectedGroupId && !editingGroupId) {
        // Nudge entire group
        const group = groups.find((g) => g.id === selectedGroupId);
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
      } else if (selectedPanelId) {
        const panel = activePanels.find((p) => p.id === selectedPanelId);
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
      case "?": setShowHelp((v) => !v); break;
    }
  };
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [
  selectedPanelId, selectedGroupId, selectedPanelIds, editingGroupId,
  rotationMode, groups, activePanels,
  handleUpdatePanel, handleUpdateGroup, handleDuplicatePanel,
  handleDeletePanel, handleDeleteGroup, handleGroupPanels,
  handleUngroupGroup, exitEditMode, undo, redo, updateUngrouped,
]);
```

- [ ] **Step 15: Update the JSX — pass new props to child components**

Update the `EditorViewport` props:

```tsx
<EditorViewport
  groups={groups}
  ungroupedPanels={ungroupedPanels}
  editingGroupId={editingGroupId}
  editingPanels={editModePanels}
  selectedPanelId={selectedPanelId}
  selectedGroupId={selectedGroupId}
  snapEnabled={snapEnabled}
  rotationMode={rotationMode}
  viewMode={viewMode}
  onSelectPanel={setSelectedPanelId}
  onSelectGroup={setSelectedGroupId}
  onUpdatePanel={handleUpdatePanel}
  onUpdateGroup={handleUpdateGroup}
  onEnterEditMode={enterEditMode}
  onExitEditMode={exitEditMode}
/>
```

Update the `EditorSidebar` props:

```tsx
<EditorSidebar
  groups={groups}
  ungroupedPanels={ungroupedPanels}
  editingGroupId={editingGroupId}
  editingPanels={editModePanels}
  selectedPanelId={selectedPanelId}
  selectedGroupId={selectedGroupId}
  onSelectPanel={setSelectedPanelId}
  onSelectGroup={setSelectedGroupId}
  onAddPanel={() => setShowAddPicker(true)}
  onDuplicatePanel={handleDuplicatePanel}
  onDeletePanel={handleDeletePanel}
  onDeleteGroup={handleDeleteGroup}
  onEnterEditMode={enterEditMode}
  onExitEditMode={exitEditMode}
  onRenameGroup={handleRenameGroup}
  onGroupPanels={handleGroupPanels}
  onUngroupGroup={handleUngroupGroup}
/>
```

Update the `EditorParameters` props:

```tsx
<EditorParameters
  panel={selectedPanel}
  selectedGroup={selectedGroupId ? groups.find((g) => g.id === selectedGroupId) ?? null : null}
  overallDims={dims}
  showOverallDims={
    editingGroupId !== null ||
    (groups.length === 1 && ungroupedPanels.length === 0)
  }
  editingGroupId={editingGroupId}
  onUpdatePanel={handleUpdatePanel}
  onUpdateGroup={handleUpdateGroup}
  onUpdateDims={handleDimsChange}
  style={style}
  onStyleChange={setStyle}
  multiSelectCount={selectedPanelIds.length}
/>
```

Update the chat panel callbacks (they currently use the removed `updatePanels`):

```ts
const handleUpdatePanelMaterial = useCallback(
  (panelLabel: string, materialId: string) => {
    if (editingGroupId) {
      setEditModePanels((prev) =>
        (prev ?? []).map((p) =>
          p.label.toLowerCase() === panelLabel.toLowerCase() ? { ...p, materialId } : p
        )
      );
    } else {
      // Search across all groups and ungrouped panels
      updateScene(
        (prev) => prev.map((g) => ({
          ...g,
          panels: g.panels.map((p) =>
            p.label.toLowerCase() === panelLabel.toLowerCase() ? { ...p, materialId } : p
          ),
        })),
        (prev) => prev.map((p) =>
          p.label.toLowerCase() === panelLabel.toLowerCase() ? { ...p, materialId } : p
        )
      );
    }
  },
  [editingGroupId, updateScene]
);

const handleUpdateAllMaterials = useCallback((materialId: string) => {
  if (editingGroupId) {
    setEditModePanels((prev) => (prev ?? []).map((p) => ({ ...p, materialId })));
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
      })),
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
  const newPanel: PanelData = { id, ...preset };
  if (editingGroupId) {
    setEditModePanels((prev) => [...(prev ?? []), newPanel]);
  } else {
    updateScene((g) => g, (prev) => [...prev, newPanel]);
  }
}, [editingGroupId, updateScene]);
```

Then pass to DesignChatPanel:

```tsx
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
```

Add mode indicator badge to the toolbar (next to the help button):

```tsx
{/* Mode indicator */}
{editingGroupId ? (
  <div className="flex items-center gap-2">
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
      Editing: {groups.find((g) => g.id === editingGroupId)?.name ?? "Group"}
    </span>
    <Button variant="outline" size="sm" onClick={exitEditMode} className="h-7 text-xs">
      Done
    </Button>
  </div>
) : (
  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
    Scene Mode
  </span>
)}
```

- [ ] **Step 16: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors from child components (they still expect old props). This is OK — we fix them in subsequent tasks.

- [ ] **Step 17: Commit**

```bash
git add src/components/design/editor/FurnitureEditor.tsx
git commit -m "feat: rewrite FurnitureEditor state for group/edit modes"
```

---

## Task 3: EditorViewport — Group rendering, double-click, dimming

**Files:**
- Modify: `src/components/design/editor/EditorViewport.tsx`

- [ ] **Step 1: Update the `EditorViewportProps` interface**

Replace the existing props interface with:

```ts
export interface EditorViewportProps {
  groups: GroupData[];
  ungroupedPanels: PanelData[];
  editingGroupId: string | null;
  editingPanels: PanelData[] | null;
  selectedPanelId: string | null;
  selectedGroupId: string | null;
  snapEnabled: boolean;
  rotationMode: boolean;
  viewMode: ViewMode;
  onSelectPanel: (id: string | null) => void;
  onSelectGroup: (id: string | null) => void;
  onUpdatePanel: (id: string, updates: Partial<PanelData>) => void;
  onUpdateGroup: (groupId: string, updates: Partial<GroupData>) => void;
  onEnterEditMode: (groupId: string) => void;
  onExitEditMode: () => void;
}
```

Add the import for `GroupData`:

```ts
import type { PanelData, GroupData } from "@/lib/furnitureData";
```

- [ ] **Step 2: Add `GroupBoundingBox` component**

Add this R3F component inside EditorViewport.tsx:

```tsx
function GroupBoundingBox({ panels, color = "#3b82f6", dashed = false }: {
  panels: PanelData[];
  color?: string;
  dashed?: boolean;
}) {
  const geometry = useMemo(() => {
    if (panels.length === 0) return null;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of panels) {
      const [px, py, pz] = p.position;
      const [sx, sy, sz] = p.size;
      minX = Math.min(minX, px - sx / 2);
      maxX = Math.max(maxX, px + sx / 2);
      minY = Math.min(minY, py - sy / 2);
      maxY = Math.max(maxY, py + sy / 2);
      minZ = Math.min(minZ, pz - sz / 2);
      maxZ = Math.max(maxZ, pz + sz / 2);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const sx = maxX - minX + 0.02;
    const sy = maxY - minY + 0.02;
    const sz = maxZ - minZ + 0.02;
    return { center: [cx, cy, cz] as [number, number, number], size: [sx, sy, sz] as [number, number, number] };
  }, [panels]);

  if (!geometry) return null;

  return (
    <lineSegments position={geometry.center}>
      <edgesGeometry args={[new THREE.BoxGeometry(...geometry.size)]} />
      <lineDashedMaterial
        color={color}
        dashSize={dashed ? 0.02 : 1000}
        gapSize={dashed ? 0.01 : 0}
        linewidth={1}
      />
    </lineSegments>
  );
}
```

- [ ] **Step 3: Update the main Canvas rendering**

Replace the panel rendering section. The key structure:
- Groups are wrapped in R3F `<group>` with position/rotation
- In Scene Mode: clicking a panel inside a group selects the group, double-click enters edit mode
- In Edit Mode: only the editing group's panels are interactive, everything else is dimmed

This is the core rendering logic — update the section where `FurniturePanel` components are mapped:

```tsx
{/* Render groups */}
{groups.map((g) => {
  const isEditing = editingGroupId === g.id;
  const isSelected = selectedGroupId === g.id;
  const isDimmed = editingGroupId !== null && !isEditing;

  if (isEditing && editingPanels) {
    // Edit mode: render panels at world-space positions (not inside group transform)
    return editingPanels.map((panel) => (
      <FurniturePanel
        key={panel.id}
        panel={panel}
        isSelected={panel.id === selectedPanelId}
        dimmed={false}
        opacity={panel.id === selectedPanelId ? 1 : 0.7}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPanel(panel.id);
        }}
        onDoubleClick={(e) => {
          // Door/drawer toggle in edit mode
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          // Start drag...existing logic
        }}
        onUpdatePanel={onUpdatePanel}
        allPanels={editingPanels}
        snapEnabled={snapEnabled}
        rotationMode={rotationMode}
      />
    ));
  }

  return (
    <group key={g.id} position={g.position} rotation={g.rotation}>
      {g.panels.map((panel) => (
        <FurniturePanel
          key={panel.id}
          panel={panel}
          isSelected={false}
          dimmed={isDimmed}
          opacity={isDimmed ? 0.3 : 1}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDimmed) onSelectGroup(g.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!isDimmed) onEnterEditMode(g.id);
          }}
          pointerEvents={isDimmed ? false : true}
          onUpdatePanel={() => {}} // no-op in scene mode
          allPanels={g.panels}
          snapEnabled={false}
          rotationMode={false}
        />
      ))}
      {isSelected && <GroupBoundingBox panels={g.panels} color="#3b82f6" />}
    </group>
  );
})}

{/* Render ungrouped panels */}
{ungroupedPanels.map((panel) => {
  const isDimmed = editingGroupId !== null;
  return (
    <FurniturePanel
      key={panel.id}
      panel={panel}
      isSelected={panel.id === selectedPanelId}
      dimmed={isDimmed}
      opacity={isDimmed ? 0.3 : 1}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDimmed) onSelectPanel(panel.id);
      }}
      pointerEvents={isDimmed ? false : true}
      onUpdatePanel={onUpdatePanel}
      allPanels={ungroupedPanels}
      snapEnabled={snapEnabled}
      rotationMode={rotationMode}
    />
  );
})}

{/* Edit mode dashed border */}
{editingGroupId && editingPanels && (
  <GroupBoundingBox panels={editingPanels} color="#f97316" dashed />
)}
```

- [ ] **Step 4: Update the `DragController` for group dragging**

When in Scene Mode with a group selected, the drag controller should update `group.position` instead of `panel.position`. Add group drag support:

```ts
// In the pointermove handler, check if we're dragging a group:
if (dragState.current.isDragging && selectedGroupId && !editingGroupId) {
  // Group drag — update group position
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersection);

  if (dragState.current.startPoint && dragState.current.startPos) {
    const delta = intersection.clone().sub(dragState.current.startPoint);
    let newX = dragState.current.startPos[0] + delta.x;
    let newZ = dragState.current.startPos[2] + delta.z;

    if (snapEnabled) {
      newX = snapToGrid(newX, 0.01);
      newZ = snapToGrid(newZ, 0.01);
    }

    onUpdateGroup(selectedGroupId, {
      position: [newX, dragState.current.startPos[1], newZ],
    });
  }
}
```

- [ ] **Step 5: Update `onPointerMissed` for deselection**

In edit mode, clicking empty space deselects the current panel but does NOT exit edit mode (to avoid frustrating accidental exits — users must use Escape or Done button to exit). In scene mode, clicking empty space deselects all:

```tsx
onPointerMissed={() => {
  if (editingGroupId) {
    onSelectPanel(null); // Deselect panel but stay in edit mode
  } else {
    onSelectPanel(null);
    onSelectGroup(null);
  }
}}
```

- [ ] **Step 6: Add `FurniturePanel` opacity/dimmed props**

Update the `FurniturePanel` component to accept `opacity` and `dimmed` props that control material transparency and pointer-events:

```tsx
// Add to FurniturePanel props:
opacity?: number;
dimmed?: boolean;
pointerEvents?: boolean;

// In the mesh rendering, apply opacity:
<meshStandardMaterial
  color={color}
  roughness={...}
  metalness={...}
  transparent={isGlass || (opacity !== undefined && opacity < 1)}
  opacity={opacity ?? (isGlass ? 0.3 : 1)}
/>

// Disable pointer events on dimmed panels:
<mesh
  // ...existing props
  raycast={pointerEvents === false ? () => {} : undefined}
>
```

- [ ] **Step 7: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 8: Commit**

```bash
git add src/components/design/editor/EditorViewport.tsx
git commit -m "feat: add group rendering, double-click edit mode, dimming in viewport"
```

---

## Task 4: EditorSidebar — Group list and edit mode view

**Files:**
- Modify: `src/components/design/editor/EditorSidebar.tsx`

- [ ] **Step 1: Update the props interface and rewrite the component**

Replace the entire `EditorSidebar` component with the new version that shows:
- **Scene Mode**: collapsible group items with folder icons, editable names, ungrouped panels below
- **Edit Mode**: only the editing group's panels, with "Back to Scene" header

```tsx
import { useState } from "react";
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Folder, ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PanelData, GroupData } from "@/lib/furnitureData";

interface EditorSidebarProps {
  groups: GroupData[];
  ungroupedPanels: PanelData[];
  editingGroupId: string | null;
  editingPanels: PanelData[] | null;
  selectedPanelId: string | null;
  selectedGroupId: string | null;
  onSelectPanel: (id: string | null) => void;
  onSelectGroup: (id: string | null) => void;
  onAddPanel: () => void;
  onDuplicatePanel: (id: string) => void;
  onDeletePanel: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onEnterEditMode: (groupId: string) => void;
  onExitEditMode: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onGroupPanels: (name: string) => void;
  onUngroupGroup: (groupId: string) => void;
}
```

The component body should render differently based on `editingGroupId`:

**Edit Mode view:**
```tsx
if (editingGroupId && editingPanels) {
  const group = groups.find((g) => g.id === editingGroupId);
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <button onClick={onExitEditMode} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">
          {group?.name ?? "Group"}
        </h3>
        <Button variant="ghost" size="sm" onClick={onAddPanel} className="h-7 px-2">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {editingPanels.map((panel) => (
          <PanelRow key={panel.id} panel={panel} ... />
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
        {editingPanels.length} panel{editingPanels.length !== 1 ? "s" : ""} in group
      </div>
    </div>
  );
}
```

**Scene Mode view:**
```tsx
return (
  <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">Objects</h3>
      <Button variant="ghost" size="sm" onClick={onAddPanel} className="h-7 px-2">
        <Plus className="w-3.5 h-3.5 mr-1" /> Add
      </Button>
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {/* Groups */}
      {groups.map((group) => (
        <GroupItem key={group.id} group={group} ... />
      ))}
      {/* Ungrouped panels */}
      {ungroupedPanels.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider px-2 mb-1.5 mt-3">
            Ungrouped
          </p>
          {ungroupedPanels.map((panel) => (
            <PanelRow key={panel.id} panel={panel} ... />
          ))}
        </div>
      )}
    </div>
    <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
      {groups.length} group{groups.length !== 1 ? "s" : ""}, {ungroupedPanels.length} ungrouped
    </div>
  </div>
);
```

The `GroupItem` sub-component shows: folder icon, editable name, expand/collapse toggle, context menu (Edit, Rename, Ungroup, Delete). When expanded, child panels are shown as read-only rows.

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/design/editor/EditorSidebar.tsx
git commit -m "feat: rewrite sidebar for group list and edit mode views"
```

---

## Task 5: EditorParameters — Group properties and conditional Overall Size

**Files:**
- Modify: `src/components/design/editor/EditorParameters.tsx`

- [ ] **Step 1: Update props interface**

```ts
interface EditorParametersProps {
  panel: PanelData | null;
  selectedGroup: GroupData | null;
  overallDims: { w: number; h: number; d: number };
  showOverallDims: boolean;
  editingGroupId: string | null;
  onUpdatePanel: (id: string, updates: Partial<PanelData>) => void;
  onUpdateGroup: (groupId: string, updates: Partial<GroupData>) => void;
  onUpdateDims: (dims: { w: number; h: number; d: number }) => void;
  style: string;
  onStyleChange: (style: string) => void;
  multiSelectCount: number;
}
```

Add import for `GroupData`.

- [ ] **Step 2: Add conditional Overall Size rendering**

Wrap the "Overall Size" section with `{showOverallDims && ( ... )}`.

- [ ] **Step 3: Add group properties section**

When `selectedGroup` is not null and `editingGroupId` is null (Scene Mode with group selected), show:
- Group name (read-only display)
- Group position X/Y/Z (in mm, editable)
- Group rotation X/Y/Z (in degrees, editable)
- No size fields

```tsx
{selectedGroup && !editingGroupId && (
  <div className="p-4 border-b border-gray-100">
    <h3 className="text-sm font-semibold text-gray-900 mb-1">{selectedGroup.name}</h3>
    <p className="text-[10px] text-gray-400 mb-3">{selectedGroup.panels.length} panels</p>

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
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">mm</span>
          </div>
        </div>
      ))}
    </div>

    <div className="flex items-center gap-1.5 mb-1.5">
      <RotateCw className="w-3 h-3 text-gray-400" />
      <p className="text-[11px] text-gray-400">Rotation</p>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {(["X", "Y", "Z"] as const).map((axis, i) => (
        <div key={`rot-${axis}`}>
          <Label className="text-[11px] text-gray-500">{axis}</Label>
          <div className="relative">
            <Input
              type="number"
              step="15"
              value={Math.round((selectedGroup.rotation[i] * 180) / Math.PI)}
              onChange={(e) => {
                const newRot = [...selectedGroup.rotation] as [number, number, number];
                newRot[i] = ((parseInt(e.target.value) || 0) * Math.PI) / 180;
                onUpdateGroup(selectedGroup.id, { rotation: newRot });
              }}
              className="h-8 text-xs pr-6"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">°</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Add multi-select indicator**

When `multiSelectCount > 0`, show instead of panel properties:

```tsx
{multiSelectCount > 0 && (
  <div className="flex-1 flex items-center justify-center p-4">
    <p className="text-xs text-gray-400 text-center">
      {multiSelectCount} panels selected. Right-click to group.
    </p>
  </div>
)}
```

- [ ] **Step 5: Verify and commit**

```bash
git add src/components/design/editor/EditorParameters.tsx
git commit -m "feat: add group properties and conditional dims in parameters panel"
```

---

## Task 6: FurniturePreview — Render groups

**Files:**
- Modify: `src/components/design/FurniturePreview.tsx`

- [ ] **Step 1: Update props to accept both old and new format**

```ts
import type { PanelData, GroupData, EditorSceneData } from "@/lib/furnitureData";
import { panelsToWorldSpace } from "@/lib/groupUtils";

export interface FurniturePreviewProps {
  panels?: PanelData[] | EditorSceneData;
  className?: string;
}
```

- [ ] **Step 2: Flatten groups for rendering**

Inside the component, normalize the data:

```ts
const allPanels = useMemo(() => {
  if (!panels) return [];
  // Detect new format
  if ("groups" in panels && Array.isArray((panels as EditorSceneData).groups)) {
    const scene = panels as EditorSceneData;
    const result: PanelData[] = [];
    for (const g of scene.groups) {
      result.push(...panelsToWorldSpace(g.panels, g.position));
    }
    result.push(...(scene.ungroupedPanels ?? []));
    return result;
  }
  // Old format: flat array
  return (panels as PanelData[]).filter(
    (p) => p && Array.isArray(p.position) && Array.isArray(p.size) && p.position.length === 3 && p.size.length === 3
  );
}, [panels]);
```

Then use `allPanels` instead of `validPanels` for rendering.

- [ ] **Step 3: Commit**

```bash
git add src/components/design/FurniturePreview.tsx
git commit -m "feat: update preview to render grouped furniture"
```

---

## Task 7: FurnitureDesignFlow — Save/load with backward compat

**Files:**
- Modify: `src/pages/FurnitureDesignFlow.tsx`

- [ ] **Step 1: Update imports and types**

```ts
import type { EditorSceneData } from "@/lib/furnitureData";
```

Update the `handleSave` callback signature to accept the new type:

```ts
const handleSave = useCallback(
  async (data: { panels: EditorSceneData; dims: { w: number; h: number; d: number }; style: string; furnitureId: string }) => {
    if (!user || saving) return;
    setSaving(true);

    const { data: design, error } = await supabase
      .from("furniture_designs")
      .insert({
        customer_id: user.id,
        mode: state.mode!,
        space_type: state.spaceType!,
        room_id: state.roomId!,
        furniture_id: data.furnitureId,
        panels: data.panels as unknown as Record<string, unknown>,
        dimensions: data.dims as unknown as Record<string, unknown>,
        style: data.style,
      })
      .select("id")
      .single();

    // ...rest unchanged
  },
  [user, saving, state, navigate, toast]
);
```

- [ ] **Step 2: Add backward compat for loading saved designs**

If/when the app loads a saved design from Supabase, use `migrateSceneData()` from `groupUtils.ts` to detect the old flat `PanelData[]` format and wrap it in a group. This applies wherever designs are loaded from Supabase:

```ts
import { migrateSceneData } from "@/lib/groupUtils";

// When loading a design:
const rawPanels = savedDesign.panels;
const sceneData = migrateSceneData(rawPanels, savedDesign.furniture_id);
// Pass sceneData.groups and sceneData.ungroupedPanels to the editor
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/FurnitureDesignFlow.tsx
git commit -m "feat: update save/load flow for group data format with backward compat"
```

---

## Task 8: Update help overlay and final polish

**Files:**
- Modify: `src/components/design/editor/FurnitureEditor.tsx` (help overlay section)

- [ ] **Step 1: Update the help/shortcuts overlay**

Add a "Groups & Edit Mode" section to the help overlay:

```tsx
{/* Groups */}
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
```

Update the "Doors & Drawers" section to note that double-click behavior changed:

```tsx
["Double-click", "Toggle door/drawer (in edit mode)"],
```

- [ ] **Step 2: Full build verification**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Verify:
1. Editor loads with initial furniture as a group
2. Click on a part → whole group gets blue outline
3. Double-click → enters edit mode, individual parts selectable with orange outline
4. Move a part in edit mode → only that part moves
5. Press Escape → exits edit mode, back to scene mode
6. Drag the group → all parts move together
7. Load a library template → appears as new group
8. "From Image" → creates a new group

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete group & edit mode with help overlay and polish"
```

---

## Task Summary

| Task | Description | Depends On |
|---|---|---|
| 1 | Data model: `GroupData` type + `groupUtils.ts` | None |
| 2 | FurnitureEditor: replace state, all callbacks, mode logic | Task 1 |
| 3 | EditorViewport: group rendering, double-click, dimming | Tasks 1, 2 |
| 4 | EditorSidebar: group list, edit mode view | Tasks 1, 2 |
| 5 | EditorParameters: group props, conditional dims | Tasks 1, 2 |
| 6 | FurniturePreview: render groups | Task 1 |
| 7 | FurnitureDesignFlow: save/load compat | Task 2 |
| 8 | Help overlay + final polish | All above |
