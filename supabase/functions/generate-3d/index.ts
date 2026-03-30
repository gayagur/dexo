/**
 * generate-3d — Original AI decomposition pipeline (restored from bd487a9).
 *
 * This is the ORIGINAL simple pipeline:
 *   Image → Vision model → JSON with panels → return to frontend
 *
 * No external 3D generation APIs needed. Just a vision model that
 * decomposes the furniture image into geometric components.
 *
 * Models: uses Together.ai vision models (Qwen, Kimi).
 * Can be swapped for any vision model that accepts images.
 */

import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";

const VISION_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "moonshotai/Kimi-K2.5",
];
const PER_MODEL_MS = 50_000;
const DAILY_LIMIT = 20;

/** The original simple prompt from bd487a9 — no shared modules needed */
const ANALYSIS_PROMPT = `You are a furniture analysis AI. Analyze this image of a furniture piece and break it down into simple 3D components that can be recreated in a furniture editor.

For each component, output a JSON object with:
- label: descriptive name (e.g. "Tabletop", "Left Leg", "Back Panel", "Shelf 1")
- type: "horizontal" (shelves, seats, tops), "vertical" (sides, backs, legs), or "back" (back panels)
- shape: one of: box, cylinder, sphere, cone, rounded_rect, circle_panel, oval, cushion, cushion_firm, padded_block, mattress, tapered_leg, cabriole_leg, x_base, pedestal, square_leg, plinth, bar_handle, knob, drawer_box, caster, arc, torus, tube
- position: [x, y, z] in meters, centered at origin. Y=0 is the floor. Positive Y is up.
- size: [width, height, depth] in meters
- materialId: best match from: oak, walnut, pine, cherry, maple, birch, plywood, mdf, melamine_white, melamine_black, melamine_cream, black_metal, steel, brass, chrome, gold, copper, glass, leather_brown, leather_black, leather_tan, fabric_gray, fabric_cream, fabric_beige, fabric_charcoal, fabric_brown, fabric_blue, fabric_green, fabric_sage, fabric_taupe, velvet_navy, cane_natural, marble_white, concrete

CRITICAL RULES:
- Estimate realistic dimensions based on the furniture type
- Position components relative to each other so they form the complete piece
- Use "cushion" shape for soft puffy parts, "cushion_firm" for structured upholstery, "padded_block" for boxy padded parts
- Use "cylinder" for round legs, "tapered_leg" for tapered legs
- Y position is the CENTER of each component, not the bottom
- Legs bottom at Y ≈ leg_height / 2
- Include ALL visible components: top, sides, shelves, legs, backs, cushions, pillows, handles
- LOOK at the colors in the image and pick the closest materialId
- Output 5-20 components typically

Respond with ONLY a JSON object in this exact format, no other text:
{
  "name": "Furniture Name",
  "estimatedDims": { "w": 1200, "h": 750, "d": 600 },
  "panels": [
    { "label": "...", "type": "...", "shape": "box", "position": [0, 0, 0], "size": [0, 0, 0], "materialId": "..." }
  ]
}

estimatedDims are in millimeters. positions and sizes in the panels array are in meters.`;

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

    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try vision models in order
    let content = "";
    let usedModel = VISION_MODELS[0];
    let lastError = "";

    for (const model of VISION_MODELS) {
      console.log(`[generate-3d] Trying: ${model}`);
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
                  { type: "text", text: ANALYSIS_PROMPT },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              }],
              max_tokens: 4096,
              temperature: 0.2,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            lastError = `${model}: ${response.status} - ${errText.slice(0, 200)}`;
            console.warn("[generate-3d]", lastError);
            continue;
          }

          const result = await response.json();
          content = result.choices?.[0]?.message?.content || "";

          if (result.choices?.[0]?.finish_reason === "length") {
            console.warn(`[generate-3d] ${model} truncated`);
            lastError = `${model}: truncated`;
            continue;
          }

          if (content) break;
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastError = `${model}: ${(err as Error).message}`;
        console.warn("[generate-3d]", lastError);
        continue;
      }
    }

    if (!content) {
      return new Response(
        JSON.stringify({ error: `All vision models failed. Last: ${lastError}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JSON (may be wrapped in markdown)
    let jsonStr = content;
    const mdMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch) {
      jsonStr = mdMatch[1].trim();
    } else {
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) jsonStr = braceMatch[0];
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("[generate-3d] JSON parse failed. Content:", content.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI returned invalid format. Try a different image." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!analysis.panels || !Array.isArray(analysis.panels)) {
      return new Response(
        JSON.stringify({ error: "AI analysis did not include furniture components." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-3d] Success: ${analysis.name} (${analysis.panels.length} panels)`);

    logUsage({
      userId,
      functionName: "generate-3d",
      model: usedModel,
      tokensIn: 0,
      tokensOut: Math.ceil(content.length / 4),
      costUsd: 0.01,
    }).catch(() => {});

    // Return in the same format as analyze-furniture for compatibility
    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: message.includes("Authorization") ? 401 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
