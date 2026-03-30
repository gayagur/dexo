import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { FURNITURE_CLASSIFICATION_PROMPT } from "../_shared/furnitureClassificationPrompt.ts";

const VISION_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "moonshotai/Kimi-K2.5",
];
const PER_MODEL_MS = 45_000;
const DAILY_LIMIT = 30; // Classification is cheap

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

    const todayCount = await getDailyUsageCount(userId, "classify-furniture");
    if (todayCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daily limit reached. Try again tomorrow." }),
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

    let content = "";
    let usedModel = VISION_MODELS[0];

    for (const model of VISION_MODELS) {
      console.log(`[classify] Trying: ${model}`);
      usedModel = model;

      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), PER_MODEL_MS);

        try {
          const response = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            signal: ac.signal,
            headers: {
              "Authorization": `Bearer ${togetherApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: FURNITURE_CLASSIFICATION_PROMPT },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              }],
              max_tokens: 1024, // Classification is short
              temperature: 0.1,
            }),
          });

          if (!response.ok) {
            console.warn(`[classify] ${model} failed: ${response.status}`);
            continue;
          }

          const result = await response.json();
          content = result.choices?.[0]?.message?.content || "";
          if (result.choices?.[0]?.finish_reason === "length") {
            console.warn(`[classify] ${model} truncated`);
            continue;
          }
          if (content) break;
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        console.warn(`[classify] ${model} error:`, (err as Error).message);
        continue;
      }
    }

    if (!content) {
      return new Response(
        JSON.stringify({ error: "All vision models failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response
    let parsed: Record<string, unknown> | null = null;
    try {
      // Try direct parse
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
      }
    }

    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "AI returned invalid format" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[classify] Result:`, JSON.stringify(parsed).slice(0, 300));

    logUsage({
      userId,
      functionName: "classify-furniture",
      model: usedModel,
      tokensIn: 0,
      tokensOut: Math.ceil(content.length / 4),
      costUsd: 0.005,
    }).catch(() => {});

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Authorization") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
