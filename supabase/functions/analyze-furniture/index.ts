import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";

// Try multiple vision models in order of preference
const VISION_MODELS = [
  "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
  "moonshotai/Kimi-K2.5",
  "Qwen/Qwen3-VL-8B-Instruct",
];
const DAILY_LIMIT = 20;

const ANALYSIS_PROMPT = `You are a furniture analysis AI. Analyze this image of a furniture piece and break it down into simple 3D components that can be recreated in a furniture editor.

For each component, output a JSON object with:
- label: descriptive name (e.g. "Tabletop", "Left Leg", "Back Panel", "Shelf 1")
- type: "horizontal" (shelves, seats, tops), "vertical" (sides, backs, legs), or "back" (back panels)
- shape: "box" for rectangular parts, "cylinder" for round legs/rods
- position: [x, y, z] in meters, centered at origin. Y=0 is the floor. Positive Y is up.
- size: [width, height, depth] in meters
- materialId: best match from: oak, walnut, pine, cherry, maple, birch, plywood, mdf, melamine_white, melamine_black, black_metal, steel, brass, chrome, glass

CRITICAL RULES:
- Estimate realistic dimensions based on the furniture type (e.g. dining table ~0.75m tall, chair seat ~0.45m)
- Position components relative to each other so they form the complete piece
- Use "cylinder" shape for round legs, rods, and tubes
- All positions are in meters from the center. The furniture should be centered at X=0, Z=0
- Y position is the CENTER of each component, not the bottom
- Include ALL visible components: top, sides, shelves, legs, backs, doors, drawers, handles
- Output 5-20 components typically

Respond with ONLY a JSON object in this exact format, no other text:
{
  "name": "Furniture Name",
  "estimatedDims": { "w": 1200, "h": 750, "d": 600 },
  "panels": [
    { "label": "...", "type": "...", "shape": "box", "position": [0, 0, 0], "size": [0, 0, 0], "materialId": "..." },
    ...
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
        const response = await fetch("https://api.together.xyz/v1/chat/completions", {
          method: "POST",
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
                  { type: "text", text: ANALYSIS_PROMPT },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            max_tokens: 4096,
            temperature: 0.3,
          }),
        });

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
