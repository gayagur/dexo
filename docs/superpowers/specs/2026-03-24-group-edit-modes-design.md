# Group & Edit Mode — Design Spec

**Date**: 2026-03-24
**Status**: Approved
**Problem**: Furniture pieces made of multiple panels (e.g., a table with a top + 4 legs) cannot be moved as a unit. Moving one part leaves the others behind.

---

## Overview

Introduce two interaction modes — **Scene Mode** and **Edit Mode** — that let users manipulate furniture as grouped units or edit individual parts within a group. This mirrors the Figma/Blender model of grouped objects with enter-to-edit semantics.

---

## Data Model

### New type: `GroupData`

```ts
interface GroupData {
  id: string;                            // UUID via crypto.randomUUID()
  name: string;                          // "Dining Table", "Chair 1"
  position: [number, number, number];    // world-space origin
  rotation: [number, number, number];    // group rotation (radians)
  panels: PanelData[];                   // positions RELATIVE to group origin
}
```

Group IDs use `crypto.randomUUID()` to avoid collisions when loading saved designs. Panel IDs continue to use the existing sequential counter.

### Editor state

```ts
// Replaces the current flat `panels: PanelData[]`
groups: GroupData[]
ungroupedPanels: PanelData[]

// Mode & selection
editingGroupId: string | null       // null = Scene Mode, string = Edit Mode
selectedGroupId: string | null      // Scene Mode: which group is selected
selectedPanelId: string | null      // Edit Mode: panel in group; Scene Mode: ungrouped panel
selectedPanelIds: string[]          // Multi-select for ungrouped panels (Ctrl+Click)
```

### Multi-select behavior
- `selectedPanelIds` is used only in Scene Mode for selecting multiple ungrouped panels.
- Ctrl+Click an ungrouped panel toggles it in/out of `selectedPanelIds`.
- **Transition from single to multi-select**: When `selectedPanelId` is set to an ungrouped panel and user Ctrl+Clicks another ungrouped panel, the currently selected panel is moved into `selectedPanelIds`, `selectedPanelId` is cleared, and the Ctrl+Clicked panel is also added to `selectedPanelIds`.
- When `selectedPanelIds.length > 0`: parameters panel shows "N panels selected" with no editable fields. Delete key deletes all selected. Right-click shows "Group as Furniture".
- Dragging when multiple panels selected moves all of them together (apply same delta).
- Clicking a group or entering Edit Mode clears `selectedPanelIds`.
- **Edit Mode**: Multi-select (Ctrl+Click) is not supported within Edit Mode; only single panel selection is available.

### Rules

- Panel positions inside a group are **relative to the group origin** (0,0,0 = group center).
- The group origin is computed as the bounding box center of all child panels when the group is created.
- Undo/redo snapshots capture `{ groups, ungroupedPanels }`. Mode transitions (enter/exit Edit Mode) push a snapshot, but the mode flag itself is NOT part of the undo stack. Undo always operates within the current mode — it will not cross mode boundaries. Undoing to the mode-entry snapshot leaves the user in Edit Mode with the group in its pre-edit state; the user must explicitly exit Edit Mode.
- Supabase `panels` JSON column becomes `{ groups: GroupData[], ungroupedPanels: PanelData[] }`.

### Backward compatibility (Supabase)
- On load, detect whether the stored `panels` value is a flat `PanelData[]` (old format) or `{ groups, ungroupedPanels }` (new format).
- If old format: wrap the entire array into a single `GroupData` with the furniture name, compute group center, convert positions to relative. No Supabase migration needed.
- On next save, the new format is written. This is a lazy migration.

---

## Scene Mode (default)

### Selection
- Clicking any panel belonging to a group selects the **entire group** (`selectedGroupId` set).
- Clicking an ungrouped panel selects that panel (`selectedPanelId` set).
- Click empty space deselects all.
- Ctrl+Click to multi-select ungrouped panels (for grouping).

### Transforms
- **Move**: Dragging a selected group updates `group.position`. All child panels move together via R3F `<group>` nesting.
- **Rotate**: Rotating a selected group updates `group.rotation`. Three.js cascades rotation to children automatically.
- **Resize**: Not available on groups in Scene Mode (resize is per-panel in Edit Mode only).

### Rendering

```jsx
{groups.map(group => (
  <group key={group.id} position={group.position} rotation={group.rotation}>
    {group.panels.map(panel => (
      <FurniturePanel key={panel.id} panel={panel} />
    ))}
    {selectedGroupId === group.id && <GroupBoundingBox group={group} />}
  </group>
))}
{ungroupedPanels.map(panel => (
  <FurniturePanel key={panel.id} panel={panel} />
))}
```

---

## Edit Mode

### Entering
- **Double-click** on a group in the viewport or sidebar.
- Sets `editingGroupId` to that group's ID.
- Panel positions are temporarily converted from **relative → world-space** so existing drag/resize/rotation code works unchanged.
- **Double-click vs door/drawer toggle**: In Scene Mode, double-click on any panel belonging to a group always enters Edit Mode (never toggles doors). Door/drawer toggling is only available in Edit Mode, where individual panels are selectable.

### Behavior
- Selection targets **individual panels** within the group.
- All other groups and ungrouped panels are **dimmed** (opacity ~0.3) and **non-interactive** (pointer-events disabled).
- "Add Part" adds new panels directly into the editing group.
- Toolbar shows: `"Editing: <Group Name>"` with a "Done" button.

### Exiting
- Click **"Done"** button or press **Escape**.
- If in rotation mode, first Escape exits rotation mode; second Escape exits Edit Mode.
- Clicking on empty canvas space (not on any panel) also exits Edit Mode. Clicking on dimmed objects does nothing (they are non-interactive).
- Panel positions are converted back from **world-space → relative** (subtract group origin).
- Returns to Scene Mode with the group selected.

### Why world-space conversion?
The existing drag, resize, snap, and handle code all operate in world coordinates. Converting on enter/exit means we reuse 100% of existing transform logic without modification.

---

## Visual Indicators

| State | Visual |
|---|---|
| Scene Mode — group selected | Blue outline around entire group bounding box |
| Scene Mode — ungrouped panel selected | Orange wireframe (unchanged) |
| Edit Mode — group boundary | Subtle dashed border around group bounding area |
| Edit Mode — selected panel | Orange outline |
| Edit Mode — other panels in group | Slightly transparent (opacity ~0.7) |
| Edit Mode — everything outside group | Dimmed (opacity ~0.3), non-interactive |
| Toolbar indicator | Badge: `"Scene Mode"` or `"Editing: <Group Name>"` |

---

## Grouping Controls

### Create group
- Select multiple ungrouped panels (Ctrl+Click) → right-click → **"Group as Furniture"** → enter name → creates `GroupData`.
- Panel positions are converted from world-space to relative (subtract computed group center).

### Ungroup
- Right-click a group → **"Ungroup"** → dissolves group, panels become ungrouped.
- Panel positions are converted from relative back to world-space (add group position).

### Rename
- Right-click a group → **"Rename"**, or click the group name in the sidebar.

---

## Sidebar Changes (`EditorSidebar.tsx`)

### Scene Mode view
- Groups shown as collapsible items with folder icon and editable name.
- Click group name to select the whole group.
- Expand to preview child panels (read-only, not individually selectable).
- Ungrouped panels listed below groups.

### Edit Mode view
- Only shows panels of the group being edited.
- Same per-panel controls (duplicate, delete).
- "Add Part" adds to this group.
- Header: group name + "Back to Scene" button.

---

## Template Integration

- `getDefaultTemplate()` and library `buildPanels()` return `PanelData[]` as today.
- When loaded, the editor wraps the result in a `GroupData` with:
  - `id`: next group ID from counter
  - `name`: furniture label (e.g., "Dining Table")
  - `position`: bounding box center of all panels
  - `rotation`: [0, 0, 0]
  - `panels`: original panels with positions adjusted to be relative to the computed center

---

## Files to Modify

| File | Changes |
|---|---|
| `src/lib/furnitureData.ts` | Add `GroupData` interface, group ID counter |
| `src/components/design/editor/FurnitureEditor.tsx` | Replace `panels` state with `groups` + `ungroupedPanels`, add mode/selection state, coordinate conversion utilities, grouping/ungrouping functions |
| `src/components/design/editor/EditorViewport.tsx` | Group rendering with R3F `<group>`, double-click to enter Edit Mode, dimming/locking non-active objects, `GroupBoundingBox` component |
| `src/components/design/editor/EditorSidebar.tsx` | Group list view, edit mode view, rename, context menu |
| `src/components/design/editor/EditorParameters.tsx` | Show group properties (name, position, rotation) in Scene Mode; show panel properties in Edit Mode |
| `src/pages/FurnitureDesignFlow.tsx` | Update save/load to use new data shape |
| `src/components/design/FurniturePreview.tsx` | Update to render groups |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Double-click group | Enter Edit Mode |
| Escape | Exit rotation mode (if active), then exit Edit Mode |
| Done button | Exit Edit Mode |
| Ctrl+Click | Multi-select ungrouped panels (Scene Mode) |
| Ctrl+G | Group selected ungrouped panels |
| Ctrl+Shift+G | Ungroup selected group |
| Delete | Delete selected panel(s) or group |

---

## AI Chat Integration

- **Edit Mode**: AI operations (add/remove/update panels) target the editing group.
- **Scene Mode**: AI panel additions go to ungrouped panels.
- **"Build from image"**: Creates a new group with the generated panels.

---

## Group Rotation in Scene Mode

The existing `rotationMode` toggle applies to groups the same way it applies to panels. When a group is selected and rotation mode is active, horizontal drag rotates the group around its Y-axis. EditorParameters shows group name, position (x/y/z), and rotation (x/y/z) when a group is selected — no size fields (resize is per-panel in Edit Mode only).

---

## FurniturePreview.tsx

`FurniturePreview` receives the new `{ groups, ungroupedPanels }` data shape. It renders groups using R3F `<group>` nesting (same as EditorViewport) and ungrouped panels flat. No interaction logic needed — preview is read-only.

---

## Overall Dimensions with Groups

Overall Size controls are shown in Scene Mode only when there is exactly one group AND zero ungrouped panels. Otherwise they are hidden. In Edit Mode, "Overall Size" scales all panels within the editing group proportionally (same logic as today, scoped to the group's panels).

---

## Context Menu

Right-click context menus appear in **both** the viewport and the sidebar:
- Viewport: right-click on selected ungrouped panels → "Group as Furniture"; right-click on a group → "Ungroup", "Rename", "Enter Edit Mode"
- Sidebar: same options on right-click of group names or selected panels

---

## Out of Scope

- Proportional group resize (scaling entire furniture uniformly)
- Nested groups (groups within groups)
- Copy/paste groups
- Group snapping (snap group edges to other groups)
- Drag-to-group (dragging an ungrouped panel onto a group to add it)
