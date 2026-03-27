# DEXO Mobile Responsiveness — Phase 1: Global Foundation + 3D Editor

**Date:** 2026-03-27
**Scope:** Sub-project 1 of 3 — Global foundation utilities and full 3D editor mobile transformation
**Priority:** 3D editor mobile experience is the #1 priority

---

## 1. Overview

Transform the DEXO furniture editor from a desktop-only 3-panel layout into a full mobile editing experience using bottom sheet drawers, while establishing the global mobile foundation (hooks, components, CSS) that all subsequent phases will use.

### Out of Scope (Phase 2 & 3)
- Landing page, New Project flow, AI Chat (Phase 2)
- Blog, Admin panel (Phase 3)
- Any changes to 3D rendering logic, Three.js geometry, materials, Supabase queries, AI API calls, routing structure, or TypeScript interfaces
- The Decorative Items flow (untouched)

### Success Criteria
- No horizontal scrolling on any mobile screen
- All touch targets ≥ 44×44px
- All text ≥ 14px, all inputs ≥ 16px font (prevent iOS zoom)
- 3D editor works with touch: pinch zoom, tap select, double-tap edit mode
- Desktop layout is completely unchanged

---

## 2. Global Foundation

### 2.1 Enhanced `useIsMobile` Hook

**File:** `src/hooks/use-mobile.tsx` (modify existing)

The current hook returns only a boolean. Enhance it to return:

```ts
interface MobileInfo {
  isMobile: boolean;        // < 768px
  isTablet: boolean;        // >= 768px && < 1024px
  isTouchDevice: boolean;   // 'ontouchstart' in window || navigator.maxTouchPoints > 0
  isDesktop: boolean;       // >= 1024px
  isMobileLayout: boolean;  // < 1024px (isMobile || isTablet) — use this for editor layout checks
}
```

- Keep the existing `useIsMobile()` export working (backwards compatible)
- Add new `useMobileInfo()` export returning the full object
- **Important:** `isMobileLayout` is the correct check for the editor (< 1024px). Do NOT use `isMobile` alone for editor layout decisions — that's only < 768px.
- Use `window.matchMedia` for breakpoints (already the pattern)
- Touch detection via `'ontouchstart' in window || navigator.maxTouchPoints > 0` (check once, no listener needed)

### 2.2 Global CSS Additions

**File:** `src/index.css` (append)

```css
/* Mobile touch utilities */
button, a, [role="button"] {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

html, body {
  overflow-x: hidden;
}

/* Safe area support */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);
}
```

### 2.3 Viewport Meta Tag

**File:** `index.html` — already has proper viewport tag with `viewport-fit=cover`. No change needed.

### 2.4 MobileDrawer Component

**File:** `src/components/ui/MobileDrawer.tsx` (new)

The project already has `vaul` (Drawer) installed. Instead of building from scratch, create a thin wrapper around the existing `Drawer` from `src/components/ui/drawer.tsx` that adds:

- Props: `isOpen`, `onClose`, `title`, `children`, `height` (`'half' | 'full' | number`)
- Handle bar at top
- Backdrop blur
- `z-index: 50`
- Snap points: vaul 0.9.x uses string-based fractions — maps `'half'` to `["0.5"]`, `'full'` to `["1"]`
- Set `shouldScaleBackground={false}` — scaling the background with an active Three.js canvas causes visual artifacts
- Ensure `touch-action: auto` inside the drawer content so scrolling within sheets works normally

This wraps vaul's `Drawer.Root` + `Drawer.Content` with our standard props API, avoiding a duplicate drawer implementation.

### 2.5 Touch Gesture Handling

No additional gesture library needed. OrbitControls already handles pinch/zoom/pan/orbit natively. Double-tap and long-press are implemented via simple `pointerdown`/`pointerup` timers — no `@use-gesture/react` required.

---

## 3. 3D Editor Mobile Layout

### 3.1 Layout Transformation Strategy

**File:** `src/components/design/editor/FurnitureEditor.tsx`

The desktop layout (line 1391) is:
```
[EditorSidebar/LibraryBrowser] | [EditorViewport] | [EditorParameters] | [DesignChatPanel?]
```

On mobile (< 1024px), transform to:
```
┌─────────────────────────────────┐
│  [←] DEXO / Furniture  [↩][↪][⋮] │  ← Mobile toolbar (48px)
├─────────────────────────────────┤
│  ⚠ Edit Mode — tap to exit     │  ← Mode banner (conditional, 36px)
├─────────────────────────────────┤
│                                 │
│         3D VIEWPORT             │  ← Full screen canvas (100%)
│        (touch gestures)         │
│                                 │
├─────────────────────────────────┤
│ [📚] [✋/✏️] [⚙] [💬]          │  ← Bottom action bar (56px)
└─────────────────────────────────┘
```

**Decision logic:** Use `useMobileInfo()` hook. If `isMobile || isTablet` (i.e., < 1024px):
- Render mobile layout
- Hide desktop sidebars
- Show bottom action bar
- Library/Properties content moves into `MobileDrawer` bottom sheets

Desktop layout remains untouched — mobile layout is a conditional branch in the JSX.

### 3.2 Mobile Top Toolbar

Replace the full desktop toolbar (breadcrumb, view modes, snap, lighting, save, etc.) with a compact mobile version when < 1024px:

**Left side:**
- Back arrow (← 44×44px) + truncated project name (e.g., "Bookshelf" — max 15 chars)

**Right side:**
- Undo (↩ 44×44px)
- Redo (↪ 44×44px)
- Overflow menu (⋮ 44×44px) — Popover containing:
  - View mode selector (3D/Front/Top/Side)
  - Snap toggle
  - Day/Night lighting
  - Floor style
  - Save
  - Reset
  - Help
  - Submit to Library
  - Save & Exit

**Height:** 48px fixed, white background, border-bottom.

### 3.3 Bottom Action Bar

**File:** New component `src/components/design/editor/MobileEditorBar.tsx`

Fixed at bottom, 56px height + safe area inset padding:

| Button | Icon | Action |
|--------|------|--------|
| Library | 📚 BookOpen | Opens Library bottom sheet |
| Mode | ✋/✏️ Hand/Pencil | Toggles: Select mode ↔ Edit mode (disabled when no group selected) |
| Properties | ⚙ Settings2 | Opens Properties bottom sheet |
| AI | 💬 MessageSquare | Opens AI Chat bottom sheet |

Each button: icon (20px) + label (10px) below, centered. Active state = primary color accent (`#C87D5A`).

### 3.4 Library Bottom Sheet

**Trigger:** "Library" button in bottom action bar
**Component:** Wrap existing `LibraryBrowser` + `EditorSidebar` content inside `MobileDrawer`
**Height:** Half screen, draggable to full

**Two tabs:**
1. **Templates** — Render `<LibraryBrowser>` component as-is inside the drawer. On mobile: pass a `compact` prop or use Tailwind responsive classes to force 2-column grid, thumbnails 100×100px.
2. **Elements** — Render `<EditorSidebar>` component as-is inside the drawer (same 18 props it already receives). The component's internal layout will need minor Tailwind adjustments for the narrower drawer context, but no refactoring into sub-components.

Tab bar at top of sheet, pill-style toggle.

### 3.5 Properties Bottom Sheet

**Trigger:** "Properties" button in bottom action bar, or auto-opens when selecting an object
**Component:** Wrap `EditorParameters` content inside `MobileDrawer`
**Height:** Half screen, draggable to full

Content (from existing `EditorParameters`):
- If nothing selected: "Tap an object to edit its properties"
- If group selected (scene mode): Group name, Position X/Y/Z, Rotation Y slider, material picker
- If panel selected (edit mode): Width/Height/Depth (mm), Material, Color

**Mobile input adaptations:**
- Number inputs: `inputMode="decimal"` for numeric keyboard
- Stepper buttons (+ / −) flanking each input, 44×44px each
- Font size 16px minimum on all inputs
- Material picker: horizontal scroll row of material sphere thumbnails (56px each)

### 3.6 AI Chat Bottom Sheet

**Trigger:** "AI" button in bottom action bar
**Component:** Wrap `DesignChatPanel` inside `MobileDrawer`
**Height:** Full screen (this is a conversation UI, needs space)

### 3.7 Edit Mode Banner

When `editingGroupId` is set, show a banner below the mobile toolbar:

```
┌─────────────────────────────────┐
│ ✏️ Editing: Bookshelf    [Exit] │  ← 36px, orange-50 bg
└─────────────────────────────────┘
```

Replaces the desktop inline "Editing: Group" badge. "Exit" button calls `exitEditMode()`.

### 3.8 Context Menu → Long Press

Desktop right-click context menu (`EditorContextMenu`) needs a mobile trigger:

- **Long press (500ms)** on an object → show context menu
- Position the menu centered above the touch point (not at exact coordinates like desktop — finger obscures it)
- Same menu items: Duplicate, Delete, Edit Parts, Ungroup (note: the desktop also has a conditional "Group" action — omit on mobile for simplicity, grouping can be done via the Elements panel)
- Remove keyboard shortcut labels on mobile (e.g., just "Duplicate", not "Duplicate Ctrl+D")
- **Fix dismiss listener:** Current code (line 115 of FurnitureEditor.tsx) only adds `mousedown` listener. Add `touchstart` listener for mobile dismiss.
- Note: `EditorContextMenu` is defined inline in `FurnitureEditor.tsx` (line 104), not as a separate file

### 3.9 Minor Mobile Adaptations

**Hints overlay** (lines 1452-1480 of FurnitureEditor.tsx): The desktop hints say "Edit in sidebar". On mobile, change text to "Edit in Properties panel" and remove the right-side "Edit in sidebar" hint entirely.

**Status bar** (line 1482-1484): Hide on mobile — the bottom action bar occupies that space. Wrap in `{isDesktop && ...}`.

**AddPartPicker**: When on mobile, render inside a `MobileDrawer` instead of its current inline/modal position. Cards inside should be 2-column grid with minimum 44px tap targets.

**Keyboard handling**: Use `100dvh` (dynamic viewport height) for the editor container instead of `100vh` to handle virtual keyboard appearance. The Properties sheet inputs should be scrollable within the sheet so the keyboard doesn't obscure them.

---

## 4. Touch Gestures for 3D Viewport

### 4.1 Gesture Mapping

**File:** `src/components/design/editor/EditorViewport.tsx`

| Gesture | Action | Notes |
|---------|--------|-------|
| Single finger drag (on empty space) | Orbit camera | Default OrbitControls behavior |
| Two finger pinch | Zoom | Default OrbitControls behavior |
| Two finger drag | Pan camera | Default OrbitControls behavior |
| Single tap (on object) | Select object/group | Existing click handler works via pointer events |
| Double tap (on group) | Enter edit mode | Detect via timing: two `pointerdown` events < 450ms apart (450ms is more forgiving on touch than 300ms) |
| Long press (500ms, on object) | Context menu | Use setTimeout on pointerdown, clear on pointermove (> 10px delta) or pointerup |
| Single finger drag (on selected object) | Move object | Existing drag handles — make larger for touch |

### 4.2 OrbitControls Touch Behavior

React Three Fiber's `OrbitControls` from `@react-three/drei` already handles:
- 1-finger rotate
- 2-finger pinch zoom
- 2-finger pan

**Key requirement:** Disable OrbitControls (`enabled={false}`) when dragging a resize/move handle. This prevents camera movement while manipulating objects. Re-enable on pointerUp.

### 4.3 Touch Target Sizing

Resize/move handles in the viewport:
- Desktop: ~8px visual size → Mobile: 24px visual size minimum (rendered in 3D, so this is world-space scaling)
- Only show handles for the selected object
- Use pointer events (onPointerDown/Move/Up) which work for both mouse and touch

### 4.4 Canvas Touch Settings

On the canvas wrapper div:
```css
touch-action: none;  /* Prevent browser gestures interfering */
```

This is critical — without it, the browser will try to scroll/zoom the page when touching the 3D viewport.

---

## 5. Component Architecture

### New Files
| File | Purpose |
|------|---------|
| `src/components/design/editor/MobileEditorBar.tsx` | Bottom action bar (Library/Mode/Props/AI buttons) |
| `src/components/design/editor/MobileEditorToolbar.tsx` | Compact top toolbar for mobile |
| `src/components/ui/MobileDrawer.tsx` | Reusable bottom sheet wrapper around vaul |

### Modified Files
| File | Changes |
|------|---------|
| `src/hooks/use-mobile.tsx` | Add `useMobileInfo()`, keep `useIsMobile()` |
| `src/index.css` | Add touch utilities, overflow-x: hidden, safe-area classes |
| `src/components/design/editor/FurnitureEditor.tsx` | Conditional mobile/desktop layout rendering |
| `src/components/design/editor/EditorViewport.tsx` | Touch gesture handling, touch-action: none, larger handles |
| `src/components/design/editor/EditorParameters.tsx` | Mobile-friendly inputs (16px font, steppers, inputMode) |
| `src/components/design/editor/EditorSidebar.tsx` | Adapt for rendering inside MobileDrawer |
| `src/components/design/editor/LibraryBrowser.tsx` | 2-column grid on mobile |
| `src/components/design/editor/DesignChatPanel.tsx` | Adapt for rendering inside MobileDrawer |
| `src/components/design/editor/AddPartPicker.tsx` | Render in MobileDrawer on mobile, 2-column grid, touch-friendly card sizing |

### Untouched Files
- `ShapeRenderer.tsx` — pure 3D rendering, no layout
- All Supabase/API logic files
- All type definition files
- Routing (`App.tsx`)
- Non-editor pages

---

## 6. State Management for Mobile

No new global state. Mobile drawer open/close state lives in `FurnitureEditor`:

```ts
const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
const [mobilePropsOpen, setMobilePropsOpen] = useState(false);
const [mobileChatOpen, setMobileChatOpen] = useState(false);
```

Auto-open Properties sheet behavior (if on mobile):
- Only auto-open on **double-tap** (entering edit mode) or when tapping an object in the **Elements list** (scene tree)
- Do NOT auto-open on every viewport tap-select — users tap objects frequently while exploring, and a drawer popping up every time is disruptive
- Users can always open Properties manually via the bottom action bar

Close all sheets when starting a viewport gesture (prevents sheets blocking interaction).

---

## 7. Responsive Breakpoint Strategy

| Range | Layout | Term |
|-------|--------|------|
| < 768px | Phone — single column, bottom sheets | `isMobile` |
| 768–1023px | Tablet — same as phone but slightly more spacious | `isTablet` |
| ≥ 1024px | Desktop — current 3-panel layout unchanged | `isDesktop` |

The editor breakpoint is 1024px (not 768px) because the 3-panel layout needs at least ~1024px to be usable. Phones and tablets both get the mobile editor layout.

---

## 8. Testing Checklist

After implementation, verify at 390px (iPhone 14), 768px (iPad), and 1024px:

- [ ] No horizontal overflow
- [ ] Desktop editor layout unchanged at 1024px+
- [ ] Mobile toolbar shows at < 1024px with back, undo/redo, overflow menu
- [ ] Bottom action bar visible with Library, Mode, Properties, AI buttons
- [ ] Library bottom sheet opens/closes, shows Templates and Elements tabs
- [ ] Properties bottom sheet opens/closes, shows selected object properties
- [ ] AI Chat bottom sheet opens at full height
- [ ] Tap selects objects in viewport
- [ ] Double-tap enters edit mode on groups
- [ ] Long press opens context menu
- [ ] Pinch to zoom works
- [ ] Two-finger pan works
- [ ] Single-finger orbit works
- [ ] Object drag/move works with touch
- [ ] Edit mode banner shows/hides correctly
- [ ] All touch targets ≥ 44px
- [ ] All inputs ≥ 16px font
- [ ] No text smaller than 14px
- [ ] Bottom sheets respect safe area insets
- [ ] Keyboard doesn't break layout when editing inputs in Properties sheet

---

## 9. Phase 2 & 3 Preview

**Phase 2 — User Funnel (Landing + Project Creation + AI Chat):**
- AppHeader mobile hamburger menu
- Landing page responsive sections
- New Project wizard mobile step layout
- AI Chat full-screen mobile layout

**Phase 3 — Content & Admin:**
- Blog listing/article responsive layouts
- AdminLayout mobile sidebar
- BusinessDashboardLayout mobile sidebar
- Admin blog editor mobile adaptation
- Data tables → card views on mobile
