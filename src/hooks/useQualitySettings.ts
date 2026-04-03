import { useMemo } from "react";

export const DEXO_QUALITY_STORAGE_KEY = "dexo_quality";

export type QualityTier = "low" | "medium" | "high";
/** User-facing mode: Auto follows GPU heuristic; otherwise forces a tier. */
export type QualityPreference = "auto" | QualityTier;

export type EditorQualityResolved = {
  tier: QualityTier;
  contactShadowResolution: 128 | 256 | 384;
  contactShadowBlur: 1 | 2 | 2.5;
  showBloom: boolean;
  showVignette: boolean;
  pixelRatio: number;
};

function deviceDpr(): number {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio ?? 1;
}

/** Heuristic tier when preference is "auto". */
export function detectQualityTier(): QualityTier {
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = deviceDpr();
  if (cores < 4) return "low";
  if (cores < 8 && dpr > 2) return "medium";
  return "high";
}

function clampPixelRatio(tier: QualityTier): number {
  const dpr = deviceDpr();
  if (tier === "low") return 1;
  if (tier === "medium") return Math.min(1.5, dpr);
  return Math.min(2, dpr);
}

export function resolveEditorQuality(preference: QualityPreference): EditorQualityResolved {
  const tier: QualityTier = preference === "auto" ? detectQualityTier() : preference;
  switch (tier) {
    case "low":
      return {
        tier,
        contactShadowResolution: 128,
        contactShadowBlur: 1,
        showBloom: false,
        showVignette: true,
        pixelRatio: 1,
      };
    case "medium":
      return {
        tier,
        contactShadowResolution: 256,
        contactShadowBlur: 2,
        showBloom: true,
        showVignette: true,
        pixelRatio: clampPixelRatio("medium"),
      };
    default:
      return {
        tier: "high",
        contactShadowResolution: 384,
        contactShadowBlur: 2.5,
        showBloom: true,
        showVignette: true,
        pixelRatio: clampPixelRatio("high"),
      };
  }
}

/** Memoized quality profile for the 3D editor (contact shadows, bloom, DPR cap). */
export function useQualitySettings(preference: QualityPreference): EditorQualityResolved {
  return useMemo(() => resolveEditorQuality(preference), [preference]);
}

export function readStoredQualityPreference(): QualityPreference {
  try {
    const v = localStorage.getItem(DEXO_QUALITY_STORAGE_KEY);
    if (v === "auto" || v === "high" || v === "medium" || v === "low") return v;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function persistQualityPreference(p: QualityPreference): void {
  try {
    localStorage.setItem(DEXO_QUALITY_STORAGE_KEY, p);
  } catch {
    /* ignore */
  }
}

export function cycleQualityPreference(current: QualityPreference): QualityPreference {
  const order: QualityPreference[] = ["auto", "high", "medium", "low"];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}
