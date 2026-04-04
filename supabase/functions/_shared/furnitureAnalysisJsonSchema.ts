/**
 * OpenAI structured output for analyze-furniture (JSON mode).
 * gpt-4o and gpt-4o-mini both support response_format: { type: "json_object" }.
 */

export const FURNITURE_ANALYSIS_RESPONSE_FORMAT = {
  type: "json_object" as const,
};

/** Models that support JSON mode via response_format. */
export const VISION_MODELS_SUPPORTING_JSON_SCHEMA = new Set<string>([
  "gpt-4o",
  "gpt-4o-mini",
]);
