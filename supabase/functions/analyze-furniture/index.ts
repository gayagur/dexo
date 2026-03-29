import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { FURNITURE_ANALYSIS_PROMPT } from "../_shared/furnitureAnalysisPrompt.ts";
import { parseFurnitureAnalysisFromLlmText } from "../_shared/extractFurnitureAnalysisJson.ts";
import {
  FURNITURE_ANALYSIS_RESPONSE_FORMAT,
  VISION_MODELS_SUPPORTING_JSON_SCHEMA,
} from "../_shared/furnitureAnalysisJsonSchema.ts";

// Fast model first to avoid edge function timeout; stronger models as fallback
const VISION_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "moonshotai/Kimi-K2.5",
  "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
];
/** Per-model timeout — must leave room for fallbacks within edge function's ~150s limit */
const PER_MODEL_MS = 45_000;
const DAILY_LIMIT = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await verifyAuth(req);
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit
    const todayCount = await getDailyUsageCount(userId, "analyze-furniture");
    if (todayCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daily analysis limit reached (20/day). Try again tomorrow." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try vision models in order until one works
    let content = "";
    let usedModel = VISION_MODELS[0];
    let lastError = "";

    for (const model of VISION_MODELS) {
      console.log(`Trying vision model: ${model}`);
      usedModel = model;

      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), PER_MODEL_MS);
        let response: Response;
        const messages = [
          {
            role: "user" as const,
            content: [
              { type: "text" as const, text: FURNITURE_ANALYSIS_PROMPT },
              { type: "image_url" as const, image_url: { url: imageUrl } },
            ],
          },
        ];

        const basePayload = {
          model,
          messages,
          max_tokens: 8192,
          temperature: 0.15,
        };

        const useSchema = VISION_MODELS_SUPPORTING_JSON_SCHEMA.has(model);

        try {
          response = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            signal: ac.signal,
            headers: {
              "Authorization": `Bearer ${togetherApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              useSchema
                ? { ...basePayload, response_format: FURNITURE_ANALYSIS_RESPONSE_FORMAT }
                : basePayload,
            ),
          });

          if (!response.ok && useSchema && response.status === 400) {
            const err400 = await response.text();
            console.warn(`${model}: JSON schema request rejected (${err400.slice(0, 160)}), retrying without schema`);
            response = await fetch("https://api.together.xyz/v1/chat/completions", {
              method: "POST",
              signal: ac.signal,
              headers: {
                "Authorization": `Bearer ${togetherApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(basePayload),
            });
          }
        } finally {
          clearTimeout(timer);
        }

        if (!response.ok) {
          const errText = await response.text();
          lastError = `${model}: ${response.status} - ${errText.slice(0, 200)}`;
          console.error("Vision model failed:", lastError);
          continue; // Try next model
        }

        const result = await response.json();
        content = result.choices?.[0]?.message?.content || "";
        const finishReason = result.choices?.[0]?.finish_reason;
        console.log(`Model ${model} succeeded. Content length: ${content.length} finish_reason=${finishReason}`);
        console.log("Preview:", content.slice(0, 300));
        if (finishReason === "length") {
          console.warn(`Model ${model} hit max_tokens; JSON may be truncated — trying next model`);
          lastError = `${model}: truncated (length)`;
          continue;
        }

        if (content) break; // Success - stop trying
      } catch (err) {
        lastError = `${model}: ${(err as Error).message}`;
        console.error("Vision model exception:", lastError);
        continue;
      }
    }

    if (!content) {
      return new Response(
        JSON.stringify({ error: `All vision models failed. Last error: ${lastError}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseFurnitureAnalysisFromLlmText(content);
    if (!parsed.ok) {
      console.error("Failed to parse AI response as JSON. Raw tail:", content.slice(-800));
      console.error("Raw head:", content.slice(0, 400));
      return new Response(
        JSON.stringify({ error: "AI returned invalid format. Please try a different image." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const raw = parsed.data as Record<string, unknown>;
    const panelsRaw =
      Array.isArray(raw.panels)
        ? raw.panels
        : Array.isArray(raw.components)
          ? raw.components
          : Array.isArray(raw.parts)
            ? raw.parts
            : null;

    if (!panelsRaw || panelsRaw.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI analysis did not include furniture components." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = { ...raw, panels: panelsRaw };

    // Log usage
    logUsage({
      userId,
      functionName: "analyze-furniture",
      model: usedModel,
      tokensIn: 0,
      tokensOut: Math.ceil(content.length / 4),
      costUsd: 0.01,
    }).catch((err) => console.error("Usage log failed:", err));

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Missing Authorization") || message.includes("Invalid") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
