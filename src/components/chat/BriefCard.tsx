import { motion } from "framer-motion";
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
} from "lucide-react";

interface BriefDisplayData {
  title: string;
  category: string;
  description: string;
  style_tags: string[];
  budget_min: number;
  budget_max: number;
  materials: string[];
  dimensions: string;
  deadline: string;
  special_requirements: string;
}

interface BriefCardProps {
  brief: BriefDisplayData;
  phase: "brief" | "generating_image" | "editing_image" | "done";
  conceptImageUrl: string | null;
  submitting: boolean;
  imageUploading: boolean;
  uploadedImages: string[];
  onGenerateImage: () => void;
  onSubmit: () => void;
  onEditImage?: () => void;
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
  onGenerateImage,
  onSubmit,
  onEditImage,
  onBriefFileDrop,
  onBriefFileSelect,
  onRemoveBriefImage,
  briefFileInputRef,
}: BriefCardProps) {
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
          <span className="text-[#4A5568] text-xs">Dimensions</span>
          <p className="font-medium text-[#1B2432] mt-0.5">
            {brief.dimensions}
          </p>
        </div>
      </div>

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
                    alt=""
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
          <div className="rounded-2xl overflow-hidden border border-[#C05621]/[0.08]">
            <img
              src={conceptImageUrl}
              alt="AI concept"
              className="w-full h-64 object-cover"
            />
          </div>
          {onEditImage && phase === "done" && (
            <Button
              onClick={onEditImage}
              variant="outline"
              size="sm"
              className="rounded-xl border-[#C05621]/20 text-[#C05621] gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Image
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {phase === "brief" && (
          <>
            <Button
              onClick={onGenerateImage}
              className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl gap-2"
              size="lg"
            >
              <ImageIcon className="w-4 h-4" />
              Generate Concept Image
            </Button>
            <Button
              onClick={onSubmit}
              variant="outline"
              size="lg"
              className="rounded-xl border-[#1B2432]/20 text-[#1B2432] gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Skip Image & Submit
            </Button>
          </>
        )}
        {phase === "done" && (
          <Button
            onClick={onSubmit}
            className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl gap-2"
            size="lg"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Confirm & Find Creators
          </Button>
        )}
      </div>
    </motion.div>
  );
}
