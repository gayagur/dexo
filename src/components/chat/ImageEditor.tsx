import { useState } from "react";
import { Button } from "@/components/ui/button";
import { editImage } from "@/lib/ai";
import { Loader2, Undo2, Check } from "lucide-react";
import type { ImageVersion } from "@/lib/database.types";

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
  const [error, setError] = useState<string | null>(null);

  // Count edits on the current chain
  const editCount = versions.filter((v) => v.edit_instruction).length;
  const maxEdits = 5;

  const handleApplyEdit = async () => {
    if (!instruction.trim()) return;
    setIsEditing(true);
    setError(null);

    const result = await editImage(
      currentImageUrl,
      instruction.trim(),
      currentVersionId,
      projectId
    );

    setIsEditing(false);

    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      // versionId may be null in draft phase (no projectId) — use a local ID
      onNewVersion(result.url, result.versionId ?? `local-${Date.now()}`);
      setInstruction("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="rounded-2xl overflow-hidden border border-[#C05621]/[0.08]">
        <img
          src={currentImageUrl}
          alt="Current version"
          className="w-full h-72 object-cover"
        />
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
          placeholder="e.g., Make the background warmer, change the left side to blue, add gold accents to the edges..."
          disabled={isEditing || editCount >= maxEdits}
          className="w-full px-4 py-3 rounded-xl border border-[#C05621]/10 bg-white text-[#1B2432]
                     placeholder:text-[#4A5568]/50 focus:outline-none focus:ring-2 focus:ring-[#C05621]/30
                     focus:border-[#C05621]/30 transition-all resize-none min-h-[80px]
                     disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
          <p className="text-xs text-red-500 mt-1">Try rephrasing your instruction or use a simpler edit.</p>
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
              <Undo2 className="w-4 h-4" />
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
