import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Star,
  ImageIcon,
  ArrowRight,
  Check,
  Loader2,
  ImagePlus,
  X,
  Pencil,
  Zap,
  Users,
  Palette,
  ChevronDown,
  ChevronUp,
  FileText,
  Maximize2,
  Box,
} from "lucide-react";

interface BriefDisplayData {
  title: string;
  category: string;
  description: string;
  style_tags: string[];
  budget_min: number;
  budget_max: number;
  materials: string[];
  space_size: string;
  deadline: string;
  special_requirements: string;
  room_type: string;
  color_palette: string;
}

export interface AdditionalDetails {
  inspirations: string;
  materialsToAvoid: string;
  accessibility: string;
  existingItems: string;
  otherNotes: string;
}

interface BriefCardProps {
  brief: BriefDisplayData;
  phase: "brief" | "generating_image" | "editing_image" | "done";
  conceptImageUrl: string | null;
  submitting: boolean;
  imageUploading: boolean;
  uploadedImages: string[];
  additionalDetails: AdditionalDetails;
  onAdditionalDetailsChange: (details: AdditionalDetails) => void;
  onGenerateImage: () => void;
  onSubmit: (method: 'auto' | 'manual') => void;
  onEditImage?: () => void;
  onManualEdit?: () => void;
  onRegenerate?: () => void;
  onCreate3DModel?: () => void;
  creating3DModel?: boolean;
  onBriefFileDrop: (e: React.DragEvent) => void;
  onBriefFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBriefImage: (index: number) => void;
  briefFileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function BriefCard({
  brief,
  phase,
  conceptImageUrl,
  submitting,
  imageUploading,
  uploadedImages,
  additionalDetails,
  onAdditionalDetailsChange,
  onGenerateImage,
  onSubmit,
  onEditImage,
  onManualEdit,
  onRegenerate,
  onCreate3DModel,
  creating3DModel,
  onBriefFileDrop,
  onBriefFileSelect,
  onRemoveBriefImage,
  briefFileInputRef,
}: BriefCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const updateDetail = (key: keyof AdditionalDetails, value: string) => {
    onAdditionalDetailsChange({ ...additionalDetails, [key]: value });
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl border border-[#C05621]/[0.08] shadow-md p-8 space-y-6"
    >
      <div className="flex items-center gap-2 text-[#C05621]">
        <Star className="w-5 h-5" />
        <span className="font-semibold text-sm uppercase tracking-wider">
          Your Project Brief
        </span>
      </div>

      <h3 className="text-2xl font-serif font-bold text-[#1B2432]">
        {brief.title}
      </h3>
      <p className="text-[#4A5568] leading-relaxed">{brief.description}</p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
          <span className="text-[#4A5568] text-xs">Category</span>
          <p className="font-medium text-[#1B2432] mt-0.5">{brief.category}</p>
        </div>
        <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
          <span className="text-[#4A5568] text-xs">Budget</span>
          <p className="font-medium text-[#1B2432] mt-0.5">
            ${brief.budget_min} – ${brief.budget_max}
          </p>
        </div>
        <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
          <span className="text-[#4A5568] text-xs">Timeline</span>
          <p className="font-medium text-[#1B2432] mt-0.5">{brief.deadline}</p>
        </div>
        <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
          <span className="text-[#4A5568] text-xs">Space Size</span>
          <p className="font-medium text-[#1B2432] mt-0.5">
            {brief.space_size}
          </p>
        </div>
      </div>

      {(brief.room_type || brief.color_palette) && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {brief.room_type && (
            <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
              <span className="text-[#4A5568] text-xs">Room Type</span>
              <p className="font-medium text-[#1B2432] mt-0.5">{brief.room_type}</p>
            </div>
          )}
          {brief.color_palette && (
            <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
              <span className="text-[#4A5568] text-xs">Color Palette</span>
              <p className="font-medium text-[#1B2432] mt-0.5">{brief.color_palette}</p>
            </div>
          )}
        </div>
      )}

      {brief.style_tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {brief.style_tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full bg-[#C05621]/[0.07] text-[#C05621] text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {brief.materials.length > 0 && brief.materials[0] && (
        <p className="text-sm text-[#4A5568]">
          <span className="font-medium text-[#1B2432]">Materials:</span>{" "}
          {brief.materials.join(", ")}
        </p>
      )}

      {brief.special_requirements && (
        <p className="text-sm text-[#4A5568]">
          <span className="font-medium text-[#1B2432]">Special notes:</span>{" "}
          {brief.special_requirements}
        </p>
      )}

      {/* Reference images */}
      <div className="space-y-3">
        {uploadedImages.length > 0 && (
          <div>
            <span className="text-xs font-medium text-[#4A5568]">
              Reference Images
            </span>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {uploadedImages.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`Design brief image ${i + 1}`}
                    className="rounded-xl w-full h-24 object-cover"
                  />
                  <button
                    onClick={() => onRemoveBriefImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadedImages.length < 5 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onBriefFileDrop}
            onClick={() => briefFileInputRef.current?.click()}
            className="border-2 border-dashed border-[#C05621]/20 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[#C05621]/40 hover:bg-[#C05621]/[0.02] transition-colors"
          >
            {imageUploading ? (
              <Loader2 className="w-6 h-6 text-[#C05621] animate-spin" />
            ) : (
              <ImagePlus className="w-6 h-6 text-[#C05621]/40" />
            )}
            <span className="text-xs text-[#4A5568]">
              Drop images here or click to browse
            </span>
            <span className="text-xs text-[#4A5568]/60">
              {uploadedImages.length}/5 images
            </span>
          </div>
        )}

        <input
          ref={briefFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onBriefFileSelect}
        />
      </div>

      {/* Concept image */}
      {(phase === "done" || phase === "editing_image") && conceptImageUrl && (
        <div className="space-y-2">
          <div
            className="relative rounded-2xl overflow-hidden border border-[#C05621]/[0.08] cursor-pointer group"
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={conceptImageUrl}
              alt="AI concept"
              className="w-full object-contain max-h-[480px]"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-md">
                <Maximize2 className="w-4 h-4 text-[#1B2432]" />
              </div>
            </div>
          </div>
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

          {/* Create 3D Model button */}
          {phase === "done" && onCreate3DModel && (
            <Button
              onClick={onCreate3DModel}
              disabled={creating3DModel}
              size="lg"
              className="w-full rounded-xl bg-[#C05621] text-white hover:bg-[#A84A1C] gap-2 text-base font-semibold shadow-md mt-2 disabled:opacity-70"
            >
              {creating3DModel ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing design...
                </>
              ) : (
                <>
                  <Box className="w-5 h-5" />
                  Create 3D Model
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {phase === "generating_image" && (
        <div className="flex items-center justify-center h-48 rounded-2xl bg-[#FDFCF8] border border-[#C05621]/[0.06]">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#C05621] animate-spin mx-auto" />
            <p className="text-sm text-[#4A5568]">
              Generating concept image...
            </p>
          </div>
        </div>
      )}

      {/* Additional Details — collapsible section */}
      {(phase === "brief" || phase === "done") && (
        <div className="border border-[#C05621]/[0.08] rounded-2xl overflow-hidden">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#FDFCF8] hover:bg-[#FAF7F4] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C05621]" />
              <span className="text-sm font-medium text-[#1B2432]">Additional Details</span>
              <span className="text-xs text-[#4A5568]">(optional)</span>
            </div>
            {detailsOpen
              ? <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
              : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
            }
          </button>

          <AnimatePresence>
            {detailsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 py-4 space-y-4 border-t border-[#C05621]/[0.06]">
                  <DetailField
                    label="Inspirations or references"
                    placeholder="Mood board links, Pinterest boards, Instagram posts..."
                    value={additionalDetails.inspirations}
                    onChange={(v) => updateDetail("inspirations", v)}
                  />
                  <DetailField
                    label="Materials or finishes to avoid"
                    placeholder="e.g. no leather, avoid glossy finishes..."
                    value={additionalDetails.materialsToAvoid}
                    onChange={(v) => updateDetail("materialsToAvoid", v)}
                  />
                  <DetailField
                    label="Accessibility requirements"
                    placeholder="e.g. wheelchair accessible, low-height furniture..."
                    value={additionalDetails.accessibility}
                    onChange={(v) => updateDetail("accessibility", v)}
                  />
                  <DetailField
                    label="Existing items to incorporate"
                    placeholder="e.g. keep the oak dining table, reuse the bookshelf..."
                    value={additionalDetails.existingItems}
                    onChange={(v) => updateDetail("existingItems", v)}
                  />
                  <DetailField
                    label="Anything else the designer should know"
                    placeholder="Any other preferences, constraints, or notes..."
                    value={additionalDetails.otherNotes}
                    onChange={(v) => updateDetail("otherNotes", v)}
                    multiline
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-4 pt-2">
        {phase === "brief" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onGenerateImage}
              className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl gap-2"
              size="lg"
            >
              <ImageIcon className="w-4 h-4" />
              Generate Concept Image
            </Button>
          </div>
        )}

        {/* Submission method selection — visible in brief and done phases */}
        {(phase === "brief" || phase === "done") && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[#1B2432]">
              How would you like to find designers?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => onSubmit('auto')}
                disabled={submitting}
                className="group relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-[#C05621]/15 bg-[#FDFCF8] hover:border-[#C05621]/40 hover:bg-[#C05621]/[0.04] transition-all text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-[#C05621]/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#C05621]" />
                </div>
                <span className="font-semibold text-sm text-[#1B2432]">
                  Auto-Match
                </span>
                <span className="text-xs text-[#4A5568] leading-relaxed">
                  Send my project to relevant designers automatically. Get offers faster.
                </span>
                {submitting && (
                  <Loader2 className="absolute top-4 right-4 w-4 h-4 text-[#C05621] animate-spin" />
                )}
              </button>

              <button
                onClick={() => onSubmit('manual')}
                disabled={submitting}
                className="group relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-[#1B2432]/10 bg-[#FDFCF8] hover:border-[#1B2432]/25 hover:bg-[#1B2432]/[0.02] transition-all text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1B2432]/[0.07] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#1B2432]" />
                </div>
                <span className="font-semibold text-sm text-[#1B2432]">
                  Choose Designers
                </span>
                <span className="text-xs text-[#4A5568] leading-relaxed">
                  Browse designers yourself and send the project to the ones you like.
                </span>
                {submitting && (
                  <Loader2 className="absolute top-4 right-4 w-4 h-4 text-[#1B2432] animate-spin" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full-size image lightbox */}
      <AnimatePresence>
        {lightboxOpen && conceptImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B2432]/70 backdrop-blur-sm p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={conceptImageUrl}
                alt="AI concept — full size"
                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
              />
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-[#1B2432]" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Detail field for the Additional Details section ──────
function DetailField({
  label,
  placeholder,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const shared =
    "w-full px-3.5 py-2.5 rounded-xl border border-[#C05621]/10 bg-white text-sm text-[#1B2432] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C05621]/30 focus:ring-1 focus:ring-[#C05621]/10 transition-colors";

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#4A5568]">{label}</label>
      {multiline ? (
        <textarea
          rows={3}
          className={`${shared} resize-none`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={shared}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
