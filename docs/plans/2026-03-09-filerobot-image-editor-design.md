# Filerobot Image Editor Integration

**Date:** 2026-03-09
**Status:** Approved

## Goal

Add manual image editing (crop, annotate, resize, draw, overlay images) to the DEXO AI image generation flow using Filerobot Image Editor. This complements the existing AI mask-based editing — users get both "Manual Edit" (Filerobot) and "AI Edit" (existing) as side-by-side options.

## Approach

**Standalone Modal Component (Approach A)** — A new `FilerobotEditor.tsx` wrapper + `FilerobotEditorModal.tsx` full-screen modal, wired into `BriefCard.tsx` alongside the existing AI edit button. No changes to the existing `ImageEditor.tsx` or `MaskCanvas.tsx`.

## Architecture

### New files

- `src/components/chat/FilerobotEditor.tsx` — Thin wrapper around `react-filerobot-image-editor`
- `src/components/chat/FilerobotEditorModal.tsx` — Full-screen modal with dark overlay + Framer Motion animation

### Modified files

- `src/components/chat/BriefCard.tsx` — Add `onManualEdit` prop + "Manual Edit" button, rename "Edit Image" to "AI Edit"
- `src/components/AIChatFlow.tsx` — Add `filerobotOpen` state, upload handler, version tracking

### Data flow

```
User clicks "Manual Edit" on BriefCard
  → BriefCard calls onManualEdit()
  → AIChatFlow sets filerobotOpen=true
  → FilerobotEditorModal renders with conceptImageUrl as source
  → User edits in Filerobot
  → User clicks Save
  → onSave receives editedImageObject.imageBase64
  → Convert base64 → Blob → upload to Supabase Storage (ai-edited/)
  → Create new ImageVersion record (edit_type: 'manual_edit')
  → Update conceptImageUrl to new URL
  → Close modal
```

## Component Design

### FilerobotEditor.tsx

- Props: `imageSrc`, `onSave(base64)`, `onClose()`
- Tabs: Annotate, Watermark, Crop, Resize, Adjust, Rotate
- Default tab: Annotate (supports future AI region editing)
- Default tool: Text (branded "DEXO")
- Annotation fill: `#C05621` (DEXO brand orange)
- `savingPixelRatio: 4`, `closeAfterSave: true`
- Custom theme matching DEXO colors

### FilerobotEditorModal.tsx

- Fixed position, z-50, `bg-black/80` backdrop with `backdrop-blur-sm`
- Framer Motion: `scale: 0.95→1`, `opacity: 0→1`
- Editor fills viewport with `inset-4` padding
- Escape key closes (Filerobot native)

### BriefCard button layout (phase='done')

```
[Manual Edit]  [AI Edit]  [Regenerate]
```

- Manual Edit: Palette icon, opens Filerobot modal
- AI Edit: Pencil icon, opens existing mask editor (renamed from "Edit Image")
- Regenerate: unchanged

## Upload/Save Flow

1. `onSave` receives `editedImageObject.imageBase64`
2. Strip data URL prefix, decode base64, create Blob
3. Upload to Supabase Storage: `ai-edited/{userId}/{timestamp}-{uuid}.png`
4. Create ImageVersion: `parent_version_id` = current, `edit_type` = `'manual_edit'`, `edit_instruction` = `'Manual edit (Filerobot)'`
5. Update `conceptImageUrl` to new public URL

Manual edits are indistinguishable from AI edits in the version tree. Users can revert between both via existing version thumbnails.

## Key decisions

- Watermark tab enabled for uploading/placing images on the canvas
- Annotate tab supports drawing, text, shapes — future AI masking foundation
- Filters tab omitted (design images, not photos)
- Manual edits count toward the same 5-edit limit as AI edits
- No changes to existing ImageEditor.tsx or MaskCanvas.tsx
