/**
 * Together.ai structured output for analyze-furniture (JSON Schema mode).
 * @see https://docs.together.ai/docs/json-mode — Qwen3-VL-8B and Kimi K2.5 support this with vision.
 */

export const FURNITURE_ANALYSIS_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "furniture_analysis",
    schema: {
      type: "object",
      additionalProperties: true,
      required: ["name", "estimatedDims", "panels"],
      properties: {
        name: { type: "string", description: "Short furniture name in English" },
        estimatedDims: {
          type: "object",
          additionalProperties: false,
          required: ["w", "h", "d"],
          properties: {
            w: { type: "number", description: "Width in mm" },
            h: { type: "number", description: "Height in mm" },
            d: { type: "number", description: "Depth in mm" },
          },
        },
        panels: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: true,
            required: ["label", "type", "shape", "position", "size", "materialId"],
            properties: {
              label: { type: "string" },
              type: { type: "string", enum: ["horizontal", "vertical", "back"] },
              shape: { type: "string" },
              position: {
                type: "array",
                description:
                  "Center x,y,z in METERS relative to furniture center [0,0,0]. Y is UP. Each part MUST have a unique position — e.g. seat [0,0.42,0], backrest [0,0.72,-0.22], left arm [-0.28,0.55,0]. NEVER use [0,0,0] for all parts.",
                items: { type: "number" },
                minItems: 3,
                maxItems: 3,
              },
              size: {
                type: "array",
                description: "width,height,depth in METERS (e.g. slat [0.048,0.02,1.9] NOT mm)",
                items: { type: "number" },
                minItems: 3,
                maxItems: 3,
              },
              materialId: { type: "string" },
              shapeParams: { type: "object", additionalProperties: { type: "number" } },
              rotation: {
                type: "array",
                description:
                  "Euler XYZ in RADIANS only (not degrees). Prefer [0,0,0]. Small tilts ~0.1–0.25; never use 30,90,180 as values (those are degrees).",
                items: { type: "number" },
                minItems: 3,
                maxItems: 3,
              },
              cornerRadius: { type: "number" },
            },
          },
        },
      },
    },
  },
} as const;

/** Models confirmed for JSON schema + vision in Together docs. */
export const VISION_MODELS_SUPPORTING_JSON_SCHEMA = new Set<string>([
  "Qwen/Qwen3.5-9B",
  "Qwen/Qwen3.5-397B-A17B",
  "Qwen/Qwen3-VL-8B-Instruct",
  "moonshotai/Kimi-K2.5",
]);
