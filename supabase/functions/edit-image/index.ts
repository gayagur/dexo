import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage } from "../_shared/usage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MODEL = "black-forest-labs/FLUX.1-kontext-pro";
const MAX_EDITS_PER_IMAGE = 5;
const COST_PER_MP = 0.04;

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

    // ─── Step 1: Verify source image is accessible ────────────
    console.log("[edit-image] === STEP 1: Verifying source image ===");
    console.log("[edit-image] imageUrl:", imageUrl);

    let imageAccessible = false;
    try {
      const headResp = await fetch(imageUrl, { method: "HEAD" });
      imageAccessible = headResp.ok;
      console.log("[edit-image] Image HEAD check:", {
        status: headResp.status,
        contentType: headResp.headers.get("content-type"),
        contentLength: headResp.headers.get("content-length"),
        accessible: imageAccessible,
      });
    } catch (headErr) {
      console.error("[edit-image] Image HEAD check failed:", headErr);
    }

    if (!imageAccessible) {
      console.error("[edit-image] SOURCE IMAGE NOT ACCESSIBLE — Together AI cannot fetch it");
      return errorResponse("AI_ERROR", "Source image is not accessible. Please try regenerating it.", 400);
    }

    // ─── Step 2: Upload mask to storage if provided ───────────
    console.log("[edit-image] === STEP 2: Processing mask ===");
    let maskStoragePath: string | null = null;
    if (mask) {
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
      } else {
        console.log("[edit-image] Mask uploaded:", maskStoragePath);
      }
    } else {
      console.log("[edit-image] No mask provided (global edit)");
    }

    // ─── Step 3: Build prompt for Kontext ─────────────────────
    // Kontext works best with direct, clear transformation instructions.
    // Do NOT add spatial hints — Kontext doesn't understand "in the top-left area".
    // Instead, give it a clear editing instruction as the prompt.
    console.log("[edit-image] === STEP 3: Building prompt ===");

    const prompt = instruction;

    console.log("[edit-image] Final prompt:", prompt);
    console.log("[edit-image] Original instruction:", instruction);
    console.log("[edit-image] regionHint (ignored for Kontext):", regionHint || "none");

    // ─── Step 4: Call Together AI ──────────────────────────────
    console.log("[edit-image] === STEP 4: Calling Together AI ===");

    const editBody = {
      model: MODEL,
      prompt,
      image_url: imageUrl,
      steps: 28,
      n: 1,
      response_format: "url",
    };

    console.log("[edit-image] Request body:", JSON.stringify(editBody, null, 2));

    const response = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editBody),
    });

    console.log("[edit-image] Together AI response status:", response.status);
    console.log("[edit-image] Together AI response headers:", {
      contentType: response.headers.get("content-type"),
      requestId: response.headers.get("x-request-id"),
    });

    const responseText = await response.text();
    console.log("[edit-image] Together AI raw response:", responseText.slice(0, 500));

    if (!response.ok) {
      console.error("[edit-image] Together AI ERROR:", response.status, responseText);
      let errMsg = "Image editing failed";
      try {
        const errJson = JSON.parse(responseText);
        if (errJson.error?.message) errMsg = errJson.error.message;
        else if (errJson.error) errMsg = typeof errJson.error === "string" ? errJson.error : JSON.stringify(errJson.error);
      } catch { /* use default */ }
      return errorResponse("AI_ERROR", errMsg, 502);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("[edit-image] Failed to parse response JSON");
      return errorResponse("AI_ERROR", "Invalid response from AI service", 502);
    }

    const tempUrl = result.data?.[0]?.url;

    console.log("[edit-image] === STEP 5: Checking result ===");
    console.log("[edit-image] Result structure:", {
      hasData: !!result.data,
      dataLength: result.data?.length,
      firstItem: result.data?.[0] ? Object.keys(result.data[0]) : "none",
      tempUrl: tempUrl ? tempUrl.slice(0, 100) : "MISSING",
      resultId: result.id,
      model: result.model,
    });

    if (!tempUrl) {
      console.error("[edit-image] No image URL in response. Full result:", JSON.stringify(result).slice(0, 500));
      return errorResponse("AI_ERROR", "No image returned from AI", 502);
    }

    // ─── Step 6: Verify edited image is different ─────────────
    console.log("[edit-image] === STEP 6: Downloading edited image ===");
    console.log("[edit-image] Downloading from:", tempUrl.slice(0, 100));

    const imageResponse = await fetch(tempUrl);
    if (!imageResponse.ok) {
      console.error("[edit-image] Failed to download edited image:", imageResponse.status);
      return errorResponse("AI_ERROR", "Failed to download edited image from AI", 502);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

    console.log("[edit-image] Downloaded edited image:", {
      size: imageBuffer.length,
      contentType: imageResponse.headers.get("content-type"),
    });

    // ─── Step 7: Upload to Supabase Storage ───────────────────
    console.log("[edit-image] === STEP 7: Uploading to storage ===");
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
    console.log("[edit-image] Uploaded to:", permanentUrl.slice(0, 100));

    // ─── Step 8: Track Versions in DB ─────────────────────────
    console.log("[edit-image] === STEP 8: Tracking version ===");
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

      const editType = mask ? "masked_inpaint" : "global_edit";

      const { data: newVersion } = await supabase
        .from("image_versions")
        .insert({
          project_id: projectId,
          parent_version_id: versionId || null,
          image_url: permanentUrl,
          edit_instruction: instruction,
          mask_path: maskStoragePath || null,
          edit_type: editType,
          version_number: nextVersion,
          is_current: true,
        })
        .select()
        .single();

      newVersionId = newVersion?.id ?? null;
      console.log("[edit-image] Version tracked:", { newVersionId, nextVersion, editType });
    }

    // ─── Step 9: Log Usage ────────────────────────────────────
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

    console.log("[edit-image] === DONE ===");
    console.log("[edit-image] Success:", {
      inputUrl: imageUrl.slice(0, 60),
      outputUrl: permanentUrl.slice(0, 60),
      sameUrl: imageUrl === permanentUrl,
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
    console.error("[edit-image] Stack:", err instanceof Error ? err.stack : "no stack");
    const isAuth = message.includes("Authorization") || message.includes("token");
    return errorResponse(
      isAuth ? "AUTH_ERROR" : "AI_ERROR",
      message,
      isAuth ? 401 : 500
    );
  }
});
