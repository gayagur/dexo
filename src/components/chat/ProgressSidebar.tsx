import { useState, useRef, useEffect } from "react";
import { Check, Pencil, Sparkles, ArrowRight, ChevronDown, ChevronUp, FileText, X, ListChecks, Settings2, Loader2, ToggleLeft, ToggleRight, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BriefData, ProgressItem, ChatPhase } from "./types";
import type { AdditionalDetails } from "./BriefCard";
import type { BriefField } from "@/lib/briefFieldGenerator";

interface AdditionalDetailItem {
  key: keyof AdditionalDetails;
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ProgressSidebarProps {
  items: ProgressItem[];
  briefData: Partial<BriefData>;
  editingField: string | null;
  phase: ChatPhase;
  onEditField: (field: string, stepIndex: number) => void;
  /** Direct field update — bypasses chat flow for inline editing */
  onDirectUpdate?: (field: string, value: string) => void;
  /** Generate brief from manually filled fields */
  onGenerateBrief?: () => void;
  /** Whether AI is currently loading */
  isLoading?: boolean;
  /** Additional details (optional extras) */
  additionalDetails?: AdditionalDetails;
  onAdditionalDetailsChange?: (details: AdditionalDetails) => void;
  /** Config for which additional detail fields to show */
  additionalDetailItems?: AdditionalDetailItem[];
  /** Dynamic brief fields based on selected item type */
  dynamicFields?: BriefField[];
  /** Whether dynamic fields are loading */
  dynamicFieldsLoading?: boolean;
  /** Current values for dynamic fields */
  dynamicFieldValues?: Record<string, string>;
  /** Callback when a dynamic field value changes */
  onDynamicFieldChange?: (fieldId: string, value: string) => void;
  /** Hide the desktop sidebar (when BriefSidePanel is used on desktop) */
  hideDesktop?: boolean;
}

/** All fields use inline editing */

export function ProgressSidebar({
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
  hideDesktop,
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
    const canInteract = phase === "chatting" || phase === "brief";
    if (!canInteract) return;

    // All fields use inline editing when onDirectUpdate is provided
    // Works for BOTH filled (edit) and unfilled (fill) fields
    if (onDirectUpdate) {
      const value = briefData[item.field as keyof BriefData];
      const currentStr = Array.isArray(value) ? value.join(", ") : String(value || "");
      setInlineField(item.field);
      setInlineValue(filled ? currentStr : "");
    } else if (filled) {
      // Fall back to chat-based flow (only for filled fields)
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

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileEditField, setMobileEditField] = useState<string | null>(null);
  const [mobileEditValue, setMobileEditValue] = useState("");
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileEditField) mobileInputRef.current?.focus();
  }, [mobileEditField]);

  const canInteractMobile = phase === "chatting" || phase === "brief";

  return (
    <>
    {/* ── Mobile: floating progress pill + bottom sheet ── */}
    <div className="lg:hidden fixed bottom-20 right-3 z-40"
         style={{ bottom: 'max(5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))' }}>
      <button
        onClick={() => setMobileOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-[#C05621]/20 shadow-lg text-xs font-medium text-[#1B2432] min-h-[44px]"
      >
        <ListChecks className="w-4 h-4 text-[#C05621]" />
        <span>{filledCount}/{items.length}</span>
        <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#C05621] transition-all duration-500"
            style={{ width: `${(filledCount / items.length) * 100}%` }}
          />
        </div>
      </button>
    </div>

    {/* Mobile bottom sheet */}
    <AnimatePresence>
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:hidden fixed inset-0 z-50"
        >
          <div className="absolute inset-0 bg-[#1B2432]/40" onClick={() => setMobileOpen(false)} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#C05621]/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C05621]" />
                <span className="font-serif text-sm font-bold text-[#1B2432]">Brief Progress</span>
                <span className="text-xs text-[#4A5568]">{filledCount}/{items.length}</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-5 h-5 text-[#4A5568]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.map((item) => {
                const value = briefData[item.field as keyof BriefData];
                const filled = Array.isArray(value) ? value.length > 0 : !!value;
                const Icon = item.icon;
                const isEditingThis = mobileEditField === item.field;
                return (
                  <div key={item.field}>
                    <div
                      onClick={() => {
                        if (!canInteractMobile || isEditingThis) return;
                        if (onDirectUpdate) {
                          const currentStr = Array.isArray(value) ? (value as string[]).join(', ') : String(value || '');
                          setMobileEditField(item.field);
                          setMobileEditValue(filled ? currentStr : '');
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl min-h-[44px] ${
                        isEditingThis
                          ? 'bg-[#C05621]/10 border border-[#C05621]/30'
                          : filled
                            ? 'bg-[#C05621]/[0.06] border border-[#C05621]/10'
                            : 'bg-white/60 border border-transparent'
                      } ${canInteractMobile && !isEditingThis ? 'cursor-pointer active:bg-[#C05621]/10' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        filled ? 'bg-[#C05621]/10 text-[#C05621]' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {filled ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-[#4A5568]">{item.label}</div>
                        {filled && !isEditingThis && (
                          <div className="text-xs text-[#C05621] truncate mt-0.5">
                            {Array.isArray(value) ? (value as string[]).join(', ') : String(value)}
                          </div>
                        )}
                      </div>
                      {canInteractMobile && !isEditingThis && (
                        <Pencil className="w-3.5 h-3.5 text-[#C05621]/40 shrink-0" />
                      )}
                    </div>
                    {/* Inline edit */}
                    {isEditingThis && (
                      <div className="mt-1 px-1">
                        <input
                          ref={mobileInputRef}
                          type="text"
                          value={mobileEditValue}
                          onChange={(e) => setMobileEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (mobileEditValue.trim() && onDirectUpdate) {
                                onDirectUpdate(item.field, mobileEditValue.trim());
                              }
                              setMobileEditField(null);
                              setMobileEditValue('');
                            } else if (e.key === 'Escape') {
                              setMobileEditField(null);
                              setMobileEditValue('');
                            }
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#C05621]/20
                                     bg-white text-[#1B2432] focus:outline-none focus:ring-1
                                     focus:ring-[#C05621]/40 placeholder:text-[#4A5568]/40 min-h-[44px]"
                          placeholder={`Enter ${item.label.toLowerCase()}...`}
                        />
                        <div className="flex justify-end gap-2 mt-1.5">
                          <button
                            onClick={() => { setMobileEditField(null); setMobileEditValue(''); }}
                            className="text-xs text-[#4A5568] px-3 py-1.5 min-h-[36px]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (mobileEditValue.trim() && onDirectUpdate) {
                                onDirectUpdate(item.field, mobileEditValue.trim());
                              }
                              setMobileEditField(null);
                              setMobileEditValue('');
                            }}
                            className="text-xs text-[#C05621] font-medium px-3 py-1.5 min-h-[36px]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Dynamic Brief Fields on mobile */}
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
            {/* Generate brief button on mobile */}
            {onGenerateBrief && phase === "chatting" && filledCount >= 1 && (
              <div className="px-5 py-2 border-t border-[#C05621]/[0.08]">
                <button
                  onClick={() => { setMobileOpen(false); onGenerateBrief(); }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                             bg-[#C05621] text-white text-sm font-medium
                             hover:bg-[#A84A1C] transition-colors min-h-[44px]
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Generate Brief
                </button>
              </div>
            )}
            {/* Progress bar */}
            <div className="px-5 py-3 border-t border-[#C05621]/[0.08]">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#C05621] transition-all duration-500"
                  style={{ width: `${(filledCount / items.length) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Desktop sidebar ── */}
    {!hideDesktop && (
    <aside className="hidden lg:flex flex-col w-72 min-h-0 border-r border-[#C05621]/[0.08] bg-white/50 p-6">
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="w-5 h-5 text-[#C05621]" />
        <h2 className="font-serif text-lg font-bold text-[#1B2432]">
          Brief Progress
        </h2>
      </div>

      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
        {items.map((item) => {
          const value = briefData[item.field as keyof BriefData];
          const filled = Array.isArray(value) ? value.length > 0 : !!value;
          const isEditing = editingField === item.field;
          const isInlineEditing = inlineField === item.field;
          const Icon = item.icon;
          const canInteract =
            (phase === "chatting" || phase === "brief") && !isInlineEditing;

          return (
            <div key={item.field} data-field={item.field}>
              <div
                onClick={() => !isInlineEditing && handleClick(item, filled)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                  isEditing || isInlineEditing
                    ? "bg-[#C05621]/10 border border-[#C05621]/30 ring-2 ring-[#C05621]/20"
                    : filled
                    ? "bg-[#C05621]/[0.06] border border-[#C05621]/10"
                    : "bg-white/60 border border-transparent"
                } ${canInteract ? "cursor-pointer hover:border-[#C05621]/30" : ""}`}
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
                {canInteract && !isEditing && (
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
            </div>
          );
        })}
      </div>

      {/* Dynamic Brief Fields — item-type specific */}
      {(dynamicFields || dynamicFieldsLoading) && onDynamicFieldChange && (
        <DynamicFieldsSection
          fields={dynamicFields || []}
          loading={dynamicFieldsLoading || false}
          values={dynamicFieldValues || {}}
          onChange={onDynamicFieldChange}
          phase={phase}
        />
      )}

      {/* Additional Details — collapsible */}
      {additionalDetails && onAdditionalDetailsChange && additionalDetailItems && (
        <AdditionalDetailsSection
          details={additionalDetails}
          onChange={onAdditionalDetailsChange}
          items={additionalDetailItems}
          phase={phase}
        />
      )}

      {/* Generate Brief button — visible when fields are filled during chatting phase */}
      {onGenerateBrief && phase === "chatting" && filledCount >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4"
        >
          <button
            onClick={onGenerateBrief}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-[#C05621] text-white text-sm font-medium
                       hover:bg-[#A84A1C] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Generate Brief
          </button>
          <p className="text-[10px] text-[#4A5568]/60 text-center mt-1.5">
            {filledCount < items.length
              ? `${filledCount}/${items.length} fields filled — missing fields will use defaults`
              : 'All fields filled — ready to generate!'}
          </p>
        </motion.div>
      )}

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
    )}
    </>
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
    <div className="mt-4 border-t border-[#C05621]/[0.08] pt-4">
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
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-[#9CA3AF]" />
          : <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
        }
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
                            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
                            else if (e.key === "Escape") handleCancel();
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
    <div className="mt-4 border-t border-[#C05621]/[0.08] pt-4">
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
                // Shimmer skeleton cards
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
                fields.map((field) => (
                  <DynamicFieldCard
                    key={field.id}
                    field={field}
                    value={values[field.id] || ""}
                    onChange={(val) => onChange(field.id, val)}
                    canEdit={canEdit}
                  />
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

  // ── Toggle field ──
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
          {isOn ? (
            <ToggleRight className="w-3.5 h-3.5" />
          ) : (
            <ToggleLeft className="w-3.5 h-3.5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-[#4A5568]">
            {field.label}
            {field.required && !filled && (
              <span className="text-orange-400 ml-1">*</span>
            )}
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

  // ── Select field ──
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
            {filled ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-[#4A5568]">
              {field.label}
              {field.required && !filled && (
                <span className="text-orange-400 ml-1">*</span>
              )}
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

  // ── Slider field ──
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
            {field.required && !filled && (
              <span className="text-orange-400 ml-1">*</span>
            )}
          </div>
          <span className="text-[11px] font-medium text-[#C05621]">
            {filled ? `${numVal}${unit ? ` ${unit}` : ""}` : "—"}
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

  // ── Color field ──
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
            className="w-7 h-7 rounded-lg border border-[#C05621]/10"
            style={{ backgroundColor: value }}
          />
        )}
      </div>
    );
  }

  // ── Text field (fallback) ──
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
      <div className="text-[11px] font-medium text-[#4A5568]">
        {field.label}
        {field.required && !filled && (
          <span className="text-orange-400 ml-1">*</span>
        )}
      </div>
      {canEdit && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          className="mt-1.5 w-full text-[11px] px-2 py-1.5 rounded-lg border border-[#C05621]/15
                     bg-white text-[#1B2432] focus:outline-none focus:ring-1
                     focus:ring-[#C05621]/40 placeholder:text-[#4A5568]/40"
        />
      )}
      {!canEdit && filled && (
        <div className="text-[11px] text-[#C05621] mt-1">{value}</div>
      )}
    </div>
  );
}
