/**
 * DEXO — Luxury animation tokens.
 * Single source of truth for timing, easing, and reusable variants.
 * Vibe: Restoration Hardware / Minotti — slow, intentional, confident.
 */

export const EASE = {
  luxury: [0.25, 0.1, 0.25, 1] as const,
  entrance: [0.0, 0.0, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  soft: [0.43, 0.13, 0.23, 0.96] as const,
};

export const DURATION = {
  fast: 0.2,
  normal: 0.45,
  slow: 0.7,
  verySlow: 1.1,
};

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.entrance },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASE.luxury },
  },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

export const staggerContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.slow, ease: EASE.soft },
  },
};

/** Section divider — line draws from left */
export const lineDrawVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, ease: EASE.entrance },
  },
};
