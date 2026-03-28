import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const DAILY_LIMIT = 10;
/** FAL.ai Trellis: high-quality image-to-3D (outputs GLB) */
const FAL_MODEL = "fal-ai/trellis";
/** Timeout for the 3D generation job (3 minutes — these take a while) */
const TIMEOUT_MS = 180_000;

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
    const todayCount = await getDailyUsageCount(userId, "generate-3d");
    if (todayCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daily 3D generation limit reached (10/day). Try again tomorrow." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const falKey = Deno.env.get("FAL_KEY");
    if (!falKey) {
      return new Response(
        JSON.stringify({ error: "3D generation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-3d] Starting 3D generation for user:", userId);

    // ─── Step 1: If image is base64 data URL, upload to Supabase storage first ───
    let publicImageUrl = imageUrl;
    if (imageUrl.startsWith("data:")) {
      console.log("[generate-3d] Image is base64, uploading to storage...");
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
        console.error("[generate-3d] Image upload failed:", uploadErr);
        return new Response(
          JSON.stringify({ error: "Failed to upload image for processing" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage.from("project-images").getPublicUrl(imagePath);
      publicImageUrl = urlData.publicUrl;
      console.log("[generate-3d] Image uploaded to:", publicImageUrl);
    }

    // ─── Step 2: Submit to FAL.ai queue ───
    console.log("[generate-3d] Submitting to FAL.ai Trellis...");
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

    let glbDownloadUrl: string;

    try {
      // Submit to queue
      const submitResp = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Authorization": `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: publicImageUrl,
        }),
      });

      if (!submitResp.ok) {
        const errText = await submitResp.text();
        console.error("[generate-3d] FAL submit failed:", submitResp.status, errText.slice(0, 300));
        return new Response(
          JSON.stringify({ error: `3D generation failed: ${errText.slice(0, 200)}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const submitResult = await submitResp.json();
      const requestId = submitResult.request_id;

      if (!requestId) {
        // Synchronous response — result is already here
        console.log("[generate-3d] Got synchronous result");
        glbDownloadUrl = extractGlbUrl(submitResult);
      } else {
        // Async — poll for result
        console.log("[generate-3d] Queued, request_id:", requestId);
        glbDownloadUrl = await pollForResult(falKey, requestId, ac.signal);
      }
    } finally {
      clearTimeout(timer);
    }

    if (!glbDownloadUrl) {
      return new Response(
        JSON.stringify({ error: "3D generation did not produce a GLB file" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-3d] GLB URL from FAL:", glbDownloadUrl);

    // ─── Step 3: Download GLB and upload to Supabase storage ───
    const glbResp = await fetch(glbDownloadUrl);
    if (!glbResp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download generated 3D model" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const glbBuffer = new Uint8Array(await glbResp.arrayBuffer());
    console.log("[generate-3d] GLB downloaded, size:", glbBuffer.length, "bytes");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const glbPath = `generated-models/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.glb`;

    const { error: glbUploadErr } = await supabase.storage
      .from("project-images")
      .upload(glbPath, glbBuffer, {
        contentType: "model/gltf-binary",
        upsert: false,
      });

    if (glbUploadErr) {
      console.error("[generate-3d] GLB upload failed:", glbUploadErr);
      return new Response(
        JSON.stringify({ error: "Failed to store generated 3D model" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: glbUrlData } = supabase.storage.from("project-images").getPublicUrl(glbPath);
    const publicGlbUrl = glbUrlData.publicUrl;
    console.log("[generate-3d] GLB stored at:", publicGlbUrl);

    // Log usage
    logUsage({
      userId,
      functionName: "generate-3d",
      model: FAL_MODEL,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0.05,
    }).catch((err) => console.error("Usage log failed:", err));

    return new Response(
      JSON.stringify({ glbUrl: publicGlbUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-3d] Error:", message);
    const status = message.includes("Authorization") || message.includes("Invalid") ? 401
      : message.includes("aborted") ? 504
      : 500;
    return new Response(
      JSON.stringify({ error: status === 504 ? "3D generation timed out. Try a simpler image." : message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Extract GLB URL from FAL.ai response (handles different model output formats) */
function extractGlbUrl(result: Record<string, unknown>): string {
  // Trellis output: { model_mesh: { url: "..." } } or { glb_url: "..." }
  if (result.model_mesh && typeof result.model_mesh === "object") {
    const mesh = result.model_mesh as Record<string, unknown>;
    if (typeof mesh.url === "string") return mesh.url;
  }
  if (typeof result.glb_url === "string") return result.glb_url;
  if (typeof result.mesh_url === "string") return result.mesh_url;

  // Try nested output
  if (result.output && typeof result.output === "object") {
    return extractGlbUrl(result.output as Record<string, unknown>);
  }

  // TripoSR format: { mesh: { url: "..." } }
  if (result.mesh && typeof result.mesh === "object") {
    const mesh = result.mesh as Record<string, unknown>;
    if (typeof mesh.url === "string") return mesh.url;
  }

  console.error("[generate-3d] Could not find GLB URL in result:", JSON.stringify(result).slice(0, 500));
  return "";
}

/** Poll FAL.ai queue for result */
async function pollForResult(falKey: string, requestId: string, signal: AbortSignal): Promise<string> {
  const statusUrl = `https://queue.fal.run/${FAL_MODEL}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${FAL_MODEL}/requests/${requestId}`;

  // Poll every 3 seconds
  while (!signal.aborted) {
    await new Promise((r) => setTimeout(r, 3000));

    const statusResp = await fetch(statusUrl, {
      headers: { "Authorization": `Key ${falKey}` },
      signal,
    });

    if (!statusResp.ok) {
      console.error("[generate-3d] Status check failed:", statusResp.status);
      continue;
    }

    const status = await statusResp.json();
    console.log("[generate-3d] Job status:", status.status);

    if (status.status === "COMPLETED") {
      // Fetch the result
      const resultResp = await fetch(resultUrl, {
        headers: { "Authorization": `Key ${falKey}` },
        signal,
      });
      if (!resultResp.ok) {
        throw new Error(`Failed to fetch result: ${resultResp.status}`);
      }
      const result = await resultResp.json();
      return extractGlbUrl(result);
    }

    if (status.status === "FAILED") {
      throw new Error(`3D generation failed: ${status.error || "Unknown error"}`);
    }
  }

  throw new Error("3D generation timed out");
}
