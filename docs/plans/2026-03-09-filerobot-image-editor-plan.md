# Filerobot Image Editor Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Filerobot Image Editor as a manual editing option alongside the existing AI mask editor in the DEXO image generation flow.

**Architecture:** New `FilerobotEditor.tsx` wrapper + `FilerobotEditorModal.tsx` full-screen modal. Wired into `BriefCard.tsx` (new "Manual Edit" button) and `AIChatFlow.tsx` (state + upload handler). Edited images uploaded to Supabase Storage and tracked as `ImageVersion` records.

**Tech Stack:** React 18, TypeScript, react-filerobot-image-editor, Framer Motion, Tailwind CSS, Supabase Storage

**Design Doc:** `docs/plans/2026-03-09-filerobot-image-editor-design.md`

---

### Task 1: Install react-filerobot-image-editor

**Step 1: Install the package**

Run: `npm install react-filerobot-image-editor`

**Step 2: Verify installation**

Run: `npm ls react-filerobot-image-editor`
Expected: Shows the installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install react-filerobot-image-editor"
```

---

### Task 2: Create FilerobotEditor wrapper component

**Files:**
- Create: `src/components/chat/FilerobotEditor.tsx`

**Step 1: Create the component**

```tsx
import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";

interface FilerobotEditorProps {
  imageSrc: string;
  onSave: (imageBase64: string) => void;
  onClose: () => void;
}

const DEXO_THEME = {
  palette: {
    "bg-secondary": "#1B2432",
    "bg-primary": "#0f1724",
    "bg-primary-active": "#C05621",
    "accent-primary": "#C05621",
    "accent-primary-active": "#A84A1C",
    "icons-primary": "#FDFCF8",
    "icons-secondary": "#9CA3AF",
    "borders-secondary": "#2D3748",
    "borders-primary": "#4A5568",
    "borders-strong": "#C05621",
    "light-shadow": "rgba(0, 0, 0, 0.3)",
    warning: "#EF4444",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

export function FilerobotEditor({ imageSrc, onSave, onClose }: FilerobotEditorProps) {
  return (
    <FilerobotImageEditor
      source={imageSrc}
      onSave={(editedImageObject) => {
        if (editedImageObject.imageBase64) {
          onSave(editedImageObject.imageBase64);
        }
      }}
      onClose={onClose}
      annotationsCommon={{
        fill: "#C05621",
        stroke: "#C05621",
        strokeWidth: 2,
      }}
      Text={{
        text: "DEXO",
        fontSize: 24,
        fontFamily: "Inter",
      }}
      Rotate={{ angle: 90, componentType: "slider" }}
      Crop={{
        presetsItems: [
          { titleKey: "square", descriptionKey: "1:1", ratio: 1 },
          { titleKey: "landscape", descriptionKey: "16:9", ratio: 16 / 9 },
          { titleKey: "portrait", descriptionKey: "9:16", ratio: 9 / 16 },
          { titleKey: "classic", descriptionKey: "4:3", ratio: 4 / 3 },
        ],
      }}
      tabsIds={[
        TABS.ANNOTATE,
        TABS.WATERMARK,
        TABS.RESIZE,
        TABS.ADJUST,
      ]}
      defaultTabId={TABS.ANNOTATE}
      defaultToolId={TOOLS.TEXT}
      savingPixelRatio={4}
      previewPixelRatio={2}
      closeAfterSave={true}
      theme={DEXO_THEME}
    />
  );
}
```

Note on tabs: Use only the TABS enum values that Filerobot exports. The library provides ANNOTATE, WATERMARK, RESIZE, ADJUST, and FINETUNE. Crop and Rotate are available as tools within other tabs. Check the actual TABS export at build time — if `TABS.CROP` or `TABS.ROTATE` exist, add them too. If not, ANNOTATE + WATERMARK + RESIZE + ADJUST covers the needed features.

**Step 2: Verify build**

Run: `npm run build 2>&1 | head -20`
Expected: No TypeScript errors related to FilerobotEditor

**Step 3: Commit**

```bash
git add src/components/chat/FilerobotEditor.tsx
git commit -m "feat: add FilerobotEditor wrapper component"
```

---

### Task 3: Create FilerobotEditorModal

**Files:**
- Create: `src/components/chat/FilerobotEditorModal.tsx`

**Step 1: Create the modal component**

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { FilerobotEditor } from "./FilerobotEditor";

interface FilerobotEditorModalProps {
  isOpen: boolean;
  imageSrc: string;
  onSave: (imageBase64: string) => void;
  onClose: () => void;
}

export function FilerobotEditorModal({
  isOpen,
  imageSrc,
  onSave,
  onClose,
}: FilerobotEditorModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Editor container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] rounded-2xl overflow-hidden shadow-2xl"
          >
            <FilerobotEditor
              imageSrc={imageSrc}
              onSave={onSave}
              onClose={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/chat/FilerobotEditorModal.tsx
git commit -m "feat: add FilerobotEditorModal with full-screen overlay"
```

---

### Task 4: Add base64-to-Supabase upload utility

**Files:**
- Modify: `src/hooks/useImageUpload.ts`

**Step 1: Add `uploadBase64` function to the hook**

Add this function inside the `useImageUpload` hook, after the `uploadMultiple` definition (around line 111), before the `return` statement:

```tsx
const uploadBase64 = useCallback(
  async (base64: string, bucket: string): Promise<string | null> => {
    if (!user) { setError('Please sign in to upload images'); return null; }

    setUploading(true);
    setError(null);

    try {
      // Strip data URL prefix (e.g. "data:image/png;base64,")
      const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) { setError('Invalid image data'); return null; }

      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const raw = atob(match[2]);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const blob = new Blob([bytes], { type: `image/${match[1]}` });

      const path = `ai-edited/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { contentType: `image/${match[1]}` });

      if (uploadError) { setError(uploadError.message); return null; }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return urlData.publicUrl;
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  },
  [user],
);
```

**Step 2: Add `uploadBase64` to the return object**

Change the return statement from:
```tsx
return { uploading, progress, error, uploadImage, uploadMultiple, clearError };
```
to:
```tsx
return { uploading, progress, error, uploadImage, uploadMultiple, uploadBase64, clearError };
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/hooks/useImageUpload.ts
git commit -m "feat: add uploadBase64 utility to useImageUpload hook"
```

---

### Task 5: Update BriefCard — add Manual Edit button

**Files:**
- Modify: `src/components/chat/BriefCard.tsx`

**Step 1: Add the `onManualEdit` prop**

In the `BriefCardProps` interface (line 31), add after `onEditImage`:
```tsx
onManualEdit?: () => void;
```

Add to the destructured props (line 48 area):
```tsx
onManualEdit,
```

**Step 2: Update the button area**

Replace the button section at lines 219-242 (inside `{phase === "done" && (` block) with:

```tsx
{phase === "done" && (
  <div className="flex gap-2">
    {onManualEdit && (
      <Button
        onClick={onManualEdit}
        variant="outline"
        size="sm"
        className="rounded-xl border-[#C05621]/20 text-[#C05621] gap-1.5"
      >
        <Palette className="w-3.5 h-3.5" />
        Manual Edit
      </Button>
    )}
    {onEditImage && (
      <Button
        onClick={onEditImage}
        variant="outline"
        size="sm"
        className="rounded-xl border-[#C05621]/20 text-[#C05621] gap-1.5"
      >
        <Pencil className="w-3.5 h-3.5" />
        AI Edit
      </Button>
    )}
    {onRegenerate && (
      <Button
        onClick={onRegenerate}
        variant="outline"
        size="sm"
        className="rounded-xl border-[#1B2432]/20 text-[#1B2432] gap-1.5"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        Regenerate
      </Button>
    )}
  </div>
)}
```

Note: `Palette` is already imported from lucide-react at the top of `AIChatFlow.tsx`. Add it to BriefCard's imports:
```tsx
import { Palette } from "lucide-react";
```
Add `Palette` to the existing import from lucide-react at line 3.

**Step 3: Verify build**

Run: `npm run build 2>&1 | head -20`
Expected: No errors (BriefCard callers don't pass `onManualEdit` yet, but it's optional so that's fine)

**Step 4: Commit**

```bash
git add src/components/chat/BriefCard.tsx
git commit -m "feat: add Manual Edit button to BriefCard"
```

---

### Task 6: Wire everything into AIChatFlow

**Files:**
- Modify: `src/components/AIChatFlow.tsx`

**Step 1: Add imports**

Add at the top of the file, with the other chat component imports:
```tsx
import { FilerobotEditorModal } from '@/components/chat/FilerobotEditorModal';
```

**Step 2: Add state**

After the existing image editing state (around line 226), add:
```tsx
// Filerobot manual editor state
const [filerobotOpen, setFilerobotOpen] = useState(false);
```

**Step 3: Update useImageUpload destructuring**

Change line 205 from:
```tsx
const { uploading: imageUploading, uploadMultiple, error: uploadError } = useImageUpload();
```
to:
```tsx
const { uploading: imageUploading, uploadMultiple, uploadBase64, error: uploadError } = useImageUpload();
```

**Step 4: Add the manual edit save handler**

After `handleDoneEditing` (around line 533), add:

```tsx
// ─── Filerobot Manual Edit ──────────────────────────────
const handleManualEditSave = useCallback(async (imageBase64: string) => {
  setFilerobotOpen(false);

  const url = await uploadBase64(imageBase64, 'project-images');
  if (!url) {
    toast({ title: 'Upload failed', description: 'Could not save edited image', variant: 'destructive' });
    return;
  }

  // Track as a new version
  const nextNum = imageVersions.length + 1;
  const newVersion: ImageVersion = {
    id: `local-${Date.now()}`,
    project_id: '',
    parent_version_id: currentVersionId,
    image_url: url,
    prompt: null,
    edit_instruction: 'Manual edit (Filerobot)',
    mask_path: null,
    edit_type: 'manual_edit',
    version_number: nextNum,
    is_current: true,
    created_at: new Date().toISOString(),
  };
  setImageVersions(prev => [...prev, newVersion]);
  setCurrentVersionId(newVersion.id);
  setConceptImageUrl(url);
}, [uploadBase64, imageVersions.length, currentVersionId, toast]);
```

**Step 5: Pass onManualEdit to BriefCard**

In the `<BriefCard>` JSX (around line 860), add the new prop:
```tsx
onManualEdit={() => setFilerobotOpen(true)}
```

Add it after `onEditImage={handleStartEditImage}`.

**Step 6: Add FilerobotEditorModal to render**

At the end of the component's return JSX, just before the closing `</div>` of the root element (line 977), add:

```tsx
{/* Filerobot Manual Image Editor */}
{conceptImageUrl && (
  <FilerobotEditorModal
    isOpen={filerobotOpen}
    imageSrc={conceptImageUrl}
    onSave={handleManualEditSave}
    onClose={() => setFilerobotOpen(false)}
  />
)}
```

**Step 7: Verify build**

Run: `npm run build 2>&1 | head -20`
Expected: Clean build, no errors

**Step 8: Commit**

```bash
git add src/components/AIChatFlow.tsx
git commit -m "feat: wire Filerobot editor into AI chat flow with upload + versioning"
```

---

### Task 7: Manual testing & polish

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test the full flow**

1. Navigate to the create project page
2. Chat with AI to generate a brief
3. Click "Generate Concept Image"
4. Wait for image to appear
5. Click "Manual Edit" — Filerobot modal should open full-screen with dark overlay
6. Test these Filerobot features:
   - Annotate tab: draw, add text, add shapes
   - Watermark tab: upload an overlay image and position it
   - Resize tab: change dimensions
   - Adjust tab: brightness, contrast, etc.
7. Click Save — modal should close, image should update
8. Click "AI Edit" — existing mask editor should still work
9. Verify the version thumbnail strip shows both manual and AI edits
10. Click version thumbnails to revert between versions

**Step 3: Fix any visual issues**

Common things to check:
- Filerobot editor fills the modal properly (no overflow/scroll issues)
- Dark theme colors match DEXO brand
- Modal animation is smooth
- Buttons in BriefCard are properly spaced on mobile

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Filerobot Image Editor integration"
```

---

### Summary of all files changed

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modified | Add react-filerobot-image-editor dependency |
| `src/components/chat/FilerobotEditor.tsx` | Created | Filerobot wrapper with DEXO theme |
| `src/components/chat/FilerobotEditorModal.tsx` | Created | Full-screen modal overlay |
| `src/components/chat/BriefCard.tsx` | Modified | Add "Manual Edit" button, rename "Edit Image" → "AI Edit" |
| `src/hooks/useImageUpload.ts` | Modified | Add `uploadBase64` utility |
| `src/components/AIChatFlow.tsx` | Modified | State, handler, modal rendering |
