import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage } from "../_shared/usage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MODEL = "black-forest-labs/FLUX.1-kontext-pro";
const MAX_EDITS_PER_IMAGE = 5;
const COST_PER_MP = 0.04;
const MAX_DIMENSION = 1024;

// ─── Structured Error Codes ────────────────────────────────
type ErrorCode =
  | "MASK_EMPTY"
  | "DIMS_MISMATCH"
  | "PROMPT_EMPTY"
  | "IMAGE_TOO_LARGE"
  | "EDIT_LIMIT"
  | "AI_ERROR"
  | "UPLOAD_ERROR"
  | "AUTH_ERROR"
  | "CONFIG_ERROR";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message, code }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, supabase } = await verifyAuth(req);
    const { imageUrl, instruction, versionId, projectId, mask, regionHint } = await req.json();

    // ─── Validation ──────────────────────────────────────────
    if (!imageUrl) {
      return errorResponse("PROMPT_EMPTY", "imageUrl is required", 400);
    }
    if (!instruction) {
      return errorResponse("PROMPT_EMPTY", "instruction is required", 400);
    }

    // ─── Edit Limit Check ────────────────────────────────────
    if (versionId && projectId) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

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

      if (editCount - 1 >= MAX_EDITS_PER_IMAGE) {
        return errorResponse(
          "EDIT_LIMIT",
          `Edit limit reached (${MAX_EDITS_PER_IMAGE} edits per image)`,
          429
        );
      }
    }

    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      return errorResponse("CONFIG_ERROR", "AI service not configured", 500);
    }

    // ─── Debug Logging (always in Edge Functions) ────────────
    console.log("[edit-image] Request:", {
      imageUrl: imageUrl.slice(0, 80),
      instructionPreview: instruction.slice(0, 80),
      hasMask: !!mask,
      maskLength: mask ? mask.length : 0,
      regionHint: regionHint || null,
      versionId,
      projectId,
    });

    // ─── Upload mask to storage if provided ─────────────────
    let maskUrl: string | null = null;
    let maskStoragePath: string | null = null;
    if (mask) {
      // mask is base64 data URL: "data:image/png;base64,..."
      const base64Data = mask.replace(/^data:image\/\w+;base64,/, "");
      const maskBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      maskStoragePath = `ai-masks/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.png`;

      const { error: maskUploadError } = await supabase.storage
        .from("project-images")
        .upload(maskStoragePath, maskBuffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (maskUploadError) {
        console.error("[edit-image] Mask upload error:", maskUploadError);
        // Non-fatal: continue without mask
      } else {
        const { data: maskUrlData } = supabase.storage
          .from("project-images")
          .getPublicUrl(maskStoragePath);
        maskUrl = maskUrlData.publicUrl;
      }
    }

    // ─── Build Prompt ──────────────────────────────────────────
    // Together AI's FLUX Kontext Pro does NOT support mask images via
    // the API — only prompt + image_url. When the user painted a mask
    // region, the frontend analyzes it and sends a `regionHint` string
    // (e.g. "in the top-left area of the image") so we can give the
    // model spatial guidance via the prompt text.
    let prompt: string;
    if (regionHint) {
      // Region-specific edit: tell the model WHERE and WHAT to change
      prompt = `${regionHint}, ${instruction}. Keep the rest of the image unchanged.`;
    } else if (mask) {
      // Mask provided but no regionHint (fallback)
      prompt = `${instruction}. Only change the relevant area, keep everything else unchanged.`;
    } else {
      // Global edit
      prompt = instruction;
    }

    const editBody: Record<string, unknown> = {
      model: MODEL,
      prompt,
      image_url: imageUrl,
      steps: 28,
      n: 1,
      response_format: "url",
    };

    console.log("[edit-image] Calling Together AI:", {
      model: MODEL,
      prompt: prompt.slice(0, 150),
      hasMask: !!mask,
      regionHint: regionHint || null,
    });

    const response = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[edit-image] Together AI error:", response.status, errText);
      let errMsg = "Image editing failed";
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) errMsg = errJson.error.message;
      } catch { /* use default */ }
      return errorResponse("AI_ERROR", errMsg, 502);
    }

    const result = await response.json();
    const tempUrl = result.data?.[0]?.url;

    if (!tempUrl) {
      return errorResponse("AI_ERROR", "No image returned from AI", 502);
    }

    // ─── Download & Re-upload to Supabase Storage ───────────
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
      console.error("[edit-image] Storage upload error:", uploadError);
      return errorResponse("UPLOAD_ERROR", "Failed to save edited image", 500);
    }

    const { data: urlData } = supabase.storage
      .from("project-images")
      .getPublicUrl(fileName);

    const permanentUrl = urlData.publicUrl;

    // ─── Track Versions in DB ───────────────────────────────
    let newVersionId: string | null = null;
    let nextVersion: number | null = null;

    if (projectId) {
      if (versionId) {
        await supabase
          .from("image_versions")
          .update({ is_current: false })
          .eq("id", versionId);
      }

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

    // ─── Log Usage ──────────────────────────────────────────
    const cost = 1 * COST_PER_MP;

    logUsage({
      userId,
      functionName: "edit-image",
      model: MODEL,
      costUsd: cost,
      metadata: {
        projectId: projectId || null,
        versionId,
        hasMask: !!mask,
        instructionPreview: instruction.slice(0, 100),
      },
    }).catch((err) => console.error("Usage log failed:", err));

    console.log("[edit-image] Success:", {
      url: permanentUrl.slice(0, 80),
      versionId: newVersionId,
      versionNumber: nextVersion,
    });

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
    console.error("[edit-image] Unhandled error:", message);
    const isAuth = message.includes("Authorization") || message.includes("token");
    return errorResponse(
      isAuth ? "AUTH_ERROR" : "AI_ERROR",
      message,
      isAuth ? 401 : 500
    );
  }
});
