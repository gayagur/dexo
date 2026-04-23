/**
 * generate-3d — EXACT copy of analyze-furniture from commit 442e15e.
 * Uses shared prompt, JSON schema, robust parsing.
 * Only change: removed deprecated Llama-3.2-90B model.
 */
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";
import { FURNITURE_ANALYSIS_PROMPT } from "../_shared/furnitureAnalysisPrompt.ts";
import { parseFurnitureAnalysisFromLlmText } from "../_shared/extractFurnitureAnalysisJson.ts";
import {
  FURNITURE_ANALYSIS_RESPONSE_FORMAT,
  VISION_MODELS_SUPPORTING_JSON_SCHEMA,
} from "../_shared/furnitureAnalysisJsonSchema.ts";

const VISION_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
];
const PER_MODEL_MS = 90_000;
const DAILY_LIMIT = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await verifyAuth(req);
    const { imageUrl, briefHint, silhouetteUrl, depthUrl, palette } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional auxiliary images produced by the client-side preprocessor
    // (background-removed silhouette + depth map). Both are data URLs or
    // https URLs; we forward them straight to the vision model.
    const hasSilhouette = typeof silhouetteUrl === "string" && silhouetteUrl.length > 0;
    const hasDepth = typeof depthUrl === "string" && depthUrl.length > 0;
    const hasAuxImages = hasSilhouette || hasDepth;

    // Optional color palette: hex colors actually present on the furniture,
    // sampled from the image *after* background removal so there are no
    // wall/floor colors polluting the list. Shape: "#AABBCC,#112233,...".
    const paletteList: string[] = typeof palette === "string"
      ? palette.split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => /^#[0-9A-Fa-f]{6}$/.test(s))
      : [];
    const hasPalette = paletteList.length > 0;

    const todayCount = await getDailyUsageCount(userId, "generate-3d");
    if (todayCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daily limit reached (20/day)." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let content = "";
    let usedModel = VISION_MODELS[0];
    let lastError = "";
    let timedOut = false;

    for (const model of VISION_MODELS) {
      console.log(
        `[generate-3d] Trying: ${model} (aux: silhouette=${hasSilhouette}, depth=${hasDepth})`,
      );
      usedModel = model;

      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), PER_MODEL_MS);
        let response: Response;

        // Build prompt — inject brief context if available so vision model knows materials/style
        let promptText = briefHint
          ? `${FURNITURE_ANALYSIS_PROMPT}\n\n== DESIGNER BRIEF (use as hints for material & shape selection) ==\n${briefHint}\nUse this context to disambiguate materials and shapes — e.g. if the brief says "walnut" and you see brown wood, use "walnut" not "oak". If the brief says "glass top", the transparent surface is "glass" or "tinted_glass". The visual analysis still takes priority for dimensions and positions.`
          : FURNITURE_ANALYSIS_PROMPT;

        // When the client supplied auxiliary pre-processed images, prepend a
        // short explanation so the model knows what each image represents and
        // how to use them together. These cues drastically reduce geometric
        // hallucinations (wrong proportions / invented volumes).
        if (hasAuxImages) {
          const auxExplainParts: string[] = [
            "",
            "== MULTI-IMAGE INPUT — read this carefully ==",
            "You are being shown multiple views of THE SAME piece of furniture:",
            "  Image 1 (ORIGINAL PHOTO): the actual photograph — use it for materials, colors, textures, style, and part labels.",
          ];
          let idx = 2;
          if (hasSilhouette) {
            auxExplainParts.push(
              `  Image ${idx} (SILHOUETTE / background-removed cut-out): the object isolated from its background. Use this to read the TRUE outline, full extent, and aspect ratio of the piece. If a dimension conflicts between this image and the original photo, TRUST THIS ONE for width/height proportions — the background has been removed so there are no distractions.`,
            );
            idx++;
          }
          if (hasDepth) {
            auxExplainParts.push(
              `  Image ${idx} (DEPTH MAP, grayscale): brighter pixels = CLOSER to the camera, darker pixels = FURTHER. Use this to resolve 3D geometry: which parts stick out (legs in front, armrests protruding), which parts recede (back panels, rear legs), and how thick/deep each component is. This is the single most important cue for getting panel depth (size[2]) and Z positions correct.`,
            );
            idx++;
          }
          auxExplainParts.push(
            "All three images depict the SAME object. Cross-reference them: the silhouette tells you the 2D outline, the depth map tells you the 3D structure, and the original photo tells you materials and fine detail. Your final panel positions and sizes must be consistent with ALL of them.",
            "",
          );
          promptText = `${auxExplainParts.join("\n")}\n${promptText}`;
        }

        // ─── Palette hints + colorHex override instructions ──────────────
        // Our MATERIALS palette is finite (~60 swatches). When a real-world
        // piece has a color that isn't close to any swatch, the model tends
        // to pick a wildly wrong material (e.g. "mustard fabric" for an
        // off-white pillow). Two fixes, both appended here:
        //   (a) Tell the model the ACTUAL dominant hex colors we sampled
        //       from the foreground of the photo — it has ground-truth now.
        //   (b) Allow an optional `colorHex` field per panel that overrides
        //       the material swatch color. The client parses this into
        //       PanelData.customColor, which the renderer respects.
        const colorGuidanceParts: string[] = [
          "",
          "== COLOR ACCURACY — use `colorHex` to override the swatch when needed ==",
          "Each panel has a `materialId` (picks finish: wood grain / fabric weave / metal sheen / roughness / PBR feel).",
          "You MAY ALSO add an optional `colorHex` field (string, `\"#RRGGBB\"`) with the EXACT color of that part.",
          "When to use `colorHex`:",
          "  • The real color isn't in the fixed MATERIALS palette (off-white, blush, charcoal blue, warm gray, greige, etc.).",
          "  • The part is clearly lighter or darker than the nearest swatch.",
          "  • You need to match a specific fabric/paint color shown in the photo.",
          "How to choose materialId when using colorHex: pick the material whose TEXTURE/FINISH best matches (fabric_gray for any mid-gray upholstery, melamine_white for any white painted surface, walnut for any medium-dark wood, etc.). Then let `colorHex` carry the precise hue.",
          "Example: white pillow on gray upholstered bed →",
          "  { \"label\": \"Pillow\",  \"materialId\": \"fabric_ivory\", \"colorHex\": \"#F3EDE4\", ... }",
          "  { \"label\": \"Bedframe\", \"materialId\": \"fabric_gray\",  \"colorHex\": \"#6E6E73\", ... }",
        ];
        if (hasPalette) {
          colorGuidanceParts.push(
            "",
            "== DETECTED PALETTE (dominant colors actually present in this photo) ==",
            `These hex values were sampled directly from the foreground pixels of the furniture (background already removed — no wall/floor contamination): ${paletteList.join(", ")}.`,
            "Every panel's final color MUST closely match one of these palette entries. If a panel looks like it doesn't fit any of these, you are mis-segmenting the photo — reconsider which part of the image corresponds to that panel.",
          );
        }
        colorGuidanceParts.push("");
        promptText = `${promptText}\n${colorGuidanceParts.join("\n")}`;

        const userContent: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
        > = [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
        ];
        if (hasSilhouette) {
          userContent.push({ type: "image_url", image_url: { url: silhouetteUrl, detail: "high" } });
        }
        if (hasDepth) {
          userContent.push({ type: "image_url", image_url: { url: depthUrl, detail: "high" } });
        }

        const messages = [
          {
            role: "user" as const,
            content: userContent,
          },
        ];

        const basePayload = {
          model,
          messages,
          max_tokens: 4096,
          temperature: 0.2,
        };

        const useSchema = VISION_MODELS_SUPPORTING_JSON_SCHEMA.has(model);

        try {
          response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            signal: ac.signal,
            headers: {
              "Authorization": `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              useSchema
                ? { ...basePayload, response_format: FURNITURE_ANALYSIS_RESPONSE_FORMAT }
                : basePayload,
            ),
          });

          if (!response.ok && useSchema && response.status === 400) {
            console.warn(`${model}: schema rejected, retrying without`);
            response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              signal: ac.signal,
              headers: {
                "Authorization": `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(basePayload),
            });
          }
        } finally {
          clearTimeout(timer);
        }

        if (!response.ok) {
          lastError = `${model}: ${response.status}`;
          console.warn("[generate-3d]", lastError);
          continue;
        }

        const result = await response.json();
        content = result.choices?.[0]?.message?.content || "";
        const finishReason = result.choices?.[0]?.finish_reason;
        console.log(`[generate-3d] ${model} ok. len=${content.length} finish=${finishReason}`);

        if (finishReason === "length") {
          lastError = `${model}: truncated`;
          continue;
        }
        if (content) break;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          timedOut = true;
          lastError = `${model}: timed out after ${Math.round(PER_MODEL_MS / 1000)}s`;
          console.warn("[generate-3d]", lastError);
          continue;
        }
        lastError = `${model}: ${(err as Error).message}`;
        continue;
      }
    }

    if (!content) {
      const errorMessage = timedOut
        ? `All models timed out while analyzing the image. Last error: ${lastError}. Try a smaller / simpler image or retry in a moment.`
        : `All models failed. ${lastError}`;
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseFurnitureAnalysisFromLlmText(content);
    if (!parsed.ok) {
      console.error("[generate-3d] Parse failed. Head:", content.slice(0, 400));
      return new Response(
        JSON.stringify({ error: "AI returned invalid format." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = parsed.data as Record<string, unknown>;
    const panelsRaw = Array.isArray(raw.panels) ? raw.panels
      : Array.isArray(raw.components) ? raw.components
      : Array.isArray(raw.parts) ? raw.parts : null;

    if (!panelsRaw || panelsRaw.length === 0) {
      return new Response(
        JSON.stringify({ error: "No furniture components found." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = { ...raw, panels: panelsRaw };

    logUsage({
      userId, functionName: "generate-3d", model: usedModel,
      tokensIn: 0, tokensOut: Math.ceil(content.length / 4), costUsd: 0.01,
    }).catch(() => {});

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: message.includes("Authorization") ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
