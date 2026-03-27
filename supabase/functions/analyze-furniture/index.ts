import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { FURNITURE_ANALYSIS_PROMPT } from "../_shared/furnitureAnalysisPrompt.ts";

// Faster models first — avoids gateway timeouts; heavy model last as fallback
const VISION_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "moonshotai/Kimi-K2.5",
  "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
];
/** Abort one Together attempt so a slow/hung model does not burn the whole function budget */
const PER_MODEL_MS = 75_000;
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
        try {
          response = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            signal: ac.signal,
            headers: {
              "Authorization": `Bearer ${togetherApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: FURNITURE_ANALYSIS_PROMPT },
                    { type: "image_url", image_url: { url: imageUrl } },
                  ],
                },
              ],
              max_tokens: 4096,
              temperature: 0.2,
            }),
          });
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
        console.log(`Model ${model} succeeded. Content length: ${content.length}`);
        console.log("Preview:", content.slice(0, 300));

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

    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    let analysisJson: string = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      analysisJson = jsonMatch[1].trim();
    } else {
      // Try to find raw JSON object
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        analysisJson = braceMatch[0];
      }
    }

    let analysis;
    try {
      analysis = JSON.parse(analysisJson);
    } catch (parseErr) {
      console.error("Failed to parse AI response as JSON. Raw content:", content);
      console.error("Extracted JSON attempt:", analysisJson.slice(0, 500));
      console.error("Parse error:", parseErr);
      return new Response(
        JSON.stringify({ error: "AI returned invalid format. Please try a different image." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the structure
    if (!analysis.panels || !Array.isArray(analysis.panels)) {
      return new Response(
        JSON.stringify({ error: "AI analysis did not include furniture components." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log usage
    logUsage({
      userId,
      functionName: "analyze-furniture",
      model: usedModel,
      tokensIn: 0,
      tokensOut: Math.ceil(content.length / 4),
      costUsd: 0.01,
    }).catch((err) => console.error("Usage log failed:", err));

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Missing Authorization") || message.includes("Invalid") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
