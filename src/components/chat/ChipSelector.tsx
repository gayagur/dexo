import { useState, useMemo } from "react";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
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

// ─── Category selector with random 5 + expand ───────────────
interface CategoryChipSelectorProps {
  allCategories: string[];
  onSelect: (value: string) => void;
}

/** Picks `count` random items from an array using Fisher-Yates shuffle */
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function CategoryChipSelector({ allCategories, onSelect }: CategoryChipSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  // Pick 5 random categories once per mount (= once per session)
  const randomFive = useMemo(() => pickRandom(allCategories, 5), [allCategories]);

  const visible = expanded ? allCategories : randomFive;

  return (
    <div className="space-y-2 mb-3">
      <div className="flex flex-wrap gap-2">
        {visible.map((option) => (
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
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#C05621] font-medium
                     hover:bg-[#C05621]/5 rounded-full transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          See more categories
        </button>
      )}
    </div>
  );
}
