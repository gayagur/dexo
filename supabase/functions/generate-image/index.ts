import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage } from "../_shared/usage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MODEL = "gpt-image-1";
const MAX_IMAGES_PER_PROJECT = 4;

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

    // Determine size - gpt-image-1 supports: 1024x1024, 1536x1024, 1024x1536, auto
    const size = w > h ? "1536x1024" : h > w ? "1024x1536" : "1024x1024";

    console.log("[generate-image] Calling OpenAI gpt-image-1");
    console.log("[generate-image] Prompt:", prompt.slice(0, 100));
    console.log("[generate-image] Size:", size);

    const requestBody = {
      model: MODEL,
      prompt,
      n: 1,
      size,
      quality: "medium" as const,
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

    // gpt-image-1 returns base64 by default, or url depending on response_format
    const imageData = result.data?.[0];
    let imageBuffer: Uint8Array;

    if (imageData?.b64_json) {
      // Decode base64
      const binaryStr = atob(imageData.b64_json);
      imageBuffer = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        imageBuffer[i] = binaryStr.charCodeAt(i);
      }
    } else if (imageData?.url) {
      // Download from temp URL
      const imageResponse = await fetch(imageData.url);
      const imageBlob = await imageResponse.blob();
      imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());
    } else {
      console.error("[generate-image] No image data in response:", JSON.stringify(result).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No image returned from AI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-image] Got image data, uploading to storage...");

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
    logUsage({
      userId,
      functionName: "generate-image",
      model: MODEL,
      costUsd: 0.02, // gpt-image-1 medium quality
      metadata: { projectId, size, promptPreview: prompt.slice(0, 100) },
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
