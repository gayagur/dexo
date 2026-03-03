import type { BriefData as SharedBriefData } from "./types";

/**
 * AIChatFlow's internal brief format (flat strings).
 * Matches the interface defined at the top of AIChatFlow.tsx.
 */
export interface InternalBriefData {
  title: string;
  category: string;
  description: string;
  style: string;
  budget: string;
  materials: string;
  dimensions: string;
  timeline: string;
  specialRequirements: string;
}

/**
 * BriefCard's display format (parsed numbers, arrays).
 */
export interface BriefDisplayData {
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

export function parseBudgetRange(budget: string): { min: number; max: number } {
  const nums = [...budget.matchAll(/\$?([\d,]+)/g)].map(m =>
    parseInt(m[1].replace(",", ""), 10)
  );
  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  if (nums.length === 1) return { min: 0, max: nums[0] };
  return { min: 0, max: 1000 };
}

/** Convert AIChatFlow's internal brief → BriefCard's BriefDisplayData */
export function toBriefDisplayData(b: InternalBriefData): BriefDisplayData {
  const { min, max } = parseBudgetRange(b.budget);
  return {
    title: b.title,
    category: b.category,
    description: b.description,
    style_tags: b.style.split(",").map(s => s.trim()).filter(Boolean),
    budget_min: min,
    budget_max: max,
    materials:
      b.materials !== "To be discussed"
        ? b.materials.split(",").map(s => s.trim())
        : [],
    dimensions: b.dimensions,
    deadline: b.timeline,
    special_requirements:
      b.specialRequirements !== "None" ? b.specialRequirements : "",
  };
}

/** Convert AIChatFlow's internal brief → ProgressSidebar's Partial<BriefData> */
export function toProgressBriefData(b: InternalBriefData): Partial<SharedBriefData> {
  return {
    title: b.title,
    category: b.category,
    description: b.description,
    style_tags: b.style.split(",").map(s => s.trim()).filter(Boolean),
    budget: b.budget,
    size: b.dimensions,
    materials: b.materials,
    timeline: b.timeline,
    special_requirements: b.specialRequirements,
  };
}

/** Convert extractProgress() result → Partial<SharedBriefData> for ProgressSidebar */
export function progressToSharedBrief(
  progress: Record<string, string>
): Partial<SharedBriefData> {
  return {
    category: progress.category || undefined,
    style_tags: progress.style
      ? progress.style.split(",").map(s => s.trim()).filter(Boolean)
      : undefined,
    budget: progress.budget || undefined,
    size: progress.dimensions || undefined,
    materials: progress.materials || undefined,
    timeline: progress.timeline || undefined,
  };
}
