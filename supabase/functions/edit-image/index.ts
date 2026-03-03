import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage } from "../_shared/usage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MODEL = "black-forest-labs/FLUX.1-kontext-pro";
const MAX_EDITS_PER_IMAGE = 5;
const COST_PER_MP = 0.04;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, supabase } = await verifyAuth(req);
    const { imageUrl, instruction, versionId, projectId } = await req.json();

    if (!imageUrl || !instruction) {
      return new Response(
        JSON.stringify({ error: "imageUrl and instruction are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check edit limit on the image chain (only when tracking in DB)
    if (versionId && projectId) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Count how many versions exist in this chain
      // Find the root version first, then count descendants
      const { data: versions } = await serviceClient
        .from("image_versions")
        .select("id, parent_version_id")
        .eq("project_id", projectId);

      // Walk up to find root
      let rootId = versionId;
      const versionMap = new Map(
        (versions ?? []).map((v) => [v.id, v.parent_version_id])
      );
      while (versionMap.get(rootId)) {
        rootId = versionMap.get(rootId)!;
      }

      // Count all versions with this root
      let editCount = 0;
      const visited = new Set<string>();
      const queue = [rootId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        editCount++;
        for (const [id, parentId] of versionMap.entries()) {
          if (parentId === current && !visited.has(id)) {
            queue.push(id);
          }
        }
      }

      // editCount includes the root, so edits = editCount - 1
      if (editCount - 1 >= MAX_EDITS_PER_IMAGE) {
        return new Response(
          JSON.stringify({ error: `Edit limit reached (${MAX_EDITS_PER_IMAGE} edits per image)` }),
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

    // Call FLUX Kontext Pro — instruction-based editing
    const response = await fetch("https://api.together.xyz/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: instruction,
        image_url: imageUrl,
        n: 1,
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Together AI edit error:", errText);
      // Parse specific error for client-friendly message
      let errMsg = "Image editing failed";
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) errMsg = errJson.error.message;
      } catch { /* use default */ }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const tempUrl = result.data?.[0]?.url;

    if (!tempUrl) {
      return new Response(
        JSON.stringify({ error: "No image returned" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download and re-upload to Supabase Storage
    const imageResponse = await fetch(tempUrl);
    const imageBlob = await imageResponse.blob();
    const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

    const fileName = `ai-edited/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("project-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to save edited image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("project-images")
      .getPublicUrl(fileName);

    const permanentUrl = urlData.publicUrl;

    // Track versions in DB only when a project exists
    let newVersionId: string | null = null;
    let nextVersion: number | null = null;

    if (projectId) {
      // Mark old version as not current
      if (versionId) {
        await supabase
          .from("image_versions")
          .update({ is_current: false })
          .eq("id", versionId);
      }

      // Get next version number
      const { data: latestVersion } = await supabase
        .from("image_versions")
        .select("version_number")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      nextVersion = (latestVersion?.version_number ?? 0) + 1;

      const { data: newVersion } = await supabase
        .from("image_versions")
        .insert({
          project_id: projectId,
          parent_version_id: versionId || null,
          image_url: permanentUrl,
          edit_instruction: instruction,
          version_number: nextVersion,
          is_current: true,
        })
        .select()
        .single();

      newVersionId = newVersion?.id ?? null;
    }

    // Log usage (assume ~1MP for edited images)
    const cost = 1 * COST_PER_MP;

    logUsage({
      userId,
      functionName: "edit-image",
      model: MODEL,
      costUsd: cost,
      metadata: {
        projectId: projectId || null,
        versionId,
        instructionPreview: instruction.slice(0, 100),
      },
    }).catch((err) => console.error("Usage log failed:", err));

    return new Response(
      JSON.stringify({
        url: permanentUrl,
        versionId: newVersionId,
        versionNumber: nextVersion,
      }),
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
