# DEXO Mobile Responsiveness Phase 2 — Landing + New Project + AI Chat

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing page, AppHeader navigation, new project wizard, and AI chat flow fully responsive on mobile/tablet.

**Architecture:** Mobile-first Tailwind adjustments + a new mobile hamburger menu using the existing Sheet component. Most pages already have partial responsive patterns — we're filling gaps.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, framer-motion, Radix UI Sheet

**Spec:** `docs/superpowers/specs/2026-03-27-mobile-responsiveness-phase1-design.md` (sections on Landing, New Project, AI Chat)

---

## File Map

### Modified Files
| File | What Changes |
|------|-------------|
| `src/components/app/AppHeader.tsx` | Add hamburger menu for < md, mobile nav drawer using Sheet |
| `src/components/design/DesignStepLayout.tsx` | Responsive padding, mobile breadcrumbs |
| `src/components/design/SelectionCard.tsx` | Smaller min-height on mobile, remove hover-only effects |
| `src/components/design/steps/RoomSelector.tsx` | Better mobile grid |
| `src/components/design/steps/FurnitureTypeSelector.tsx` | Better mobile grid |
| `src/pages/LandingPage.tsx` | Minor responsive fixes if needed |
| `src/components/AIChatFlow.tsx` | Mobile layout for chat (full-screen, fixed input bar) |

---

## Task 1: AppHeader Mobile Hamburger Menu

**Files:**
- Modify: `src/components/app/AppHeader.tsx`

- [ ] **Step 1: Read AppHeader.tsx fully**

Understand the nav links, avatar dropdown, notification bell, and existing `hidden md:flex` pattern.

- [ ] **Step 2: Add hamburger menu for mobile**

Import Sheet components:
```tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
```

Add a hamburger button that's visible on mobile (< md) and hidden on desktop. It opens a Sheet (side drawer from right) containing the nav links stacked vertically:

- Show `md:hidden` hamburger button (Menu icon, 44x44 tap target)
- Sheet contains all nav links from the desktop nav, stacked vertically with 48px height each
- Each link closes the sheet when clicked (use sheet's `onOpenChange`)
- Keep the logo and notification bell always visible
- CTA button (if any) stays visible in header

The existing nav `hidden md:flex` already hides on mobile — just add the hamburger + Sheet alongside it.

- [ ] **Step 3: Type check and commit**

```bash
git add src/components/app/AppHeader.tsx
git commit -m "feat(mobile): add hamburger menu with Sheet drawer to AppHeader"
```

---

## Task 2: DesignStepLayout Responsive Padding & Breadcrumbs

**Files:**
- Modify: `src/components/design/DesignStepLayout.tsx`

- [ ] **Step 1: Read the file**

Current: `max-w-5xl mx-auto px-8 py-10`, breadcrumbs, header with `text-3xl lg:text-4xl`.

- [ ] **Step 2: Fix responsive padding and breadcrumbs**

Changes:
1. Container padding: `px-8` → `px-4 sm:px-6 lg:px-8`
2. Vertical padding: `py-10` → `py-6 lg:py-10`
3. Header margin: `mb-10` → `mb-6 lg:mb-10`
4. Title: `text-3xl lg:text-4xl` → `text-2xl sm:text-3xl lg:text-4xl`
5. Breadcrumbs: On mobile (< sm), show only back arrow + current step name instead of full breadcrumb trail. Use `hidden sm:inline` on intermediate breadcrumb segments and show a simplified mobile version.

- [ ] **Step 3: Type check and commit**

```bash
git add src/components/design/DesignStepLayout.tsx
git commit -m "feat(mobile): responsive padding and mobile breadcrumbs in DesignStepLayout"
```

---

## Task 3: SelectionCard Mobile Sizing

**Files:**
- Modify: `src/components/design/SelectionCard.tsx`

- [ ] **Step 1: Read the file**

Current: `min-h-[250px]`, `hover:scale-[1.02]`, `group-hover:scale-110` on image.

- [ ] **Step 2: Fix mobile sizing**

Changes:
1. Min height: `min-h-[250px]` → `min-h-[180px] sm:min-h-[250px]` (smaller on phones)
2. Hover scale: Add `lg:` prefix — `lg:hover:scale-[1.02]` (no hover on touch)
3. Image hover: `group-hover:scale-110` → `lg:group-hover:scale-110`
4. Ensure text doesn't get tiny — subtitle `text-xs` is fine but check label font

- [ ] **Step 3: Type check and commit**

```bash
git add src/components/design/SelectionCard.tsx
git commit -m "feat(mobile): smaller card height and touch-friendly SelectionCard"
```

---

## Task 4: Room & Furniture Grid Mobile Improvements

**Files:**
- Modify: `src/components/design/steps/RoomSelector.tsx`
- Modify: `src/components/design/steps/FurnitureTypeSelector.tsx`

- [ ] **Step 1: Read both files**

Current grid: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5`

- [ ] **Step 2: Adjust grid and gap**

For both files:
1. Gap: `gap-5` → `gap-3 sm:gap-5` (tighter on mobile)
2. Grid is already `grid-cols-2` on mobile which is good — keep it
3. Ensure cards have enough tap area (44px min) — check button/link wrapper

- [ ] **Step 3: Type check and commit**

```bash
git add src/components/design/steps/RoomSelector.tsx src/components/design/steps/FurnitureTypeSelector.tsx
git commit -m "feat(mobile): tighter grid gap for room and furniture selectors"
```

---

## Task 5: AIChatFlow Mobile Layout

**Files:**
- Modify: `src/components/AIChatFlow.tsx`

This is a huge file (20k+ lines). The changes should be targeted.

- [ ] **Step 1: Read the main layout structure**

Find the main return JSX — look for the overall layout container, the message area, the input bar, and any sidebar. Focus on understanding the top-level flex/grid structure.

- [ ] **Step 2: Make the chat layout mobile-friendly**

Key changes:
1. If there's a sidebar (progress/brief), hide it on mobile or move it to a collapsible section
2. Message area: ensure it takes full width on mobile, messages have `max-w-[85%]` instead of a fixed pixel width
3. Input bar: ensure it's fixed at bottom with safe area padding, textarea has `text-base` (16px) font to prevent iOS zoom
4. If the input bar has a fixed max-width, make it responsive: `max-w-full lg:max-w-[600px]` or similar
5. Add `safe-area-bottom` class to the input bar container
6. Ensure images in chat messages are `max-w-full` and responsive

Be surgical — this file is massive. Only touch layout classes, not logic.

- [ ] **Step 3: Type check and commit**

```bash
git add src/components/AIChatFlow.tsx
git commit -m "feat(mobile): responsive layout for AIChatFlow chat interface"
```

---

## Task 6: Landing Page Final Polish

**Files:**
- Modify: `src/pages/LandingPage.tsx` (if needed)
- Check: `src/components/landing/HeroSection.tsx`

- [ ] **Step 1: Read the landing page and hero section**

The exploration showed they already have decent responsive patterns (`lg:hidden`, responsive text sizes, etc.).

- [ ] **Step 2: Fix any remaining issues**

Check for:
1. Navigation bar on landing page (different from AppHeader — it has its own fixed nav). Add hamburger if nav links are hidden on mobile.
2. CTA buttons: if side-by-side, stack on mobile: `flex-col sm:flex-row`
3. Footer: if multi-column, stack on mobile
4. Any horizontal overflow at 390px

Only make changes if actual issues are found. If the landing page is already well-responsive, report DONE with no changes.

- [ ] **Step 3: Commit if changes made**

```bash
git add src/pages/LandingPage.tsx src/components/landing/*.tsx
git commit -m "feat(mobile): landing page responsive polish"
```

---

## Task 7: Build Verification

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Commit if any fixes needed**
