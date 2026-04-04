/**
 * generate-3d — EXACT copy of analyze-furniture from commit 442e15e.
 * Uses shared prompt, JSON schema, robust parsing.
 * Only change: removed deprecated Llama-3.2-90B model.
 */
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { FURNITURE_ANALYSIS_PROMPT } from "../_shared/furnitureAnalysisPrompt.ts";
import { parseFurnitureAnalysisFromLlmText } from "../_shared/extractFurnitureAnalysisJson.ts";
import {
  FURNITURE_ANALYSIS_RESPONSE_FORMAT,
  VISION_MODELS_SUPPORTING_JSON_SCHEMA,
} from "../_shared/furnitureAnalysisJsonSchema.ts";

const VISION_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
];
const PER_MODEL_MS = 90_000;
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

    const todayCount = await getDailyUsageCount(userId, "generate-3d");
    if (todayCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daily limit reached (20/day)." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let content = "";
    let usedModel = VISION_MODELS[0];
    let lastError = "";
    let timedOut = false;

    for (const model of VISION_MODELS) {
      console.log(`[generate-3d] Trying: ${model}`);
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
          max_tokens: 4096,
          temperature: 0.2,
        };

        const useSchema = VISION_MODELS_SUPPORTING_JSON_SCHEMA.has(model);

        try {
          response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            signal: ac.signal,
            headers: {
              "Authorization": `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              useSchema
                ? { ...basePayload, response_format: FURNITURE_ANALYSIS_RESPONSE_FORMAT }
                : basePayload,
            ),
          });

          if (!response.ok && useSchema && response.status === 400) {
            console.warn(`${model}: schema rejected, retrying without`);
            response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              signal: ac.signal,
              headers: {
                "Authorization": `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(basePayload),
            });
          }
        } finally {
          clearTimeout(timer);
        }

        if (!response.ok) {
          lastError = `${model}: ${response.status}`;
          console.warn("[generate-3d]", lastError);
          continue;
        }

        const result = await response.json();
        content = result.choices?.[0]?.message?.content || "";
        const finishReason = result.choices?.[0]?.finish_reason;
        console.log(`[generate-3d] ${model} ok. len=${content.length} finish=${finishReason}`);

        if (finishReason === "length") {
          lastError = `${model}: truncated`;
          continue;
        }
        if (content) break;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          timedOut = true;
          lastError = `${model}: timed out after ${Math.round(PER_MODEL_MS / 1000)}s`;
          console.warn("[generate-3d]", lastError);
          continue;
        }
        lastError = `${model}: ${(err as Error).message}`;
        continue;
      }
    }

    if (!content) {
      const errorMessage = timedOut
        ? `All models timed out while analyzing the image. Last error: ${lastError}. Try a smaller / simpler image or retry in a moment.`
        : `All models failed. ${lastError}`;
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseFurnitureAnalysisFromLlmText(content);
    if (!parsed.ok) {
      console.error("[generate-3d] Parse failed. Head:", content.slice(0, 400));
      return new Response(
        JSON.stringify({ error: "AI returned invalid format." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = parsed.data as Record<string, unknown>;
    const panelsRaw = Array.isArray(raw.panels) ? raw.panels
      : Array.isArray(raw.components) ? raw.components
      : Array.isArray(raw.parts) ? raw.parts : null;

    if (!panelsRaw || panelsRaw.length === 0) {
      return new Response(
        JSON.stringify({ error: "No furniture components found." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = { ...raw, panels: panelsRaw };

    logUsage({
      userId, functionName: "generate-3d", model: usedModel,
      tokensIn: 0, tokensOut: Math.ceil(content.length / 4), costUsd: 0.01,
    }).catch(() => {});

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: message.includes("Authorization") ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
