import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { FURNITURE_ANALYSIS_PROMPT } from "../_shared/furnitureAnalysisPrompt.ts";
import { parseFurnitureAnalysisFromLlmText } from "../_shared/extractFurnitureAnalysisJson.ts";
import {
  FURNITURE_ANALYSIS_RESPONSE_FORMAT,
  VISION_MODELS_SUPPORTING_JSON_SCHEMA,
} from "../_shared/furnitureAnalysisJsonSchema.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const DAILY_LIMIT = 10;
const TIMEOUT_MS = 120_000;

/** Vision models for parallel part analysis */
const VISION_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "moonshotai/Kimi-K2.5",
];
const VISION_TIMEOUT_MS = 60_000;

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
        JSON.stringify({ error: "Daily 3D generation limit reached (10/day)." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stabilityKey = Deno.env.get("STABILITY_API_KEY");
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");

    if (!stabilityKey) {
      return new Response(
        JSON.stringify({ error: "3D generation service not configured (missing STABILITY_API_KEY)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-3d] Starting parallel 3D generation + part analysis");

    // ─── Download image bytes (needed for Stability multipart upload) ───
    let imageBytes: Uint8Array;
    if (imageUrl.startsWith("data:")) {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    } else {
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch source image" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      imageBytes = new Uint8Array(await imgResp.arrayBuffer());
    }
    console.log("[generate-3d] Image size:", imageBytes.length, "bytes");

    // Upload image to Supabase for the vision analysis (needs a public URL)
    let publicImageUrl = imageUrl;
    if (imageUrl.startsWith("data:") && togetherApiKey) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const imagePath = `3d-inputs/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("project-images")
        .upload(imagePath, imageBytes, { contentType: "image/jpeg", upsert: false });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("project-images").getPublicUrl(imagePath);
        publicImageUrl = urlData.publicUrl;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Run BOTH in parallel:
    //   1. Stability AI Stable Fast 3D → GLB mesh
    //   2. Together.ai Vision → part segmentation
    // ═══════════════════════════════════════════════════════════

    const meshPromise = generateStability3D(stabilityKey, imageBytes);
    const partsPromise = togetherApiKey
      ? analyzePartsFromImage(togetherApiKey, publicImageUrl)
      : Promise.resolve(null);

    const [meshResult, partsResult] = await Promise.allSettled([meshPromise, partsPromise]);

    // ─── Process mesh result ───
    let publicGlbUrl: string | undefined;
    if (meshResult.status === "fulfilled" && meshResult.value) {
      const glbBuffer = meshResult.value;
      console.log("[generate-3d] GLB received, size:", glbBuffer.length, "bytes");

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const glbPath = `generated-models/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.glb`;
      const { error: glbUploadErr } = await supabase.storage
        .from("project-images")
        .upload(glbPath, glbBuffer, { contentType: "model/gltf-binary", upsert: false });

      if (!glbUploadErr) {
        const { data: glbUrlData } = supabase.storage.from("project-images").getPublicUrl(glbPath);
        publicGlbUrl = glbUrlData.publicUrl;
        console.log("[generate-3d] GLB stored at:", publicGlbUrl);
      } else {
        console.error("[generate-3d] GLB upload failed:", glbUploadErr);
      }
    } else {
      console.error("[generate-3d] 3D generation failed:",
        meshResult.status === "rejected" ? meshResult.reason : "no data");
    }

    // ─── Process parts result ───
    let analysis: Record<string, unknown> | null = null;
    if (partsResult.status === "fulfilled" && partsResult.value) {
      analysis = partsResult.value;
      console.log("[generate-3d] Part analysis completed:",
        (analysis as { name?: string }).name,
        Array.isArray((analysis as { panels?: unknown[] }).panels)
          ? `${((analysis as { panels: unknown[] }).panels).length} parts`
          : "no parts");
    } else {
      console.warn("[generate-3d] Part analysis failed or skipped");
    }

    // ─── Build response ───
    if (!publicGlbUrl && !analysis) {
      return new Response(
        JSON.stringify({ error: "Both 3D generation and part analysis failed." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logUsage({
      userId,
      functionName: "generate-3d",
      model: "stability-stable-fast-3d",
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0.04,
    }).catch((err) => console.error("Usage log failed:", err));

    return new Response(
      JSON.stringify({
        glbUrl: publicGlbUrl ?? null,
        analysis: analysis ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-3d] Error:", message);
    const status = message.includes("Authorization") || message.includes("Invalid") ? 401
      : message.includes("aborted") ? 504 : 500;
    return new Response(
      JSON.stringify({ error: status === 504 ? "3D generation timed out." : message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══════════════════════════════════════════════════════════
// 3D Mesh Generation — Stability AI Stable Fast 3D
// Returns GLB as Uint8Array directly (no URL indirection)
// ═══════════════════════════════════════════════════════════

async function generateStability3D(apiKey: string, imageBytes: Uint8Array): Promise<Uint8Array> {
  console.log("[generate-3d] Calling Stability AI Stable Fast 3D...");

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    // Stability API requires multipart form-data with image file
    const formData = new FormData();
    formData.append("image", new Blob([imageBytes], { type: "image/jpeg" }), "input.jpg");
    // Request GLB output
    formData.append("texture_resolution", "1024");
    formData.append("foreground_ratio", "0.85");

    const response = await fetch("https://api.stability.ai/v2beta/3d/stable-fast-3d", {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Stability API ${response.status}: ${errText.slice(0, 200)}`);
    }

    // Response IS the GLB binary directly
    const buffer = new Uint8Array(await response.arrayBuffer());
    console.log("[generate-3d] Stability AI returned", buffer.length, "bytes");
    return buffer;
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════════════
// Part Analysis (Together.ai Vision)
// ═══════════════════════════════════════════════════════════

async function analyzePartsFromImage(
  togetherApiKey: string,
  imageUrl: string,
): Promise<Record<string, unknown> | null> {
  for (const model of VISION_MODELS) {
    console.log("[generate-3d] Trying vision model for parts:", model);
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), VISION_TIMEOUT_MS);

      const messages = [{
        role: "user" as const,
        content: [
          { type: "text" as const, text: FURNITURE_ANALYSIS_PROMPT },
          { type: "image_url" as const, image_url: { url: imageUrl } },
        ],
      }];

      const basePayload = { model, messages, max_tokens: 4096, temperature: 0.2 };
      const useSchema = VISION_MODELS_SUPPORTING_JSON_SCHEMA.has(model);

      let response: Response;
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

      if (!response.ok) continue;

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "";
      if (result.choices?.[0]?.finish_reason === "length") continue;
      if (!content) continue;

      const parsed = parseFurnitureAnalysisFromLlmText(content);
      if (!parsed.ok) continue;

      const raw = parsed.data as Record<string, unknown>;
      const panels = Array.isArray(raw.panels) ? raw.panels
        : Array.isArray(raw.components) ? raw.components
        : Array.isArray(raw.parts) ? raw.parts : null;

      if (!panels || panels.length === 0) continue;
      return { ...raw, panels };
    } catch (err) {
      console.warn(`[generate-3d] Vision ${model} error:`, (err as Error).message);
      continue;
    }
  }
  return null;
}
