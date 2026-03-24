import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MODEL = "black-forest-labs/FLUX.1-dev";
const MAX_IMAGES_PER_PROJECT = 4;
const COST_PER_MP = 0.025; // per megapixel (FLUX.1-dev)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, supabase } = await verifyAuth(req);
    const { prompt, projectId, width = 768, height = 512 } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap resolution at 1024x1024 (FLUX.1-dev supports higher res)
    const w = Math.min(width, 1024);
    const h = Math.min(height, 1024);

    // Check per-project image limit (if projectId provided)
    if (projectId) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { count } = await serviceClient
        .from("image_versions")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .is("parent_version_id", null);

      if ((count ?? 0) >= MAX_IMAGES_PER_PROJECT) {
        return new Response(
          JSON.stringify({ error: `Image limit reached (${MAX_IMAGES_PER_PROJECT} per project)` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call FLUX.1-dev via Together AI (with Pollinations fallback)
    let tempUrl: string | null = null;
    let usedFallback = false;

    try {
      const response = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${togetherApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          width: w,
          height: h,
          steps: 28,
          n: 1,
          response_format: "url",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        tempUrl = result.data?.[0]?.url || null;
      } else {
        const errText = await response.text();
        console.error("Together AI image error:", response.status, errText);
      }
    } catch (togetherErr) {
      console.error("Together AI image fetch error:", togetherErr);
    }

    // Fallback to Pollinations if Together AI failed
    if (!tempUrl) {
      console.log("Falling back to Pollinations for image generation");
      usedFallback = true;
      const encodedPrompt = encodeURIComponent(prompt);
      tempUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&nologo=true`;
      // Verify the URL works
      try {
        const checkResp = await fetch(tempUrl, { method: "HEAD" });
        if (!checkResp.ok) {
          return new Response(
            JSON.stringify({ error: "Image generation failed (both providers)" }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Image generation failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Download the temporary image
    const imageResponse = await fetch(tempUrl);
    const imageBlob = await imageResponse.blob();
    const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

    // Upload to Supabase Storage
    const fileName = `ai-generated/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("project-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to save image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("project-images")
      .getPublicUrl(fileName);

    const permanentUrl = urlData.publicUrl;

    // Save to image_versions if projectId provided
    if (projectId) {
      await supabase.from("image_versions").insert({
        project_id: projectId,
        image_url: permanentUrl,
        prompt,
        version_number: 1,
        is_current: true,
      });
    }

    // Log usage
    const megapixels = (w * h) / 1_000_000;
    const cost = usedFallback ? 0 : megapixels * COST_PER_MP;

    logUsage({
      userId,
      functionName: "generate-image",
      model: usedFallback ? "pollinations-fallback" : MODEL,
      costUsd: cost,
      metadata: { projectId, width: w, height: h, promptPreview: prompt.slice(0, 100), fallback: usedFallback },
    }).catch((err) => console.error("Usage log failed:", err));

    return new Response(
      JSON.stringify({ url: permanentUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Authorization") || message.includes("token")
      ? 401
      : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
