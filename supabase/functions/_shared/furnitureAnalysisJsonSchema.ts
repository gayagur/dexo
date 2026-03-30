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
                description: "Center x,y,z in METERS (e.g. seat at y=0.42 NOT 420)",
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
                description: "Radians [rx,ry,rz]; prefer [0,0,0] unless clear tilt in photo",
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

/** Models confirmed for JSON schema + vision in Together docs (Mar 2025+). */
export const VISION_MODELS_SUPPORTING_JSON_SCHEMA = new Set<string>([
  "Qwen/Qwen3-VL-8B-Instruct",
  "moonshotai/Kimi-K2.5",
]);
