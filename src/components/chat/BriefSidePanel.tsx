import { useState, useRef, useEffect } from "react";
import {
  Check,
  Pencil,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  Settings2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Palette,
  Ruler,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BriefData, ProgressItem, ChatPhase } from "./types";
import type { AdditionalDetails } from "./BriefCard";
import type { BriefField } from "@/lib/briefFieldGenerator";

// ─── Standard sizes per item type ─────────────────────────────
const STANDARD_SIZES: Record<string, { w: number; h: number; d: number; note: string }> = {
  sofa: { w: 200, h: 85, d: 90, note: "Standard 3-seat sofa" },
  couch: { w: 200, h: 85, d: 90, note: "Standard 3-seat couch" },
  armchair: { w: 80, h: 85, d: 85, note: "Standard armchair" },
  chair: { w: 45, h: 85, d: 50, note: "Standard dining chair" },
  table: { w: 120, h: 75, d: 80, note: "Standard dining table" },
  desk: { w: 140, h: 75, d: 70, note: "Standard office desk" },
  bed: { w: 160, h: 100, d: 200, note: "Queen size bed" },
  shelf: { w: 80, h: 180, d: 35, note: "Standard bookshelf" },
  bookshelf: { w: 80, h: 180, d: 35, note: "Standard bookshelf" },
  cabinet: { w: 80, h: 90, d: 45, note: "Standard cabinet" },
  nightstand: { w: 45, h: 55, d: 40, note: "Standard nightstand" },
  dresser: { w: 120, h: 80, d: 50, note: "Standard dresser" },
  coffee_table: { w: 100, h: 45, d: 60, note: "Standard coffee table" },
  "coffee table": { w: 100, h: 45, d: 60, note: "Standard coffee table" },
  pillow: { w: 50, h: 15, d: 50, note: "Standard throw pillow" },
  cushion: { w: 50, h: 15, d: 50, note: "Standard throw pillow" },
  lamp: { w: 30, h: 60, d: 30, note: "Standard table lamp" },
  mirror: { w: 60, h: 90, d: 5, note: "Standard wall mirror" },
  rug: { w: 200, h: 2, d: 300, note: "Standard area rug" },
  vase: { w: 20, h: 30, d: 20, note: "Standard decorative vase" },
  ottoman: { w: 60, h: 45, d: 60, note: "Standard ottoman" },
  bench: { w: 120, h: 45, d: 40, note: "Standard bench" },
  stool: { w: 35, h: 65, d: 35, note: "Standard bar stool" },
  "bar stool": { w: 35, h: 75, d: 35, note: "Standard bar stool" },
  wardrobe: { w: 120, h: 200, d: 60, note: "Standard wardrobe" },
  sideboard: { w: 160, h: 80, d: 45, note: "Standard sideboard" },
  console: { w: 120, h: 75, d: 35, note: "Standard console table" },
  "tv stand": { w: 150, h: 50, d: 40, note: "Standard TV stand" },
  "dining table": { w: 160, h: 75, d: 90, note: "Standard dining table" },
  "side table": { w: 50, h: 55, d: 50, note: "Standard side table" },
  "office chair": { w: 65, h: 110, d: 65, note: "Standard office chair" },
  sectional: { w: 280, h: 85, d: 160, note: "Standard L-shape sectional" },
  headboard: { w: 160, h: 120, d: 10, note: "Queen headboard" },
  vanity: { w: 100, h: 75, d: 50, note: "Standard vanity" },
  chandelier: { w: 60, h: 60, d: 60, note: "Standard chandelier" },
  curtain: { w: 150, h: 250, d: 1, note: "Standard window curtain" },
};

interface AdditionalDetailItem {
  key: keyof AdditionalDetails;
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface BriefSidePanelProps {
  items: ProgressItem[];
  briefData: Partial<BriefData>;
  editingField: string | null;
  phase: ChatPhase;
  onEditField: (field: string, stepIndex: number) => void;
  onDirectUpdate?: (field: string, value: string) => void;
  onGenerateBrief?: () => void;
  isLoading?: boolean;
  additionalDetails?: AdditionalDetails;
  onAdditionalDetailsChange?: (details: AdditionalDetails) => void;
  additionalDetailItems?: AdditionalDetailItem[];
  dynamicFields?: BriefField[];
  dynamicFieldsLoading?: boolean;
  dynamicFieldValues?: Record<string, string>;
  onDynamicFieldChange?: (fieldId: string, value: string) => void;
  /** The specific item detected from conversation (e.g. "sofa", "desk") */
  specificItem?: string;
  /** Callback when user accepts the suggested size */
  onAcceptSize?: (w: number, h: number, d: number) => void;
}

export function BriefSidePanel({
  items,
  briefData,
  editingField,
  phase,
  onEditField,
  onDirectUpdate,
  onGenerateBrief,
  isLoading,
  additionalDetails,
  onAdditionalDetailsChange,
  additionalDetailItems,
  dynamicFields,
  dynamicFieldsLoading,
  dynamicFieldValues,
  onDynamicFieldChange,
  specificItem,
  onAcceptSize,
}: BriefSidePanelProps) {
  const [inlineValue, setInlineValue] = useState("");
  const [inlineField, setInlineField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sizeCustomizing, setSizeCustomizing] = useState(false);

  const filledCount = items.filter((i) => {
    const v = briefData[i.field as keyof BriefData];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }).length;

  useEffect(() => {
    if (inlineField) inputRef.current?.focus();
  }, [inlineField]);

  const handleClick = (item: ProgressItem, filled: boolean) => {
    const canInteract = phase === "chatting" || phase === "brief";
    if (!canInteract) return;
    if (onDirectUpdate) {
      const value = briefData[item.field as keyof BriefData];
      const currentStr = Array.isArray(value) ? value.join(", ") : String(value || "");
      setInlineField(item.field);
      setInlineValue(filled ? currentStr : "");
    } else if (filled) {
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

  // Resolve suggested size
  const suggestedSize = specificItem
    ? STANDARD_SIZES[specificItem.toLowerCase().trim()] || null
    : null;

  // Determine display name for item type
  const itemDisplayName = specificItem
    ? specificItem
        .split(/[\s_]+/)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : null;

  const canInteract = phase === "chatting" || phase === "brief";

  return (
    <div className="hidden lg:flex w-[380px] shrink-0 flex-col bg-[#FAFAF8] border-l border-black/[0.06] overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* ── A. Item Type Header ── */}
        <motion.div
          className="p-5 border-b border-black/[0.06]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#9CA3AF] font-medium">
            Designing
          </p>
          <AnimatePresence mode="wait">
            <motion.h3
              key={itemDisplayName || "empty"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="text-lg font-semibold text-[#1F2940] mt-1"
            >
              {itemDisplayName || briefData.category || "Select an item to start"}
            </motion.h3>
          </AnimatePresence>
        </motion.div>

        {/* ── B. Size Suggestion Card ── */}
        <AnimatePresence mode="wait">
          {suggestedSize && (
            <motion.div
              key={specificItem}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mx-4 mt-4 p-4 rounded-xl border border-[#C96A3D]/20 bg-white"
            >
              <div className="flex items-center gap-2 mb-3">
                <Ruler className="w-4 h-4 text-[#C96A3D]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#C96A3D]">
                  Suggested Size
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-[#9CA3AF] text-xs">W</span>{" "}
                  <span className="font-medium">{suggestedSize.w}cm</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] text-xs">H</span>{" "}
                  <span className="font-medium">{suggestedSize.h}cm</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] text-xs">D</span>{" "}
                  <span className="font-medium">{suggestedSize.d}cm</span>
                </div>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-2">{suggestedSize.note}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    onAcceptSize?.(suggestedSize.w, suggestedSize.h, suggestedSize.d);
                    onDirectUpdate?.("space_size", `${suggestedSize.w} x ${suggestedSize.h} x ${suggestedSize.d} cm`);
                    setSizeCustomizing(false);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#C96A3D] text-white font-medium hover:bg-[#B85A30] transition-colors"
                >
                  Use this size
                </button>
                <button
                  onClick={() => setSizeCustomizing(!sizeCustomizing)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-black/10 text-[#4A5568] font-medium hover:bg-black/[0.03] transition-colors"
                >
                  Customize
                </button>
              </div>

              {/* Inline customize */}
              <AnimatePresence>
                {sizeCustomizing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-black/[0.06]">
                      <input
                        type="text"
                        placeholder="e.g. 180 x 90 x 75 cm"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#C96A3D]/20 bg-white text-[#1B2432]
                                   focus:outline-none focus:ring-1 focus:ring-[#C96A3D]/40 placeholder:text-[#9CA3AF]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              onDirectUpdate?.("space_size", val);
                              setSizeCustomizing(false);
                            }
                          }
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── C. Brief Fields (progress items) ── */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#C05621]" />
            <span className="text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
              Brief Progress
            </span>
            <span className="text-xs text-[#4A5568]">
              {filledCount}/{items.length}
            </span>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const value = briefData[item.field as keyof BriefData];
              const filled = Array.isArray(value) ? value.length > 0 : !!value;
              const isEditing = editingField === item.field;
              const isInlineEditing = inlineField === item.field;
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.field}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.08 }}
                  data-field={item.field}
                >
                  <div
                    onClick={() => !isInlineEditing && handleClick(item, filled)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                      isEditing || isInlineEditing
                        ? "bg-[#C05621]/10 border border-[#C05621]/30 ring-2 ring-[#C05621]/20"
                        : filled
                        ? "bg-[#C05621]/[0.06] border border-[#C05621]/10"
                        : "bg-white/60 border border-transparent"
                    } ${canInteract && !isInlineEditing ? "cursor-pointer hover:border-[#C05621]/30" : ""}`}
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
                      {filled ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#4A5568]">{item.label}</div>
                      {filled && !isInlineEditing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-[#C05621] truncate mt-0.5"
                        >
                          {Array.isArray(value) ? (value as string[]).join(", ") : String(value)}
                        </motion.div>
                      )}
                    </div>
                    {canInteract && !isEditing && !isInlineEditing && (
                      <Pencil className="w-3.5 h-3.5 text-[#C05621]/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                  </div>

                  {/* Inline edit input */}
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
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Dynamic Brief Fields ── */}
        {(dynamicFields || dynamicFieldsLoading) && onDynamicFieldChange && (
          <div className="px-4 pb-2">
            <DynamicFieldsSection
              fields={dynamicFields || []}
              loading={dynamicFieldsLoading || false}
              values={dynamicFieldValues || {}}
              onChange={onDynamicFieldChange}
              phase={phase}
            />
          </div>
        )}

        {/* ── Additional Details ── */}
        {additionalDetails && onAdditionalDetailsChange && additionalDetailItems && (
          <div className="px-4 pb-4">
            <AdditionalDetailsSection
              details={additionalDetails}
              onChange={onAdditionalDetailsChange}
              items={additionalDetailItems}
              phase={phase}
            />
          </div>
        )}

        {/* Progress bar */}
        <div className="px-4 pb-4">
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
      </div>

      {/* ── D. Sticky bottom: mode indicator + generate button ── */}
      {onGenerateBrief && phase === "chatting" && filledCount >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 p-4 bg-[#FAFAF8] border-t border-black/[0.06]"
        >
          <p className="text-center text-xs text-[#9CA3AF] mb-3">
            Studio mode — white background
          </p>
          <button
            onClick={onGenerateBrief}
            disabled={isLoading}
            className="w-full bg-[#C96A3D] text-white rounded-xl py-3 font-semibold text-sm
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:bg-[#B85A30] transition-colors"
          >
            Generate Design
          </button>
          <p className="text-[10px] text-[#4A5568]/60 text-center mt-1.5">
            {filledCount < items.length
              ? `${filledCount}/${items.length} fields filled — missing fields will use defaults`
              : "All fields filled — ready to generate!"}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Additional Details collapsible section ──────────────────
function AdditionalDetailsSection({
  details,
  onChange,
  items,
  phase,
}: {
  details: AdditionalDetails;
  onChange: (d: AdditionalDetails) => void;
  items: AdditionalDetailItem[];
  phase: ChatPhase;
}) {
  const [open, setOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<keyof AdditionalDetails | null>(null);
  const [editValue, setEditValue] = useState("");
  const detailInputRef = useRef<HTMLInputElement>(null);

  const filledCount = items.filter((i) => !!details[i.key]).length;
  const canEdit = phase === "chatting" || phase === "brief";

  useEffect(() => {
    if (editingKey) detailInputRef.current?.focus();
  }, [editingKey]);

  const handleSave = () => {
    if (editingKey) {
      onChange({ ...details, [editingKey]: editValue.trim() });
    }
    setEditingKey(null);
    setEditValue("");
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue("");
  };

  return (
    <div className="border-t border-[#C05621]/[0.08] pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#C05621]/60" />
          <span className="text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
            More Details
          </span>
          {filledCount > 0 && (
            <span className="text-[10px] text-[#C05621] bg-[#C05621]/10 px-1.5 py-0.5 rounded-full">
              {filledCount}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-3">
              {items.map((item) => {
                const value = details[item.key];
                const isEditing = editingKey === item.key;
                const Icon = item.icon;

                return (
                  <div key={item.key}>
                    <div
                      onClick={() => {
                        if (!canEdit || isEditing) return;
                        setEditingKey(item.key);
                        setEditValue(value || "");
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${
                        isEditing
                          ? "bg-[#C05621]/10 border border-[#C05621]/30"
                          : value
                          ? "bg-[#C05621]/[0.04] border border-[#C05621]/10"
                          : "bg-white/60 border border-transparent"
                      } ${canEdit && !isEditing ? "cursor-pointer hover:border-[#C05621]/20" : ""}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          value
                            ? "bg-[#C05621]/10 text-[#C05621]"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {value ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-[#4A5568]">
                          {item.label}
                        </div>
                        {value && !isEditing && (
                          <div className="text-[11px] text-[#C05621] truncate mt-0.5">
                            {value}
                          </div>
                        )}
                      </div>
                      {canEdit && !isEditing && (
                        <Pencil className="w-3 h-3 text-[#C05621]/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      )}
                    </div>

                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-1 px-1"
                      >
                        <input
                          ref={detailInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSave();
                            } else if (e.key === "Escape") handleCancel();
                          }}
                          onBlur={handleSave}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#C05621]/20
                                     bg-white text-[#1B2432] focus:outline-none focus:ring-1
                                     focus:ring-[#C05621]/40 placeholder:text-[#4A5568]/40"
                          placeholder={item.placeholder}
                        />
                        <div className="flex justify-end gap-1 mt-1">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
                            className="text-[10px] text-[#4A5568] hover:text-[#1B2432] px-1.5 py-0.5"
                          >
                            Esc
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dynamic Brief Fields section ────────────────────────────
function DynamicFieldsSection({
  fields,
  loading,
  values,
  onChange,
  phase,
}: {
  fields: BriefField[];
  loading: boolean;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  phase: ChatPhase;
}) {
  const [open, setOpen] = useState(true);
  const canEdit = phase === "chatting" || phase === "brief";

  const filledCount = fields.filter((f) => !!values[f.id]).length;

  return (
    <div className="border-t border-[#C05621]/[0.08] pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#C05621]/60" />
          <span className="text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
            Specifications
          </span>
          {filledCount > 0 && (
            <span className="text-[10px] text-[#C05621] bg-[#C05621]/10 px-1.5 py-0.5 rounded-full">
              {filledCount}/{fields.length}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 border border-transparent animate-pulse"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 bg-gray-200 rounded w-20" />
                      <div className="h-2 bg-gray-100 rounded w-14" />
                    </div>
                  </div>
                ))
              ) : (
                fields.map((field, idx) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.08 }}
                  >
                    <DynamicFieldCard
                      field={field}
                      value={values[field.id] || ""}
                      onChange={(val) => onChange(field.id, val)}
                      canEdit={canEdit}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Individual dynamic field card ───────────────────────────
function DynamicFieldCard({
  field,
  value,
  onChange,
  canEdit,
}: {
  field: BriefField;
  value: string;
  onChange: (val: string) => void;
  canEdit: boolean;
}) {
  const filled = !!value;

  // Toggle field
  if (field.type === "toggle") {
    const isOn = value === "true" || value === "yes";
    return (
      <div
        onClick={() => canEdit && onChange(isOn ? "" : "true")}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
          canEdit ? "cursor-pointer hover:border-[#C05621]/20" : ""
        } ${
          filled
            ? "bg-[#C05621]/[0.04] border border-[#C05621]/10"
            : field.required
            ? "bg-white/60 border-l-2 border-l-orange-300 border-t border-r border-b border-transparent"
            : "bg-white/60 border border-transparent"
        }`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isOn ? "bg-[#C05621]/10 text-[#C05621]" : "bg-gray-100 text-gray-400"
          }`}
        >
          {isOn ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-[#4A5568]">
            {field.label}
            {field.required && !filled && <span className="text-orange-400 ml-1">*</span>}
          </div>
        </div>
        <div
          className={`w-8 h-4 rounded-full transition-colors relative ${
            isOn ? "bg-[#C05621]" : "bg-gray-200"
          }`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
              isOn ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>
    );
  }

  // Select field
  if (field.type === "select" && field.options) {
    return (
      <div
        className={`px-3 py-2 rounded-xl transition-all duration-200 ${
          filled
            ? "bg-[#C05621]/[0.04] border border-[#C05621]/10"
            : field.required
            ? "bg-white/60 border-l-2 border-l-orange-300 border-t border-r border-b border-transparent"
            : "bg-white/60 border border-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              filled ? "bg-[#C05621]/10 text-[#C05621]" : "bg-gray-100 text-gray-400"
            }`}
          >
            {filled ? <Check className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-[#4A5568]">
              {field.label}
              {field.required && !filled && <span className="text-orange-400 ml-1">*</span>}
            </div>
          </div>
        </div>
        {canEdit && (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1.5 w-full text-[11px] px-2 py-1.5 rounded-lg border border-[#C05621]/15
                       bg-white text-[#1B2432] focus:outline-none focus:ring-1
                       focus:ring-[#C05621]/40 appearance-none cursor-pointer"
          >
            <option value="">Select...</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        {!canEdit && filled && (
          <div className="text-[11px] text-[#C05621] mt-1">{value}</div>
        )}
      </div>
    );
  }

  // Slider field
  if (field.type === "slider" && field.sliderConfig) {
    const { min, max, step, unit } = field.sliderConfig;
    const numVal = value ? Number(value) : min;
    return (
      <div
        className={`px-3 py-2 rounded-xl transition-all duration-200 ${
          filled
            ? "bg-[#C05621]/[0.04] border border-[#C05621]/10"
            : field.required
            ? "bg-white/60 border-l-2 border-l-orange-300 border-t border-r border-b border-transparent"
            : "bg-white/60 border border-transparent"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium text-[#4A5568]">
            {field.label}
            {field.required && !filled && <span className="text-orange-400 ml-1">*</span>}
          </div>
          <span className="text-[11px] font-medium text-[#C05621]">
            {filled ? `${numVal}${unit ? ` ${unit}` : ""}` : "\u2014"}
          </span>
        </div>
        {canEdit && (
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={numVal}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1.5 w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-[#C05621] cursor-pointer
                       [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-[#C05621] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-sm"
          />
        )}
      </div>
    );
  }

  // Color field
  if (field.type === "color") {
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
          filled
            ? "bg-[#C05621]/[0.04] border border-[#C05621]/10"
            : "bg-white/60 border border-transparent"
        }`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            filled ? "bg-[#C05621]/10 text-[#C05621]" : "bg-gray-100 text-gray-400"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-[#4A5568]">{field.label}</div>
        </div>
        {canEdit && (
          <input
            type="color"
            value={value || field.placeholder || "#8B4513"}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded-lg border border-[#C05621]/10 cursor-pointer p-0"
          />
        )}
        {!canEdit && filled && (
          <div
            className="w-6 h-6 rounded-md border border-[#C05621]/10"
            style={{ backgroundColor: value }}
          />
        )}
      </div>
    );
  }

  // Default: text field
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) textInputRef.current?.focus();
  }, [editing]);

  return (
    <div>
      <div
        onClick={() => {
          if (!canEdit || editing) return;
          setEditing(true);
          setTempValue(value);
        }}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${
          editing
            ? "bg-[#C05621]/10 border border-[#C05621]/30"
            : filled
            ? "bg-[#C05621]/[0.04] border border-[#C05621]/10"
            : field.required
            ? "bg-white/60 border-l-2 border-l-orange-300 border-t border-r border-b border-transparent"
            : "bg-white/60 border border-transparent"
        } ${canEdit && !editing ? "cursor-pointer hover:border-[#C05621]/20" : ""}`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            filled ? "bg-[#C05621]/10 text-[#C05621]" : "bg-gray-100 text-gray-400"
          }`}
        >
          {filled ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-[#4A5568]">
            {field.label}
            {field.required && !filled && <span className="text-orange-400 ml-1">*</span>}
          </div>
          {filled && !editing && (
            <div className="text-[11px] text-[#C05621] truncate mt-0.5">{value}</div>
          )}
        </div>
        {canEdit && !editing && (
          <Pencil className="w-3 h-3 text-[#C05621]/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </div>

      {editing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-1 px-1"
        >
          <input
            ref={textInputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onChange(tempValue.trim());
                setEditing(false);
              } else if (e.key === "Escape") {
                setEditing(false);
                setTempValue(value);
              }
            }}
            onBlur={() => {
              onChange(tempValue.trim());
              setEditing(false);
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#C05621]/20
                       bg-white text-[#1B2432] focus:outline-none focus:ring-1
                       focus:ring-[#C05621]/40 placeholder:text-[#4A5568]/40"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
          <div className="flex justify-end gap-1 mt-1">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setEditing(false);
                setTempValue(value);
              }}
              className="text-[10px] text-[#4A5568] hover:text-[#1B2432] px-1.5 py-0.5"
            >
              Esc
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(tempValue.trim());
                setEditing(false);
              }}
              className="text-[10px] text-[#C05621] font-medium hover:text-[#A84A1C] px-1.5 py-0.5"
            >
              Save
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
