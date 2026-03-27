# DEXO Mobile Responsiveness Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the DEXO 3D furniture editor fully usable on mobile/tablet (< 1024px) with touch gestures, bottom sheet drawers, and a compact mobile toolbar — without changing the desktop layout.

**Architecture:** Conditional rendering branch in `FurnitureEditor.tsx` — desktop (≥ 1024px) renders current 3-panel layout unchanged, mobile renders full-screen viewport + bottom action bar + bottom sheet drawers for Library/Properties/AI Chat. Touch gestures use native pointer events + OrbitControls (no extra gesture library).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Three Fiber 8, Three.js 0.170, vaul 0.9.9 (drawer), framer-motion 12, Radix UI, lucide-react icons

**Spec:** `docs/superpowers/specs/2026-03-27-mobile-responsiveness-phase1-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/ui/MobileDrawer.tsx` | Reusable bottom sheet wrapper around vaul's Drawer with `isOpen`, `onClose`, `title`, `height` props |
| `src/components/design/editor/MobileEditorToolbar.tsx` | Compact 48px top toolbar for mobile: back, project name, undo/redo, overflow menu |
| `src/components/design/editor/MobileEditorBar.tsx` | 56px bottom action bar: Library, Mode toggle, Properties, AI buttons |

### Modified Files
| File | What Changes |
|------|-------------|
| `src/hooks/use-mobile.tsx` | Add `useMobileInfo()` returning `{ isMobile, isTablet, isDesktop, isTouchDevice, isMobileLayout }` |
| `src/index.css` | Append touch utilities, overflow-x: hidden, safe-area classes |
| `src/components/design/editor/FurnitureEditor.tsx` | Conditional mobile/desktop layout, mobile drawer state, edit mode banner, mobile context menu adjustments |
| `src/components/design/editor/EditorViewport.tsx` | `touch-action: none` on canvas wrapper, double-tap detection, long-press detection, larger touch handles |
| `src/components/design/editor/EditorParameters.tsx` | `inputMode="decimal"` on number inputs, 16px font minimum, stepper buttons |
| `src/components/design/editor/EditorSidebar.tsx` | Minor Tailwind adjustments for rendering inside drawer context |
| `src/components/design/editor/LibraryBrowser.tsx` | 2-column grid on mobile via responsive Tailwind classes |
| `src/components/design/editor/AddPartPicker.tsx` | Render in MobileDrawer on mobile, 2-column grid, 44px touch targets |

---

## Task 1: Enhanced `useMobileInfo` Hook

**Files:**
- Modify: `src/hooks/use-mobile.tsx`

- [ ] **Step 1: Read current hook implementation**

Read `src/hooks/use-mobile.tsx` to confirm current state (should be 19 lines, single `useIsMobile()` export with 768px breakpoint).

- [ ] **Step 2: Add `useMobileInfo()` export alongside existing hook**

Replace the entire file content with:

```tsx
import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isMobileLayout: boolean;
}

export function useMobileInfo(): MobileInfo {
  const [width, setWidth] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const mqlTablet = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const onChange = () => setWidth(window.innerWidth);
    mqlMobile.addEventListener("change", onChange);
    mqlTablet.addEventListener("change", onChange);
    setWidth(window.innerWidth);
    return () => {
      mqlMobile.removeEventListener("change", onChange);
      mqlTablet.removeEventListener("change", onChange);
    };
  }, []);

  const isMobile = width !== undefined && width < MOBILE_BREAKPOINT;
  const isTablet = width !== undefined && width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
  const isDesktop = width !== undefined && width >= TABLET_BREAKPOINT;
  const isTouchDevice = typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isMobileLayout: isMobile || isTablet,
  };
}

/** @deprecated Use useMobileInfo().isMobile instead. Kept for backwards compatibility. */
export function useIsMobile() {
  const { isMobile } = useMobileInfo();
  return isMobile;
}
```

- [ ] **Step 3: Verify no breaking changes**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors. The old `useIsMobile()` is still exported.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-mobile.tsx
git commit -m "feat(mobile): enhance useIsMobile hook with useMobileInfo() for tablet/touch detection"
```

---

## Task 2: Global CSS Mobile Utilities

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Read end of index.css**

Read the last 30 lines of `src/index.css` to find the right append point.

- [ ] **Step 2: Append mobile utility CSS**

Add at the end of `src/index.css`:

```css
/* ─── Mobile touch utilities ─── */
button,
a,
[role="button"] {
  -webkit-tap-highlight-color: transparent;
}

@media (pointer: coarse) {
  button,
  a,
  [role="button"] {
    touch-action: manipulation;
  }
}

html,
body {
  overflow-x: hidden;
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);
}
```

Note: `touch-action: manipulation` is scoped to `pointer: coarse` to avoid interfering with desktop hover/click behavior.

- [ ] **Step 3: Visual check**

Run `npm run dev` and confirm the app still loads correctly on desktop — no layout shifts.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(mobile): add global touch utilities, overflow-x hidden, safe-area classes"
```

---

## Task 3: MobileDrawer Component

**Files:**
- Create: `src/components/ui/MobileDrawer.tsx`
- Reference: `src/components/ui/drawer.tsx` (existing vaul wrapper)

- [ ] **Step 1: Read existing drawer.tsx**

Read `src/components/ui/drawer.tsx` to understand the vaul wrapper API (Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerOverlay, etc.).

- [ ] **Step 2: Create MobileDrawer.tsx**

```tsx
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: "half" | "full" | number;
}

const snapMap = {
  half: ["0.5", "1"] as string[],
  full: ["1"] as string[],
};

export function MobileDrawer({ isOpen, onClose, title, children, height = "half" }: MobileDrawerProps) {
  const snaps = typeof height === "number"
    ? [`${Math.min(height / window.innerHeight, 1)}`]
    : snapMap[height];

  return (
    <DrawerPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      snapPoints={snaps}
      shouldScaleBackground={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t bg-white",
            "touch-action-auto overflow-hidden",
            height === "full" ? "h-[96dvh]" : "max-h-[96dvh]",
          )}
        >
          {/* Drag handle */}
          <div className="flex items-center justify-center py-2 shrink-0">
            <div className="h-1.5 w-12 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 pb-2 shrink-0">
              <DrawerPrimitive.Title className="text-sm font-semibold text-gray-900">
                {title}
              </DrawerPrimitive.Title>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}

          {/* Content — scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4" style={{ touchAction: "auto" }}>
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/MobileDrawer.tsx
git commit -m "feat(mobile): add MobileDrawer bottom sheet component wrapping vaul"
```

---

## Task 4: MobileEditorToolbar Component

**Files:**
- Create: `src/components/design/editor/MobileEditorToolbar.tsx`
- Reference: `src/components/design/editor/FurnitureEditor.tsx:1116-1387` (desktop toolbar)

- [ ] **Step 1: Read the desktop toolbar JSX**

Read `FurnitureEditor.tsx` lines 1116-1387 to understand all the toolbar actions and state they reference (undo, redo, snap, viewMode, lightMode, floorPreset, save, etc.).

- [ ] **Step 2: Create MobileEditorToolbar.tsx**

This component receives all the same state/callbacks as props and renders a compact single-row toolbar:

```tsx
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Undo2,
  Redo2,
  MoreVertical,
  Magnet,
  Sun,
  Moon,
  RotateCcw,
  HelpCircle,
  Upload,
  LogOut,
  Save,
  Box,
  Square,
  PanelTop,
  PanelLeft,
  Loader2,
  Check,
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
  furnitureLabel,
  onBack,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  snapEnabled,
  onToggleSnap,
  viewMode,
  onViewModeChange,
  lightMode,
  onLightModeChange,
  floorPreset,
  onFloorPresetChange,
  saveStatus,
  onSave,
  onReset,
  onToggleHelp,
  onSubmitLibrary,
  onSaveAndExit,
}: MobileEditorToolbarProps) {
  const truncatedLabel = furnitureLabel.length > 15
    ? furnitureLabel.slice(0, 15) + "..."
    : furnitureLabel;

  return (
    <div className="shrink-0 h-12 bg-white border-b border-gray-200 px-2 flex items-center gap-1">
      {/* Back + Name */}
      <button
        onClick={onBack}
        className="h-11 w-11 flex items-center justify-center shrink-0"
        title="Back"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
        {truncatedLabel}
      </span>

      <div className="flex-1" />

      {/* Save status */}
      {saveStatus === "saving" && (
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
      )}
      {saveStatus === "saved" && (
        <Check className="w-4 h-4 text-green-600 shrink-0" />
      )}
      {saveStatus === "unsaved" && (
        <span className="text-amber-500 text-lg shrink-0">●</span>
      )}

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="h-11 w-11 flex items-center justify-center shrink-0 disabled:opacity-30"
        title="Undo"
      >
        <Undo2 className="w-5 h-5 text-gray-700" />
      </button>

      {/* Redo */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="h-11 w-11 flex items-center justify-center shrink-0 disabled:opacity-30"
        title="Redo"
      >
        <Redo2 className="w-5 h-5 text-gray-700" />
      </button>

      {/* Overflow Menu */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-11 w-11 flex items-center justify-center shrink-0"
            title="More options"
          >
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
              ] as const).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  className={`flex-1 h-8 flex items-center justify-center gap-1 rounded text-xs font-medium transition-colors ${
                    viewMode === mode
                      ? "bg-[#1B2432] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-gray-100" />

          {/* Snap */}
          <button
            onClick={onToggleSnap}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 transition-colors"
          >
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
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
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
            <LogOut className="w-4 h-4 text-gray-400" /> Save & Exit
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/design/editor/MobileEditorToolbar.tsx
git commit -m "feat(mobile): add compact MobileEditorToolbar for < 1024px editor"
```

---

## Task 5: MobileEditorBar Component (Bottom Action Bar)

**Files:**
- Create: `src/components/design/editor/MobileEditorBar.tsx`

- [ ] **Step 1: Create MobileEditorBar.tsx**

```tsx
import { BookOpen, Hand, Pencil, Settings2, MessageSquare } from "lucide-react";

interface MobileEditorBarProps {
  onOpenLibrary: () => void;
  onOpenProperties: () => void;
  onOpenChat: () => void;
  editingGroupId: string | null;
  selectedGroupId: string | null;
  onEnterEditMode: (groupId: string) => void;
  onExitEditMode: () => void;
  activeSheet: "library" | "properties" | "chat" | null;
}

export function MobileEditorBar({
  onOpenLibrary,
  onOpenProperties,
  onOpenChat,
  editingGroupId,
  selectedGroupId,
  onEnterEditMode,
  onExitEditMode,
  activeSheet,
}: MobileEditorBarProps) {
  const isEditing = !!editingGroupId;
  const canEdit = !!selectedGroupId;

  const handleModeToggle = () => {
    if (isEditing) {
      onExitEditMode();
    } else if (selectedGroupId) {
      onEnterEditMode(selectedGroupId);
    }
  };

  return (
    <div className="shrink-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="h-14 flex items-center justify-around px-2">
        <BarButton
          icon={BookOpen}
          label="Library"
          active={activeSheet === "library"}
          onClick={onOpenLibrary}
        />
        <BarButton
          icon={isEditing ? Pencil : Hand}
          label={isEditing ? "Edit" : "Select"}
          active={isEditing}
          onClick={handleModeToggle}
          disabled={!canEdit && !isEditing}
        />
        <BarButton
          icon={Settings2}
          label="Properties"
          active={activeSheet === "properties"}
          onClick={onOpenProperties}
        />
        <BarButton
          icon={MessageSquare}
          label="AI"
          active={activeSheet === "chat"}
          onClick={onOpenChat}
        />
      </div>
    </div>
  );
}

function BarButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center h-12 w-16 rounded-lg transition-colors ${
        active
          ? "text-[#C87D5A]"
          : disabled
            ? "text-gray-300"
            : "text-gray-500 active:bg-gray-100"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] mt-0.5 font-medium">{label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/design/editor/MobileEditorBar.tsx
git commit -m "feat(mobile): add MobileEditorBar bottom action bar component"
```

---

## Task 6: FurnitureEditor Mobile Layout — Conditional Rendering

**Files:**
- Modify: `src/components/design/editor/FurnitureEditor.tsx`

This is the largest task — wiring up the mobile layout in FurnitureEditor.

- [ ] **Step 1: Read the full return JSX section**

Read `FurnitureEditor.tsx` lines 1113-1600 to understand the complete render tree.

- [ ] **Step 2: Add mobile imports and state**

At the top of `FurnitureEditor.tsx`, add imports:

```tsx
import { useMobileInfo } from "@/hooks/use-mobile";
import { MobileDrawer } from "@/components/ui/MobileDrawer";
import { MobileEditorToolbar } from "./MobileEditorToolbar";
import { MobileEditorBar } from "./MobileEditorBar";
```

Inside the `FurnitureEditor` function body (after existing state declarations around line 180), add:

```tsx
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
```

- [ ] **Step 3: Change root container to use dvh**

Replace the root div class at line 1114:

Old: `className="h-screen flex flex-col bg-[#FAFAFA] overflow-hidden min-h-0"`
New: `className="h-dvh flex flex-col bg-[#FAFAFA] overflow-hidden min-h-0"`

(Uses `dvh` — dynamic viewport height — which handles mobile keyboard correctly. Falls back to viewport height on older browsers via Tailwind.)

- [ ] **Step 4: Wrap desktop toolbar in `isDesktop` conditional**

The toolbar section (lines 1116-1388) stays as-is but gets wrapped:

```tsx
{isDesktop ? (
  <div className="shrink-0 bg-white border-b border-gray-200 px-3 sm:px-4 py-2 min-w-0">
    {/* ... existing desktop toolbar JSX unchanged ... */}
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
    {/* Edit mode banner */}
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
```

- [ ] **Step 5: Wrap the four-panel layout in `isDesktop` conditional**

The panel layout section (starts around line 1391) gets wrapped:

```tsx
{isDesktop ? (
  <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
    {/* ... existing desktop panels: EditorSidebar/LibraryBrowser, viewport, EditorParameters, DesignChatPanel ... */}
  </div>
) : (
  <>
    {/* Mobile: full viewport */}
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
      />
      {/* Mobile hints — simplified */}
      {hintsVisible && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 pointer-events-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 max-w-[220px] text-center">
              <p className="text-xs font-medium text-gray-700 mb-1">Tap to select</p>
              <p className="text-[10px] text-gray-400">Pinch to zoom, drag to orbit</p>
            </div>
          </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={dismissHints}
              className="px-4 py-1.5 bg-[#1B2432] text-white text-xs rounded-full shadow-lg"
            >
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

    {/* Mobile bottom sheets */}
    <MobileDrawer
      isOpen={mobileLibraryOpen}
      onClose={closeMobileSheets}
      title="Library"
      height="half"
    >
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

    <MobileDrawer
      isOpen={mobilePropsOpen}
      onClose={closeMobileSheets}
      title="Properties"
      height="half"
    >
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
    </MobileDrawer>

    <MobileDrawer
      isOpen={mobileChatOpen}
      onClose={closeMobileSheets}
      title="AI Assistant"
      height="full"
    >
      <DesignChatPanel
        furnitureType={furnitureType}
        dims={dims}
        style={style}
        groups={groups}
        onApplyPanels={handleAIPanels}
      />
    </MobileDrawer>
  </>
)}
```

- [ ] **Step 6: Fix context menu dismiss for touch**

In the `EditorContextMenu` function (around line 112-125), update the dismiss effect:

Find:
```tsx
document.addEventListener("mousedown", handle);
document.addEventListener("contextmenu", handle);
```

Add after:
```tsx
document.addEventListener("touchstart", handle);
```

And in cleanup:
```tsx
document.removeEventListener("touchstart", handle);
```

- [ ] **Step 7: Hide desktop status bar on mobile**

Find the status bar around line 1482:
```tsx
<div className="shrink-0 px-3 py-1 bg-white/80 ...">
```

This is inside the desktop branch already (since we split the layout in Step 5), so no additional change needed.

- [ ] **Step 8: Type check and visual verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Run: `npm run dev` — open at 390px width in Chrome DevTools, verify:
- Mobile toolbar shows (back + name + undo/redo + overflow)
- Full viewport visible
- Bottom action bar shows 4 buttons
- Tapping Library opens bottom sheet
- Desktop at 1024px+ is unchanged

- [ ] **Step 9: Commit**

```bash
git add src/components/design/editor/FurnitureEditor.tsx
git commit -m "feat(mobile): add conditional mobile/desktop layout to FurnitureEditor with bottom sheets"
```

---

## Task 7: EditorViewport Touch Enhancements

**Files:**
- Modify: `src/components/design/editor/EditorViewport.tsx`

- [ ] **Step 1: Add touch-action: none to canvas wrapper**

In `EditorViewport` (around line 629-634), the root div wraps the Canvas. Add `style={{ touchAction: "none" }}`:

Find:
```tsx
<div
  className={`w-full h-full rounded-xl overflow-hidden border relative ${
    lightMode === "night" ? "bg-[#0f0f16] border-gray-700" : "bg-[#eceff4] border-gray-200"
  }`}
  onContextMenu={(e) => e.preventDefault()}
>
```

Change to:
```tsx
<div
  className={`w-full h-full rounded-xl overflow-hidden border relative ${
    lightMode === "night" ? "bg-[#0f0f16] border-gray-700" : "bg-[#eceff4] border-gray-200"
  }`}
  onContextMenu={(e) => e.preventDefault()}
  style={{ touchAction: "none" }}
>
```

- [ ] **Step 2: Add double-tap detection for entering edit mode**

Import the mobile hook at top of file:
```tsx
import { useMobileInfo } from "@/hooks/use-mobile";
```

Inside the `EditorViewport` function, add double-tap state:
```tsx
const { isMobileLayout, isTouchDevice } = useMobileInfo();
const lastTapRef = useRef<{ time: number; groupId: string | null }>({ time: 0, groupId: null });
```

Find where group click/selection happens — this is in the `GroupMesh` or similar sub-component that handles `onPointerDown`. We need to detect two taps on the same group within 450ms.

Add a helper function inside `EditorViewport`:
```tsx
const handleGroupTap = useCallback((groupId: string) => {
  if (!isTouchDevice) return;
  const now = Date.now();
  if (lastTapRef.current.groupId === groupId && now - lastTapRef.current.time < 450) {
    // Double tap — enter edit mode
    onEnterEditMode(groupId);
    lastTapRef.current = { time: 0, groupId: null };
  } else {
    lastTapRef.current = { time: now, groupId };
  }
}, [isTouchDevice, onEnterEditMode]);
```

This should be called from the group selection handler alongside the existing `onSelectGroup` call.

- [ ] **Step 3: Add long-press detection for context menu**

Add long-press refs:
```tsx
const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
```

Add handlers passed to group/panel mesh components:
```tsx
const handlePointerDownForLongPress = useCallback((e: React.PointerEvent, panelId: string | null, groupId: string | null) => {
  if (!isTouchDevice) return;
  longPressStartRef.current = { x: e.clientX, y: e.clientY };
  longPressRef.current = setTimeout(() => {
    if (onContextMenuProp) {
      // Position above finger, not at finger (offset by -60px Y)
      onContextMenuProp(e.clientX, Math.max(e.clientY - 60, 10), panelId, groupId);
    }
    longPressRef.current = null;
  }, 500);
}, [isTouchDevice, onContextMenuProp]);

const handlePointerMoveForLongPress = useCallback((e: React.PointerEvent) => {
  if (!longPressRef.current || !longPressStartRef.current) return;
  const dx = e.clientX - longPressStartRef.current.x;
  const dy = e.clientY - longPressStartRef.current.y;
  if (Math.sqrt(dx * dx + dy * dy) > 10) {
    clearTimeout(longPressRef.current);
    longPressRef.current = null;
  }
}, []);

const handlePointerUpForLongPress = useCallback(() => {
  if (longPressRef.current) {
    clearTimeout(longPressRef.current);
    longPressRef.current = null;
  }
}, []);
```

Wire these into the existing pointer event handlers on group/panel meshes. The exact integration depends on the mesh component structure — look for `onPointerDown` in the Canvas children and add these calls.

- [ ] **Step 4: Remove keyboard shortcut labels from context menu on mobile**

The `EditorContextMenu` in `FurnitureEditor.tsx` (Task 6 already covers this file) — pass `isMobileLayout` as a prop and conditionally hide the shortcut text:

```tsx
{!isMobileLayout && (
  <span className="text-[10px] text-gray-400 ml-4">{item.shortcut}</span>
)}
```

- [ ] **Step 5: Type check and verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Manual test at 390px: verify touch-action prevents page scroll on canvas, double-tap enters edit mode.

- [ ] **Step 6: Commit**

```bash
git add src/components/design/editor/EditorViewport.tsx src/components/design/editor/FurnitureEditor.tsx
git commit -m "feat(mobile): add touch-action none, double-tap edit, long-press context menu to viewport"
```

---

## Task 8: EditorParameters Mobile Input Adaptations

**Files:**
- Modify: `src/components/design/editor/EditorParameters.tsx`

- [ ] **Step 1: Read EditorParameters.tsx**

Read the full file to understand all input fields (dimension inputs, material picker, color picker, etc.).

- [ ] **Step 2: Add inputMode and font-size to number inputs**

Find all `<input type="number"` or similar number inputs. For each one:
- Add `inputMode="decimal"` attribute
- Ensure `className` includes `text-base` (16px) — or at least doesn't go below it
- If the input has a small font class like `text-xs` or `text-sm`, add a responsive override: `text-xs lg:text-xs text-base` won't work — instead use `text-base lg:text-xs`

Pattern: find all number inputs and change from something like:
```tsx
<input type="number" className="... text-xs ..." />
```
To:
```tsx
<input type="number" inputMode="decimal" className="... text-base lg:text-xs ..." />
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/components/design/editor/EditorParameters.tsx
git commit -m "feat(mobile): add inputMode decimal and 16px font to EditorParameters inputs"
```

---

## Task 9: LibraryBrowser & EditorSidebar Mobile Adjustments

**Files:**
- Modify: `src/components/design/editor/LibraryBrowser.tsx`
- Modify: `src/components/design/editor/EditorSidebar.tsx`

- [ ] **Step 1: Read both files**

Read `LibraryBrowser.tsx` and `EditorSidebar.tsx` to understand their current grid/list layouts.

- [ ] **Step 2: LibraryBrowser — responsive grid**

Find the template grid in `LibraryBrowser.tsx`. It's likely using a CSS grid or flex layout. Change to mobile-first responsive:

Replace any fixed grid columns (e.g., `grid-cols-3` or `grid-cols-4`) with:
```
grid-cols-2 lg:grid-cols-3
```

Ensure thumbnail images have a minimum size of 100×100px and the entire card is tappable (not just a small area).

- [ ] **Step 3: EditorSidebar — wider tap targets**

In `EditorSidebar.tsx`, find the list items for groups/panels. Ensure:
- Each list item has `min-h-[44px]` for touch targets
- Delete/visibility toggle buttons have `h-11 w-11` minimum
- If there's a fixed width (e.g., `w-64`), remove it and let it fill the drawer

- [ ] **Step 4: Type check and visual verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Test: open Library sheet on mobile, verify 2-column grid. Open Elements tab, verify tap targets.

- [ ] **Step 5: Commit**

```bash
git add src/components/design/editor/LibraryBrowser.tsx src/components/design/editor/EditorSidebar.tsx
git commit -m "feat(mobile): responsive grid and touch targets for LibraryBrowser and EditorSidebar"
```

---

## Task 10: AddPartPicker Mobile Adaptation

**Files:**
- Modify: `src/components/design/editor/AddPartPicker.tsx`

- [ ] **Step 1: Read AddPartPicker.tsx**

Understand current layout (modal? inline? grid?).

- [ ] **Step 2: Wrap in MobileDrawer on mobile**

Import `useMobileInfo` and `MobileDrawer`. If on mobile layout, render content inside a `MobileDrawer` instead of the current container:

```tsx
const { isMobileLayout } = useMobileInfo();

if (isMobileLayout) {
  return (
    <MobileDrawer isOpen={true} onClose={onClose} title="Add Part" height="half">
      {/* Same card grid content but with grid-cols-2 and min-h-[44px] on cards */}
    </MobileDrawer>
  );
}

// Desktop: existing render unchanged
return ( ... );
```

Ensure cards in mobile mode use `grid-cols-2` and have 44px minimum tap targets.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/components/design/editor/AddPartPicker.tsx
git commit -m "feat(mobile): render AddPartPicker in MobileDrawer on mobile"
```

---

## Task 11: Final Integration Testing & Polish

**Files:**
- All modified files from Tasks 1-10

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Successful build with no errors.

- [ ] **Step 3: Visual verification at 390px (iPhone 14)**

Open `npm run dev` in Chrome DevTools at 390px width:
- [ ] Mobile toolbar renders correctly
- [ ] Bottom action bar visible
- [ ] Library sheet opens/closes
- [ ] Properties sheet opens/closes
- [ ] AI Chat sheet opens at full height
- [ ] Edit mode banner appears when double-tapping a group
- [ ] No horizontal scrollbar
- [ ] All text readable (≥ 14px)
- [ ] All inputs ≥ 16px font

- [ ] **Step 4: Visual verification at 768px (iPad)**

Same checks at 768px.

- [ ] **Step 5: Visual verification at 1024px (desktop breakpoint)**

- [ ] Desktop layout unchanged — 3-panel editor
- [ ] No mobile elements visible
- [ ] All existing functionality works

- [ ] **Step 6: Final commit if any polish needed**

```bash
git add -A
git commit -m "feat(mobile): Phase 1 complete — mobile editor with bottom sheets, touch gestures, compact toolbar"
```
