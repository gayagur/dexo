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
const FAL_MODEL = "fal-ai/trellis";
const TIMEOUT_MS = 180_000;

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

    const falKey = Deno.env.get("FAL_KEY");
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!falKey) {
      return new Response(
        JSON.stringify({ error: "3D generation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-3d] Starting parallel 3D generation + part analysis");

    // ─── Upload base64 image to storage if needed ───
    let publicImageUrl = imageUrl;
    if (imageUrl.startsWith("data:")) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const imagePath = `3d-inputs/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("project-images")
        .upload(imagePath, imageBuffer, { contentType: "image/jpeg", upsert: false });
      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Failed to upload image for processing" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: urlData } = supabase.storage.from("project-images").getPublicUrl(imagePath);
      publicImageUrl = urlData.publicUrl;
      console.log("[generate-3d] Image uploaded to:", publicImageUrl);
    }

    // ═══════════════════════════════════════════════════════════
    // Run BOTH in parallel:
    //   1. FAL.ai Trellis → 3D mesh (GLB)
    //   2. Together.ai Vision → part segmentation (panels JSON)
    // ═══════════════════════════════════════════════════════════

    const meshPromise = generate3DMesh(falKey, publicImageUrl);
    const partsPromise = togetherApiKey
      ? analyzePartsFromImage(togetherApiKey, publicImageUrl)
      : Promise.resolve(null);

    const [meshResult, partsResult] = await Promise.allSettled([meshPromise, partsPromise]);

    // ─── Process mesh result ───
    let publicGlbUrl: string | undefined;
    if (meshResult.status === "fulfilled" && meshResult.value) {
      // Download and upload GLB to Supabase storage
      const glbResp = await fetch(meshResult.value);
      if (glbResp.ok) {
        const glbBuffer = new Uint8Array(await glbResp.arrayBuffer());
        console.log("[generate-3d] GLB downloaded, size:", glbBuffer.length, "bytes");

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
      }
    } else {
      console.error("[generate-3d] Mesh generation failed:",
        meshResult.status === "rejected" ? meshResult.reason : "no URL");
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
      console.warn("[generate-3d] Part analysis failed or skipped:",
        partsResult.status === "rejected" ? partsResult.reason : "no result");
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
      model: FAL_MODEL,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0.06,
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
// 3D Mesh Generation (FAL.ai Trellis)
// ═══════════════════════════════════════════════════════════

async function generate3DMesh(falKey: string, imageUrl: string): Promise<string> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const submitResp = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!submitResp.ok) {
      const errText = await submitResp.text();
      throw new Error(`FAL submit failed: ${submitResp.status} ${errText.slice(0, 200)}`);
    }

    const submitResult = await submitResp.json();
    const requestId = submitResult.request_id;

    if (!requestId) {
      return extractGlbUrl(submitResult);
    }

    console.log("[generate-3d] FAL queued, request_id:", requestId);
    return await pollForResult(falKey, requestId, ac.signal);
  } finally {
    clearTimeout(timer);
  }
}

function extractGlbUrl(result: Record<string, unknown>): string {
  if (result.model_mesh && typeof result.model_mesh === "object") {
    const mesh = result.model_mesh as Record<string, unknown>;
    if (typeof mesh.url === "string") return mesh.url;
  }
  if (typeof result.glb_url === "string") return result.glb_url;
  if (typeof result.mesh_url === "string") return result.mesh_url;
  if (result.output && typeof result.output === "object") {
    return extractGlbUrl(result.output as Record<string, unknown>);
  }
  if (result.mesh && typeof result.mesh === "object") {
    const mesh = result.mesh as Record<string, unknown>;
    if (typeof mesh.url === "string") return mesh.url;
  }
  throw new Error("No GLB URL in FAL response");
}

async function pollForResult(falKey: string, requestId: string, signal: AbortSignal): Promise<string> {
  const statusUrl = `https://queue.fal.run/${FAL_MODEL}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${FAL_MODEL}/requests/${requestId}`;

  while (!signal.aborted) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusResp = await fetch(statusUrl, {
      headers: { "Authorization": `Key ${falKey}` },
      signal,
    });
    if (!statusResp.ok) continue;
    const status = await statusResp.json();
    console.log("[generate-3d] FAL job status:", status.status);

    if (status.status === "COMPLETED") {
      const resultResp = await fetch(resultUrl, {
        headers: { "Authorization": `Key ${falKey}` },
        signal,
      });
      if (!resultResp.ok) throw new Error(`Failed to fetch result: ${resultResp.status}`);
      const result = await resultResp.json();
      return extractGlbUrl(result);
    }
    if (status.status === "FAILED") {
      throw new Error(`3D generation failed: ${status.error || "Unknown"}`);
    }
  }
  throw new Error("3D generation timed out");
}

// ═══════════════════════════════════════════════════════════
// Part Analysis (Together.ai Vision — same as analyze-furniture)
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

      if (!response.ok) {
        console.warn(`[generate-3d] Vision ${model} failed: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "";
      if (result.choices?.[0]?.finish_reason === "length") {
        console.warn(`[generate-3d] Vision ${model} truncated`);
        continue;
      }

      if (!content) continue;

      const parsed = parseFurnitureAnalysisFromLlmText(content);
      if (!parsed.ok) {
        console.warn("[generate-3d] Failed to parse vision response");
        continue;
      }

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
