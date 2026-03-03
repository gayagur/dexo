import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SingleChipSelectorProps {
  options: string[];
  onSelect: (value: string) => void;
}

export function SingleChipSelector({ options, onSelect }: SingleChipSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="px-4 py-2 rounded-full bg-white border border-[#C05621]/15 text-[#1B2432] text-sm font-medium
                     hover:bg-[#C05621] hover:text-white hover:border-[#C05621] transition-all duration-200"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

interface MultiChipSelectorProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onConfirm: () => void;
}

export function MultiChipSelector({
  options,
  selected,
  onToggle,
  onConfirm,
}: MultiChipSelectorProps) {
  return (
    <div className="space-y-3 mb-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => onToggle(option)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? "bg-[#C05621] text-white border border-[#C05621]"
                  : "bg-white border border-[#C05621]/15 text-[#1B2432] hover:border-[#C05621]/40"
              }`}
            >
              {isSelected && <Check className="w-3 h-3 inline mr-1" />}
              {option}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <Button
          onClick={onConfirm}
          size="sm"
          className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-full"
        >
          Continue with {selected.length} selected
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      )}
    </div>
  );
}

interface ConfirmChipsProps {
  detectedCategory: string;
  onConfirm: (confirmed: boolean) => void;
}

export function CategoryConfirmChips({
  detectedCategory,
  onConfirm,
}: ConfirmChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <button
        onClick={() => onConfirm(true)}
        className="px-4 py-2 rounded-full bg-[#C05621] text-white text-sm font-medium hover:bg-[#A84A1C] transition-colors"
      >
        Yes, {detectedCategory}!
      </button>
      <button
        onClick={() => onConfirm(false)}
        className="px-4 py-2 rounded-full bg-white border border-[#C05621]/20 text-[#1B2432] text-sm font-medium hover:bg-[#C05621]/5 transition-colors"
      >
        No, let me pick
      </button>
    </div>
  );
}
