import type { Project, Business } from './database.types';

export interface ScoredBusiness {
  business: Business;
  score: number;
}

/**
 * Scores how well a business matches a project (0–100).
 *
 * Breakdown:
 * - Category match: 40pts (business.categories includes project.category)
 * - Style overlap: 30pts (Jaccard similarity between style arrays)
 * - Budget fit: 20pts (price range overlap)
 * - Recency: 10pts (how recently the project was created)
 */
export function scoreMatch(project: Project, business: Business): number {
  let score = 0;

  // Category match (40 pts)
  const categoryMatch = business.categories.some(
    (c) => c.toLowerCase() === project.category.toLowerCase()
  );
  if (categoryMatch) score += 40;

  // Style overlap (30 pts) — Jaccard similarity
  const projectStyles = new Set(project.style_tags.map((s) => s.toLowerCase()));
  const businessStyles = new Set(business.styles.map((s) => s.toLowerCase()));
  if (projectStyles.size > 0 && businessStyles.size > 0) {
    const intersection = [...projectStyles].filter((s) => businessStyles.has(s)).length;
    const union = new Set([...projectStyles, ...businessStyles]).size;
    score += Math.round((intersection / union) * 30);
  }

  // Budget fit (20 pts)
  if (business.min_price != null && business.max_price != null) {
    const overlapStart = Math.max(project.budget_min, business.min_price);
    const overlapEnd = Math.min(project.budget_max, business.max_price);
    if (overlapStart <= overlapEnd) {
      // Ranges overlap — score based on degree of overlap
      const overlapSize = overlapEnd - overlapStart;
      const projectRange = project.budget_max - project.budget_min || 1;
      const ratio = Math.min(overlapSize / projectRange, 1);
      score += Math.round(ratio * 20);
    }
    // No overlap → 0 pts
  } else {
    // Business has no price info → neutral score
    score += 10;
  }

  // Recency (10 pts)
  const daysAgo =
    (Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 7) score += 10;
  else if (daysAgo <= 14) score += 5;
  else score += 2;

  return Math.min(score, 100);
}

export function rankBusinesses(
  project: Project,
  businesses: Business[]
): ScoredBusiness[] {
  return businesses
    .map((business) => ({
      business,
      score: scoreMatch(project, business),
    }))
    .sort((a, b) => b.score - a.score);
}
