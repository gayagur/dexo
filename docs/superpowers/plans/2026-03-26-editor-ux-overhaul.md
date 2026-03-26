# 3D Editor Complete UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the 3D furniture editor from an engineer-focused tool into an intuitive design tool that any interior designer can use within 60 seconds.

**Architecture:** The editor is a Vite + React + Three.js (react-three-fiber) application with 8 files totaling ~8,150 lines. We refactor in-place, touching FurnitureEditor.tsx (toolbar + undo), EditorParameters.tsx (right sidebar), EditorSidebar.tsx (left sidebar), EditorViewport.tsx (resize handles + Y-axis handle + status bar), and DesignChatPanel.tsx (floating AI panel). Each task is independent enough for isolated commits.

**Tech Stack:** React 18, TypeScript, react-three-fiber, drei, Tailwind CSS, lucide-react icons, shadcn/ui components.

**Key files:**
- `src/components/design/editor/FurnitureEditor.tsx` (1,580 lines) — Main orchestrator, toolbar, layout
- `src/components/design/editor/EditorViewport.tsx` (2,706 lines) — 3D canvas, handles, interactions
- `src/components/design/editor/EditorParameters.tsx` (792 lines) — Right sidebar properties
- `src/components/design/editor/EditorSidebar.tsx` (402 lines) — Left sidebar object tree
- `src/components/design/editor/DesignChatPanel.tsx` (545 lines) — AI assistant
- `src/components/design/editor/AddPartPicker.tsx` (907 lines) — Part preset browser

---

## Task 1: Simplify Top Toolbar

**Files:**
- Modify: `src/components/design/editor/FurnitureEditor.tsx:974-1248`

**What changes:**
- Remove: Library button, From Image button, AI Assistant button, Reset button, Scene Mode badge, floor preset dropdown from main toolbar
- Move floor preset + Reset to a `...` overflow menu (MoreVertical icon)
- Keep only: Back, Breadcrumb, Undo/Redo, Snap, View modes (3D/Front/Top/Side), Day/Night, Save status, Save, Finish
- Move Rotation mode toggle to be part of the selection handles (automatic when R pressed, no persistent button)
- Smaller undo/redo icons, positioned after breadcrumb

**Target layout:**
```
← Back | DEXO / Studio / Room / Type     ↶ ↷ | 🧲 | [3D][Front][Top][Side] | ☀🌙 | ⋮ | ● Save | [Finish →]
```

- [ ] **Step 1:** Remove Library button (lines 1125-1133), From Image button+input (lines 1135-1160), AI Assistant button (lines 1164-1176), Reset button (lines 1197-1200), Scene Mode badge (lines 1113-1123), floor preset Select (lines 1081-1098)
- [ ] **Step 2:** Add a `...` overflow dropdown menu containing: Floor preset selector, Reset, Help (?)
- [ ] **Step 3:** Reorder remaining buttons: Undo/Redo right after breadcrumb, then Snap, then view modes, then Day/Night, then overflow, then Save/Finish
- [ ] **Step 4:** Add floating AI button (bottom-right of viewport, fixed position) — simple circle button with MessageSquare icon, opens chat panel
- [ ] **Step 5:** Add floating Library button (bottom-right, above AI button) — BookOpen icon, toggles left sidebar to library mode
- [ ] **Step 6:** Verify: toolbar fits on 1024px viewport without wrapping
- [ ] **Step 7:** Commit: `refactor(editor): simplify toolbar — remove clutter, add overflow menu`

---

## Task 2: Simplify Right Sidebar — Collapsible Sections, Material First

**Files:**
- Modify: `src/components/design/editor/EditorParameters.tsx:329-792`

**What changes:**
- When nothing selected: show "Click an object to edit it" with tips
- When panel selected, reorder sections:
  1. **Element name** at top (bold, with edit icon)
  2. **Material** section (always expanded — most used)
  3. **Size** section (collapsed by default, W/H/D inputs + proportional lock)
  4. **Position** section (collapsed by default, X/Y/Z)
  5. **Rotation** section (collapsed by default, X/Y/Z)
- Remove: "Overall Size" top section (redundant), Style tag buttons (Modern/Classic/etc), "panels" counter text
- Each section has a chevron toggle header
- When group selected: same pattern — Name, Material, Scale, Position

- [ ] **Step 1:** Create a `CollapsibleSection` component: header with label + chevron, animated collapse
- [ ] **Step 2:** Rewrite the panel-selected view: element name header, then Material (expanded), Size (collapsed), Position (collapsed), Rotation (collapsed)
- [ ] **Step 3:** Rewrite group-selected view: group name header, Material (expanded), Scale (collapsed)
- [ ] **Step 4:** Add empty state: "Click an object to edit it" message with icon and tips
- [ ] **Step 5:** Remove Overall Size section from top of sidebar (showOverallDims area)
- [ ] **Step 6:** Remove Style buttons (STYLES array rendering, lines 324-327, and style change UI)
- [ ] **Step 7:** Verify: sidebar renders correctly for panel selection, group selection, and nothing selected
- [ ] **Step 8:** Commit: `refactor(editor): simplify right sidebar — collapsible sections, material first`

---

## Task 3: Fix Resize Handles — Larger, Visible, Works on ALL Shapes

**Files:**
- Modify: `src/components/design/editor/EditorViewport.tsx:1270-1519`

**What changes:**
- Remove the `if (shape !== "box") return null` guard at line 1284 — handles should work on everything
- Increase handle geometry from 0.025 to 0.04 (visual size ~12px)
- Change handle colors: white fill with blue border (not axis-colored — confusing)
- Corner handles: 4 at top face, 4 at bottom face
- Edge midpoint handles: 6 faces (left, right, top, bottom, front, back)
- Corner drag = proportional resize (maintain aspect ratio W:D)
- Edge drag = single axis only
- Add minimum size enforcement: 0.01m (10mm) in any axis
- Show dimension tooltip during drag (already exists, verify it works for all shapes)

- [ ] **Step 1:** Remove the `if (shape !== "box") return null` guard in SelectionHandles
- [ ] **Step 2:** Compute bounding box size for any shape (use panel.size as-is — it's already the bounding box)
- [ ] **Step 3:** Increase handle size from 0.025 to 0.04, change material to white with blue emissive
- [ ] **Step 4:** Add minimum size enforcement: `Math.max(0.01, newSize[axis])` in ResizeHandle drag handler
- [ ] **Step 5:** Verify proportional resize on corners and single-axis on edges
- [ ] **Step 6:** Test with non-box shapes (cylinder, sphere, rounded_rect) — confirm handles appear and resize works
- [ ] **Step 7:** Commit: `fix(editor): resize handles work on all shapes, larger and more visible`

---

## Task 4: Add Vertical Move Handle (Green Y-Axis Arrow)

**Files:**
- Modify: `src/components/design/editor/EditorViewport.tsx` (add new component ~80 lines, near SelectionHandles)
- Modify: `src/components/design/editor/FurnitureEditor.tsx` (remove Shift+Drag Y behavior docs, keep functionality)

**What changes:**
- Add a green upward-pointing arrow/handle ABOVE the selected element's bounding box
- Drag this handle up/down = Y-axis movement only
- Show tooltip during drag: "Height: 0mm → 450mm"
- Keep Shift+Drag as an alternative (power users), but the green handle is the primary discovery path
- Handle appearance: green sphere (0.03 radius) with a thin green line connecting to the element top

- [ ] **Step 1:** Create `YAxisHandle` component inside EditorViewport.tsx:
  - Renders at `[0, h/2 + 0.06, 0]` relative to panel position (above the element)
  - Green sphere geometry (radius 0.03) + thin cylinder connecting to panel top
  - onPointerDown captures start Y, onPointerMove computes delta, updates panel position Y
  - Shows drag info: "Elevation: {mm}mm"
- [ ] **Step 2:** Render `YAxisHandle` when a panel is selected (alongside SelectionHandles)
- [ ] **Step 3:** Add onPointerUp to commit position (triggers history push from existing handleUpdatePanel)
- [ ] **Step 4:** Add "Elevation" input in right sidebar Position section (reads/writes Y position in mm)
- [ ] **Step 5:** Test: select a panel, drag green handle up, verify Y position changes, tooltip shows
- [ ] **Step 6:** Commit: `feat(editor): add green Y-axis handle for vertical movement`

---

## Task 5: Fix Undo — Batch by Action, Not Micro-Steps

**Files:**
- Modify: `src/components/design/editor/FurnitureEditor.tsx:134-199` (history system)
- Modify: `src/components/design/editor/EditorViewport.tsx` (drag handlers — only push on pointerUp)

**What changes:**
- Currently `onUpdatePanel` is called on every pixel of movement during drag, and each call goes through `handleUpdatePanel` which calls `updateScene` → `pushHistory`. This creates hundreds of history entries per drag.
- Fix: split `handleUpdatePanel` into two modes:
  1. `handleUpdatePanelLive(id, updates)` — updates state BUT DOES NOT push history (for real-time drag feedback)
  2. `handleUpdatePanelCommit(id, updates)` — updates state AND pushes history (for mouse-up / final values)
- EditorViewport: drag handlers call `onUpdatePanelLive` during drag, `onUpdatePanelCommit` on pointerUp
- Same for resize handles: `onUpdate` during drag (no history), commit on pointerUp
- Debounce sidebar number inputs: push history 500ms after last keystroke
- Camera changes never push history (already the case)
- Selection changes never push history (already the case)

- [ ] **Step 1:** In FurnitureEditor.tsx, create `handleUpdatePanelLive`:
  ```typescript
  const handleUpdatePanelLive = useCallback((id: string, updates: Partial<PanelData>) => {
    // Same logic as handleUpdatePanel but WITHOUT pushHistory
    if (editingGroupId && editModePanels) {
      setEditModePanels(prev => prev!.map(p => p.id === id ? { ...p, ...updates } : p));
    } else {
      setGroups(prev => prev.map(g => ({
        ...g, panels: g.panels.map(p => p.id === id ? { ...p, ...updates } : p)
      })));
      setUngroupedPanels(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
  }, [editingGroupId, editModePanels]);
  ```
- [ ] **Step 2:** Create `handleUpdatePanelCommit` — same as current `handleUpdatePanel` (with pushHistory)
- [ ] **Step 3:** Pass both `onUpdatePanelLive` and `onUpdatePanelCommit` to EditorViewport
- [ ] **Step 4:** In EditorViewport DragController: call `onUpdatePanelLive` during pointermove, call `onUpdatePanelCommit` on pointerup
- [ ] **Step 5:** In ResizeHandle: call `onUpdate` (which becomes `onUpdatePanelLive`) during drag, add a new `onCommit` prop called on pointerUp
- [ ] **Step 6:** In EditorParameters number inputs: debounce 500ms before calling `onUpdatePanel` (commit)
- [ ] **Step 7:** Verify: drag an element → undo → element jumps back to pre-drag position (not 1px back)
- [ ] **Step 8:** Commit: `fix(editor): batch undo by action — no micro-steps during drag/resize`

---

## Task 6: Simplify Left Sidebar — Search, Tabs, Scene Objects at Bottom

**Files:**
- Modify: `src/components/design/editor/EditorSidebar.tsx:265-402`
- Modify: `src/components/design/editor/FurnitureEditor.tsx:1252-1280` (sidebar rendering)

**What changes:**
- Top: search input that filters scene objects
- Middle: Scene Objects list (groups + ungrouped panels — the current content)
- Bottom: [+ Add] button (full width, prominent)
- Remove the "Objects" header text — the sidebar IS the objects panel
- Keep edit mode behavior as-is (it works well)

- [ ] **Step 1:** Add search input at top of EditorSidebar (filters panels by label)
- [ ] **Step 2:** Move [+ Add] button to bottom of sidebar (sticky, full width)
- [ ] **Step 3:** Clean up "Objects" header — make it slimmer, remove redundant text
- [ ] **Step 4:** Verify search filters panels correctly, Add button works
- [ ] **Step 5:** Commit: `refactor(editor): simplify left sidebar — search + bottom add button`

---

## Task 7: Make AI Assistant a Floating Panel

**Files:**
- Modify: `src/components/design/editor/DesignChatPanel.tsx:96-545`
- Modify: `src/components/design/editor/FurnitureEditor.tsx:1331-1346` (chat panel rendering)

**What changes:**
- AI panel becomes a floating overlay (not attached to sidebar layout)
- Positioned bottom-right, 380px wide, 500px max height
- Has a draggable header bar (grip dots or title area)
- Close (X) and minimize (-) buttons in header
- When closed, only the floating 💬 button is visible
- "Upload a furniture photo" action inside the chat panel (moved from toolbar)
- Panel has subtle shadow + rounded corners, matches the app's design system

- [ ] **Step 1:** Wrap DesignChatPanel in a floating container div:
  - `position: fixed; bottom: 80px; right: 16px; width: 380px; max-height: 500px`
  - Rounded corners, shadow-xl, border
  - z-index: 40
- [ ] **Step 2:** Add draggable header: store position in state, onMouseDown/Move/Up for drag
- [ ] **Step 3:** Add minimize button: collapses to just the header bar (title + expand button)
- [ ] **Step 4:** Move "From Image" upload button INTO the chat panel (above the text input)
- [ ] **Step 5:** Remove the old From Image toolbar button/input (already removed in Task 1)
- [ ] **Step 6:** Style floating trigger button: fixed bottom-right, 48x48, MessageSquare icon, shadow
- [ ] **Step 7:** Verify: open/close/minimize/drag all work, image upload works from inside chat
- [ ] **Step 8:** Commit: `refactor(editor): AI assistant as floating draggable panel`

---

## Task 8: Right-Click Context Menu

**Files:**
- Modify: `src/components/design/editor/EditorViewport.tsx` (add context menu component ~60 lines)
- Modify: `src/components/design/editor/FurnitureEditor.tsx` (add context menu state + handlers)

**What changes:**
- Right-click on any element shows a context menu with: Duplicate, Delete, Change Material (submenu), Edit Parts (if group), Group/Ungroup, Copy/Paste
- Menu positioned at mouse cursor
- Click outside or Escape to close
- Currently right-click only works for door/drawer toggle — extend it

- [ ] **Step 1:** Create `EditorContextMenu` component in EditorViewport.tsx:
  - Props: `x, y, panelId, groupId, onDuplicate, onDelete, onClose`
  - Renders a `position: fixed` div at (x, y) with menu items
  - Each item has label + keyboard shortcut hint (right-aligned, gray)
- [ ] **Step 2:** Add state in FurnitureEditor: `contextMenu: { x, y, panelId?, groupId? } | null`
- [ ] **Step 3:** Pass `onContextMenu` callback to EditorViewport → FurniturePanel
- [ ] **Step 4:** Wire menu actions: Duplicate → handleDuplicatePanel, Delete → handleDeletePanel, etc.
- [ ] **Step 5:** Close on click-outside (useEffect with document click listener) and Escape key
- [ ] **Step 6:** Commit: `feat(editor): right-click context menu with duplicate, delete, material`

---

## Task 9: Status Bar (Bottom) + First-Time Hints

**Files:**
- Modify: `src/components/design/editor/FurnitureEditor.tsx` (add status bar below viewport)
- Create: `src/components/design/editor/EditorHints.tsx` (~80 lines)

**What changes:**

**Status bar:**
- Thin bar at bottom of viewport (not full page bottom)
- Shows context-sensitive help text:
  - Nothing selected: "Click an object to select it | Right-click for options | ? for shortcuts"
  - Panel selected: "Drag: move | Green arrow: height | Handles: resize | R: rotate | Del: delete"
  - Dragging: "Moving: X=300mm Z=210mm" (live coordinates)
  - Resizing: "Width: 1200mm → 1450mm" (live dimensions)

**First-time hints:**
- On first editor load (check localStorage `dexo_editor_hints_seen`), show 3 tooltip bubbles
- Hint 1: "Drag to move" — arrow pointing at the furniture
- Hint 2: "Drag handles to resize" — arrow pointing at a resize handle
- Hint 3: "Change materials in the sidebar" — arrow pointing right
- Each disappears after user does that action once OR clicks "Got it"
- After all dismissed, set localStorage flag

- [ ] **Step 1:** Add status bar div below the viewport div in FurnitureEditor layout:
  - 28px tall, bg-white/80 backdrop-blur, border-top
  - Text changes based on: nothing selected, panel selected, group selected, dragging, resizing
- [ ] **Step 2:** Pass `interactionState` from EditorViewport to status bar (dragging/resizing/idle + info text)
- [ ] **Step 3:** Create EditorHints component:
  - Checks localStorage for `dexo_editor_hints_seen`
  - Shows floating tooltip overlays with dismiss buttons
  - After all 3 dismissed, writes localStorage flag
- [ ] **Step 4:** Render EditorHints inside the viewport container
- [ ] **Step 5:** Commit: `feat(editor): add status bar with contextual help and first-time hints`

---

## Task 10: Keyboard Shortcuts Overlay Cleanup

**Files:**
- Modify: `src/components/design/editor/FurnitureEditor.tsx:1378-1540` (help overlay)

**What changes:**
- Simplify the shortcuts overlay — it's too verbose
- Organize into 3 columns: Transform | Actions | Navigation
- Reduce text, increase scanability
- Add the new features: "Green arrow: move up/down", "Right-click: context menu"
- Remove references to removed features (From Image button, etc.)

- [ ] **Step 1:** Rewrite the help overlay content: 3-column grid layout
- [ ] **Step 2:** Update shortcuts list: add green arrow, context menu; remove old references
- [ ] **Step 3:** Make overlay dismissable with Escape (already works via ? toggle)
- [ ] **Step 4:** Commit: `refactor(editor): clean up shortcuts overlay`

---

## Dependency Order

Tasks can be partially parallelized:

```
Task 1 (Toolbar)  ──┐
Task 2 (Right sidebar) ──┤── Independent, can run in parallel
Task 3 (Resize handles) ──┤
Task 6 (Left sidebar)  ──┘
                          │
Task 4 (Y-axis handle) ── depends on Task 3 (same file area)
Task 5 (Undo batching) ── depends on Task 3 (resize handlers)
Task 7 (Floating AI)   ── depends on Task 1 (toolbar changes)
Task 8 (Context menu)  ── depends on Task 1 (viewport changes)
                          │
Task 9 (Status bar + hints) ── depends on Tasks 1-8
Task 10 (Help overlay)     ── depends on Tasks 1-8
```

**Recommended execution order:** 1 → 2 → 3 → 6 → 4 → 5 → 7 → 8 → 9 → 10

Each task produces a working, committable state. No task breaks existing functionality.
