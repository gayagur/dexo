import { useRef, useCallback, useEffect } from "react";
import { Send, ImagePlus, Loader2, X, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  onAbort?: () => void;
  pendingPreviews?: string[];
  onRemovePreview?: (index: number) => void;
  imageUploading?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onFileSelect,
  placeholder = "Type your answer...",
  disabled = false,
  isStreaming = false,
  onAbort,
  pendingPreviews = [],
  onRemovePreview,
  imageUploading = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 150)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Focus on mount and when enabled
  useEffect(() => {
    if (!disabled && !isStreaming) {
      textareaRef.current?.focus();
    }
  }, [disabled, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isStreaming) onSend();
    }
  };

  const canSend = (value.trim().length > 0 || pendingPreviews.length > 0) && !disabled;

  return (
    <div className="space-y-2">
      {/* Pending image previews */}
      {pendingPreviews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {pendingPreviews.map((url, i) => (
            <div key={i} className="relative">
              <img
                src={url}
                alt={`Upload preview ${i + 1}`}
                className="w-16 h-16 rounded-lg object-cover border border-[#C05621]/10"
              />
              {onRemovePreview && (
                <button
                  onClick={() => onRemovePreview(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {imageUploading && (
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#C05621] animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-12 w-12 flex items-center justify-center rounded-xl border border-[#C05621]/10 bg-white hover:bg-[#C05621]/5 text-[#C05621]/60 hover:text-[#C05621] transition-colors flex-shrink-0"
          title="Attach images"
        >
          <ImagePlus className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFileSelect}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isStreaming}
          className="flex-1 px-4 py-3 rounded-xl border border-[#C05621]/10 bg-white text-[#1B2432]
                     placeholder:text-[#4A5568]/50 focus:outline-none focus:ring-2 focus:ring-[#C05621]/30
                     focus:border-[#C05621]/30 transition-all resize-none min-h-[48px] max-h-[150px]
                     disabled:opacity-50"
        />
        {isStreaming ? (
          <Button
            onClick={onAbort}
            className="bg-red-500 text-white hover:bg-red-600 rounded-xl h-12 w-12 p-0 flex-shrink-0"
            title="Stop generating"
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={onSend}
            disabled={!canSend}
            className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl h-12 w-12 p-0 flex-shrink-0
                       disabled:opacity-40"
          >
            <Send className="w-4.5 h-4.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
