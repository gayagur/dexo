import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { editImage } from "@/lib/ai";
import {
  Loader2,
  Paintbrush,
  Eraser,
  RotateCcw,
  Check,
  Globe,
  Minus,
  Plus,
} from "lucide-react";
import type { ImageVersion } from "@/lib/database.types";
import { MaskCanvas, type MaskCanvasHandle, type MaskTool } from "./MaskCanvas";

// Structured error messages for known error codes
const ERROR_MESSAGES: Record<string, string> = {
  MASK_EMPTY: "Please paint an area to edit, or enable 'Apply Globally'.",
  DIMS_MISMATCH: "Mask dimensions don't match the image. Try resetting the mask.",
  PROMPT_EMPTY: "Please describe what you'd like to change.",
  IMAGE_TOO_LARGE: "Image is too large. It will be resized automatically.",
  EDIT_LIMIT: "You've reached the maximum number of edits for this image.",
  AI_ERROR: "The AI service encountered an error. Try rephrasing your instruction.",
};

interface ImageEditorProps {
  currentImageUrl: string;
  currentVersionId: string | null;
  projectId: string | null;
  versions: ImageVersion[];
  onNewVersion: (url: string, versionId: string) => void;
  onRevert: (version: ImageVersion) => void;
  onDone: () => void;
}

export function ImageEditor({
  currentImageUrl,
  currentVersionId,
  projectId,
  versions,
  onNewVersion,
  onRevert,
  onDone,
}: ImageEditorProps) {
  const [instruction, setInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [applyGlobally, setApplyGlobally] = useState(false);
  const [activeTool, setActiveTool] = useState<MaskTool>("brush");
  const [brushSize, setBrushSize] = useState(40);
  const [hasMaskContent, setHasMaskContent] = useState(false);
  const [whiteRatio, setWhiteRatio] = useState(0);

  const maskRef = useRef<MaskCanvasHandle>(null);

  const editCount = versions.filter((v) => v.edit_instruction).length;
  const maxEdits = 5;

  const handleToolChange = useCallback((tool: MaskTool) => {
    setActiveTool(tool);
    maskRef.current?.setTool(tool);
  }, []);

  const handleBrushSizeChange = useCallback((delta: number) => {
    setBrushSize((prev) => {
      const next = Math.max(10, Math.min(120, prev + delta));
      maskRef.current?.setBrushSize(next);
      return next;
    });
  }, []);

  const handleResetMask = useCallback(() => {
    maskRef.current?.resetMask();
    setHasMaskContent(false);
    setWhiteRatio(0);
  }, []);

  const handleMaskChange = useCallback((hasContent: boolean, ratio: number) => {
    setHasMaskContent(hasContent);
    setWhiteRatio(ratio);
  }, []);

  const handleApplyEdit = async () => {
    if (!instruction.trim()) {
      setError({ code: "PROMPT_EMPTY", message: ERROR_MESSAGES.PROMPT_EMPTY });
      return;
    }

    // Validate mask (unless applying globally)
    if (!applyGlobally && !hasMaskContent) {
      setError({ code: "MASK_EMPTY", message: ERROR_MESSAGES.MASK_EMPTY });
      return;
    }

    setIsEditing(true);
    setError(null);

    // Export mask if not applying globally
    let maskBase64: string | undefined;
    if (!applyGlobally && maskRef.current) {
      const dims = maskRef.current.getDimensions();
      const ratio = maskRef.current.getWhiteRatio();

      // Dev-mode debug logging
      if (import.meta.env.DEV) {
        console.log("[ImageEditor] Pre-edit debug:", {
          imageDims: dims,
          whitePixelRatio: ratio.toFixed(4),
          applyGlobally,
          instruction: instruction.trim().slice(0, 80),
        });
      }

      const maskBlob = await maskRef.current.exportMask();
      if (maskBlob) {
        // Convert blob to base64
        const reader = new FileReader();
        maskBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(maskBlob);
        });

        if (import.meta.env.DEV) {
          console.log("[ImageEditor] Mask exported:", {
            blobSize: maskBlob.size,
            base64Length: maskBase64.length,
          });
        }
      }
    }

    const result = await editImage(
      currentImageUrl,
      instruction.trim(),
      currentVersionId,
      projectId,
      maskBase64
    );

    setIsEditing(false);

    if (result.error) {
      const code = result.code || "AI_ERROR";
      setError({
        code,
        message: ERROR_MESSAGES[code] || result.error,
      });
    } else if (result.url) {
      onNewVersion(result.url, result.versionId ?? `local-${Date.now()}`);
      setInstruction("");
      handleResetMask();
    }
  };

  return (
    <div className="space-y-4">
      {/* Image with mask canvas overlay */}
      <div className="rounded-2xl overflow-hidden border border-[#C05621]/[0.08]">
        <MaskCanvas
          ref={maskRef}
          imageUrl={currentImageUrl}
          onMaskChange={handleMaskChange}
        />
      </div>

      {/* Mask tools toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-white border border-[#C05621]/10 rounded-xl overflow-hidden">
          <button
            onClick={() => handleToolChange("brush")}
            className={`px-3 py-2 flex items-center gap-1.5 text-xs transition-colors ${
              activeTool === "brush"
                ? "bg-[#C05621] text-white"
                : "text-[#4A5568] hover:bg-[#C05621]/5"
            }`}
            title="Brush — paint area to edit"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            Brush
          </button>
          <button
            onClick={() => handleToolChange("erase")}
            className={`px-3 py-2 flex items-center gap-1.5 text-xs transition-colors ${
              activeTool === "erase"
                ? "bg-[#C05621] text-white"
                : "text-[#4A5568] hover:bg-[#C05621]/5"
            }`}
            title="Eraser — remove mask"
          >
            <Eraser className="w-3.5 h-3.5" />
            Erase
          </button>
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-1 bg-white border border-[#C05621]/10 rounded-xl px-2 py-1">
          <button
            onClick={() => handleBrushSizeChange(-10)}
            className="text-[#4A5568] hover:text-[#C05621] p-0.5"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs text-[#4A5568] min-w-[32px] text-center">
            {brushSize}px
          </span>
          <button
            onClick={() => handleBrushSizeChange(10)}
            className="text-[#4A5568] hover:text-[#C05621] p-0.5"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={handleResetMask}
          className="px-3 py-2 flex items-center gap-1.5 text-xs text-[#4A5568] hover:text-[#C05621]
                     bg-white border border-[#C05621]/10 rounded-xl transition-colors"
          title="Reset mask"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>

        {/* Apply globally toggle */}
        <button
          onClick={() => setApplyGlobally(!applyGlobally)}
          className={`px-3 py-2 flex items-center gap-1.5 text-xs rounded-xl border transition-colors ${
            applyGlobally
              ? "bg-[#C05621]/10 border-[#C05621]/30 text-[#C05621]"
              : "bg-white border-[#C05621]/10 text-[#4A5568] hover:text-[#C05621]"
          }`}
          title="Apply edit to entire image (no mask needed)"
        >
          <Globe className="w-3.5 h-3.5" />
          Apply Globally
        </button>

        {/* Mask info */}
        {hasMaskContent && !applyGlobally && (
          <span className="text-xs text-[#4A5568]">
            {(whiteRatio * 100).toFixed(1)}% selected
          </span>
        )}
      </div>

      {/* Version thumbnails */}
      {versions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => onRevert(v)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                v.image_url === currentImageUrl
                  ? "border-[#C05621]"
                  : "border-transparent hover:border-[#C05621]/30"
              }`}
            >
              <img
                src={v.image_url}
                alt={`v${v.version_number}`}
                className="w-16 h-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Edit instruction input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#1B2432]">
            Describe what to change
          </label>
          <span className="text-xs text-[#4A5568]">
            {editCount}/{maxEdits} edits used
          </span>
        </div>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={
            applyGlobally
              ? "e.g., Make the background warmer, add gold accents..."
              : "Paint the area to edit above, then describe the change..."
          }
          disabled={isEditing || editCount >= maxEdits}
          className="w-full px-4 py-3 rounded-xl border border-[#C05621]/10 bg-white text-[#1B2432]
                     placeholder:text-[#4A5568]/50 focus:outline-none focus:ring-2 focus:ring-[#C05621]/30
                     focus:border-[#C05621]/30 transition-all resize-none min-h-[80px]
                     disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error.message}</p>
          {error.code === "MASK_EMPTY" && (
            <p className="text-xs text-red-500 mt-1">
              Use the brush tool to paint the area you want to edit, or toggle "Apply Globally".
            </p>
          )}
          {error.code === "AI_ERROR" && (
            <p className="text-xs text-red-500 mt-1">
              Try rephrasing your instruction or use a simpler edit.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleApplyEdit}
          disabled={!instruction.trim() || isEditing || editCount >= maxEdits}
          className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl gap-2"
        >
          {isEditing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Paintbrush className="w-4 h-4" />
              Apply Edit
            </>
          )}
        </Button>
        <Button
          onClick={onDone}
          variant="outline"
          className="rounded-xl border-[#1B2432]/20 text-[#1B2432] gap-2"
        >
          <Check className="w-4 h-4" />
          Done Editing
        </Button>
      </div>
    </div>
  );
}
