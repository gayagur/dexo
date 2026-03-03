import { useState, useRef, useEffect } from "react";
import { Check, Pencil, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { BriefData, ProgressItem, ChatPhase } from "./types";

interface ProgressSidebarProps {
  items: ProgressItem[];
  briefData: Partial<BriefData>;
  editingField: string | null;
  phase: ChatPhase;
  onEditField: (field: string, stepIndex: number) => void;
  /** Direct field update — bypasses chat flow for inline editing */
  onDirectUpdate?: (field: string, value: string) => void;
}

/** Chip fields use the chat-based flow; free-text fields use inline input */
const CHIP_FIELDS = new Set(["category", "style_tags"]);

export function ProgressSidebar({
  items,
  briefData,
  editingField,
  phase,
  onEditField,
  onDirectUpdate,
}: ProgressSidebarProps) {
  const [inlineValue, setInlineValue] = useState("");
  const [inlineField, setInlineField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filledCount = items.filter((i) => {
    const v = briefData[i.field as keyof BriefData];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }).length;

  // Focus inline input when it appears
  useEffect(() => {
    if (inlineField) inputRef.current?.focus();
  }, [inlineField]);

  const handleClick = (item: ProgressItem, filled: boolean) => {
    const canEdit = filled && (phase === "chatting" || phase === "brief");
    if (!canEdit) return;

    // Chip fields go through the chat-based flow
    if (CHIP_FIELDS.has(item.field)) {
      onEditField(item.field, item.stepIndex);
      return;
    }

    // Free-text fields: open inline edit if onDirectUpdate is provided
    if (onDirectUpdate) {
      const value = briefData[item.field as keyof BriefData];
      const currentStr = Array.isArray(value) ? value.join(", ") : String(value || "");
      setInlineField(item.field);
      setInlineValue(currentStr);
    } else {
      // Fall back to chat-based flow
      onEditField(item.field, item.stepIndex);
    }
  };

  const handleInlineSave = () => {
    if (inlineField && inlineValue.trim() && onDirectUpdate) {
      onDirectUpdate(inlineField, inlineValue.trim());
    }
    setInlineField(null);
    setInlineValue("");
  };

  const handleInlineCancel = () => {
    setInlineField(null);
    setInlineValue("");
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInlineSave();
    } else if (e.key === "Escape") {
      handleInlineCancel();
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 border-r border-[#C05621]/[0.08] bg-white/50 p-6">
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="w-5 h-5 text-[#C05621]" />
        <h2 className="font-serif text-lg font-bold text-[#1B2432]">
          Brief Progress
        </h2>
      </div>

      <div className="space-y-3 flex-1">
        {items.map((item) => {
          const value = briefData[item.field as keyof BriefData];
          const filled = Array.isArray(value) ? value.length > 0 : !!value;
          const isEditing = editingField === item.field;
          const isInlineEditing = inlineField === item.field;
          const Icon = item.icon;
          const canEdit =
            filled && (phase === "chatting" || phase === "brief");

          return (
            <div key={item.field}>
              <div
                onClick={() => !isInlineEditing && handleClick(item, filled)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                  isEditing || isInlineEditing
                    ? "bg-[#C05621]/10 border border-[#C05621]/30 ring-2 ring-[#C05621]/20"
                    : filled
                    ? "bg-[#C05621]/[0.06] border border-[#C05621]/10"
                    : "bg-white/60 border border-transparent"
                } ${canEdit && !isInlineEditing ? "cursor-pointer hover:border-[#C05621]/30" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isEditing || isInlineEditing
                      ? "bg-[#C05621]/20 text-[#C05621]"
                      : filled
                      ? "bg-[#C05621]/10 text-[#C05621]"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {filled ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#4A5568]">
                    {item.label}
                  </div>
                  {filled && !isInlineEditing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-xs text-[#C05621] truncate mt-0.5"
                    >
                      {Array.isArray(value)
                        ? (value as string[]).join(", ")
                        : String(value)}
                    </motion.div>
                  )}
                </div>
                {canEdit && !isEditing && !isInlineEditing && (
                  <Pencil className="w-3.5 h-3.5 text-[#C05621]/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                )}
              </div>

              {/* Inline edit input for free-text fields */}
              {isInlineEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-1 px-1"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inlineValue}
                    onChange={(e) => setInlineValue(e.target.value)}
                    onKeyDown={handleInlineKeyDown}
                    onBlur={handleInlineSave}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#C05621]/20
                               bg-white text-[#1B2432] focus:outline-none focus:ring-1
                               focus:ring-[#C05621]/40 placeholder:text-[#4A5568]/40"
                    placeholder={`Enter ${item.label.toLowerCase()}...`}
                  />
                  <div className="flex justify-end gap-1 mt-1">
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleInlineCancel(); }}
                      className="text-[10px] text-[#4A5568] hover:text-[#1B2432] px-1.5 py-0.5"
                    >
                      Esc
                    </button>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleInlineSave(); }}
                      className="text-[10px] text-[#C05621] font-medium hover:text-[#A84A1C] px-1.5 py-0.5"
                    >
                      Save
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-auto pt-6">
        <div className="flex justify-between text-xs text-[#4A5568] mb-2">
          <span>Progress</span>
          <span>
            {filledCount}/{items.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#C05621]"
            initial={{ width: 0 }}
            animate={{
              width: `${(filledCount / items.length) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </aside>
  );
}
