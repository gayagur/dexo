import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MODEL = "dall-e-3";
const MAX_IMAGES_PER_PROJECT = 4;
const COST_PER_MP = 0.003; // per megapixel (FLUX.1-schnell)

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

    // Cap resolution at 1024x1024
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

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call OpenAI DALL-E 3
    console.log("[generate-image] Calling OpenAI DALL-E 3 with model:", MODEL);
    console.log("[generate-image] Prompt:", prompt.slice(0, 100));
    console.log("[generate-image] Requested dimensions:", w, "x", h);

    // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
    const size = w > h ? "1792x1024" : h > w ? "1024x1792" : "1024x1024";

    const requestBody = {
      model: MODEL,
      prompt,
      n: 1,
      size,
      quality: "standard" as const,
      response_format: "url" as const,
    };

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[generate-image] OpenAI response status:", response.status);

    const responseText = await response.text();
    console.log("[generate-image] OpenAI raw response:", responseText.slice(0, 500));

    if (!response.ok) {
      console.error("[generate-image] OpenAI ERROR:", response.status, responseText);
      let errMsg = "Image generation failed";
      try {
        const errJson = JSON.parse(responseText);
        if (errJson.error?.message) errMsg = errJson.error.message;
        else if (errJson.error) errMsg = typeof errJson.error === "string" ? errJson.error : JSON.stringify(errJson.error);
      } catch { /* use default */ }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("[generate-image] Failed to parse response JSON");
      return new Response(
        JSON.stringify({ error: "Invalid response from AI service" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tempUrl = result.data?.[0]?.url;

    if (!tempUrl) {
      console.error("[generate-image] No image URL in response:", JSON.stringify(result).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No image returned from AI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-image] Got temp URL:", tempUrl.slice(0, 100));

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
    const cost = megapixels * COST_PER_MP;

    logUsage({
      userId,
      functionName: "generate-image",
      model: MODEL,
      costUsd: cost,
      metadata: { projectId, width: w, height: h, promptPreview: prompt.slice(0, 100) },
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
