import { supabase } from "./supabase";

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

// ─── Auth helpers ──────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  // getSession() returns a cached token — may be expired.
  // refreshSession() forces a fresh access_token from Supabase.
  let session = (await supabase.auth.getSession()).data.session;

  if (!session?.access_token) {
    throw new Error("Not authenticated — please sign in");
  }

  // If the token expires within 60 s, proactively refresh
  const expiresAt = session.expires_at ?? 0; // unix seconds
  if (expiresAt - Date.now() / 1000 < 60) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) session = data.session;
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
}

// ─── Streaming Chat ────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Stream a chat response from the design-chat Edge Function.
 * Calls onChunk with each text delta, onDone when complete, onError on failure.
 * Returns an AbortController so the caller can cancel.
 */
export function streamChat(
  messages: ChatMessage[],
  projectId: string | null,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: string) => void,
  mode?: "chat" | "editor"
): AbortController {
  const controller = new AbortController();

  // Safety timeout: abort if stream hangs for >90 seconds
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 90_000);

  (async () => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${FUNCTIONS_URL}/design-chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages, projectId, mode: mode || "chat" }),
        signal: controller.signal,
      });

      if (!response.ok) {
        clearTimeout(timeoutId);
        const err = await response.json().catch(() => ({}));
        // Supabase gateway returns { message }, our functions return { error }
        const msg = err.error || err.message || `HTTP ${response.status}`;
        onError(msg);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        clearTimeout(timeoutId);
        onError("No response stream");
        return;
      }

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      clearTimeout(timeoutId);
      onDone(fullText);
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        if (timedOut) {
          onError("Response timed out. Please try again.");
        }
        // Otherwise aborted by user — not an error
        return;
      }
      onError((err as Error).message || "Stream failed");
    }
  })();

  return controller;
}

// ─── Image Generation ──────────────────────────────────────

interface ImageResult {
  url?: string;
  error?: string;
}

/**
 * Generate a concept image via FLUX Schnell.
 */
export async function generateImage(
  prompt: string,
  projectId: string | null,
  width = 768,
  height = 512
): Promise<ImageResult> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/generate-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt, projectId, width, height }),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || "Image generation failed" };
    return { url: data.url };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ─── Image Editing ─────────────────────────────────────────

interface EditResult {
  url?: string;
  versionId?: string;
  versionNumber?: number;
  error?: string;
  /** Structured error code from backend */
  code?: string;
}

/**
 * Edit an image via FLUX Kontext Pro.
 * Supports optional mask (base64 data URL) for region-specific edits.
 * regionHint: human-readable description of the mask area (e.g. "in the top-left area")
 */
export async function editImage(
  imageUrl: string,
  instruction: string,
  versionId: string | null,
  projectId: string | null,
  mask?: string,
  regionHint?: string
): Promise<EditResult> {
  const doRequest = async (inst: string) => {
    const headers = await getAuthHeaders();

    const body: Record<string, unknown> = {
      imageUrl,
      instruction: inst,
      versionId,
      projectId: projectId || undefined,
    };
    if (mask) body.mask = mask;
    if (regionHint) body.regionHint = regionHint;

    console.log("[editImage] Sending request:", {
      imageUrl: imageUrl.slice(0, 60),
      instruction: inst.slice(0, 60),
      hasMask: !!mask,
      maskSize: mask ? mask.length : 0,
      regionHint,
    });

    const response = await fetch(`${FUNCTIONS_URL}/edit-image`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.error || "Image editing failed",
        code: data.code || undefined,
      };
    }
    return data as EditResult;
  };

  try {
    const result = await doRequest(instruction);
    // On AI errors (not validation errors), retry once with simplified instruction
    if (result.error && result.code === "AI_ERROR") {
      const simplified = `Simple edit: ${instruction.slice(0, 80)}`;
      const retry = await doRequest(simplified);
      if (!retry.error) return retry;
    }
    return result;
  } catch (err) {
    return { error: (err as Error).message, code: "AI_ERROR" };
  }
}

// ─── Prompt Builders ───────────────────────────────────────

/**
 * Build a structured image generation prompt from brief data.
 * Replaces pollinations.ts buildImagePrompt.
 */
export function buildImagePrompt(
  description: string,
  category: string,
  styleTags: string[],
  materials?: string
): string {
  const styleStr = styleTags.length > 0 ? `, ${styleTags.join(", ")} style` : "";
  const matStr = materials ? `, ${materials}` : "";
  return `Product photo of a ${description}${styleStr}${matStr}. Plain white background, completely white seamless backdrop. The furniture is centered and isolated — nothing else in the image. No room, no walls, no floor texture, no studio equipment, no lights, no props, no shadows on the ground. Just the single piece of furniture floating on pure white. Professional product photography, photorealistic, high detail.`;
}

/**
 * Generate alt text for an image using the chat endpoint (one-shot).
 */
export async function generateAltText(
  description: string,
  category: string
): Promise<string> {
  const fallback = `Custom ${category.toLowerCase()} design: ${description.slice(0, 80)}`;
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/design-chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Write a concise alt text (max 125 chars) for an image of: ${description}. Category: ${category}. Return ONLY the alt text, nothing else.`,
          },
        ],
        projectId: null,
      }),
    });

    if (!response.ok) return fallback;

    // Parse SSE stream for the full text
    const reader = response.body?.getReader();
    if (!reader) return fallback;

    const decoder = new TextDecoder();
    let text = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) text += content;
        } catch {
          // Skip
        }
      }
    }

    return text.trim().slice(0, 125) || fallback;
  } catch {
    return fallback;
  }
}

// ─── Furniture Image Analysis ─────────────────────────────

/** One component from vision JSON (optional fields normalized client-side). */
export interface FurnitureAnalysisPanel {
  label: string;
  type: "horizontal" | "vertical" | "back";
  shape: string;
  position: [number, number, number];
  size: [number, number, number];
  materialId: string;
  /** Arc angle (degrees), corner radius (m), trapezoid topRatio, torus tubeRadius, L/U thickness, etc. */
  shapeParams?: Record<string, number>;
  /** Local Euler rotation in radians [rx, ry, rz] when the part is tilted or wrongly oriented as a box. */
  rotation?: [number, number, number];
  /** Soft edges for box panels only (meters). */
  cornerRadius?: number;
}

export interface FurnitureAnalysis {
  name: string;
  estimatedDims: { w: number; h: number; d: number };
  panels: FurnitureAnalysisPanel[];
}

/**
 * Resize image and convert to base64 data URL for vision model input.
 * Max 1024px on longest side to stay within API payload limits.
 */
export async function uploadFurnitureImage(file: File): Promise<{ url?: string; error?: string }> {
  try {
    const MAX_SIZE = 896;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const scale = MAX_SIZE / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        // Draw to canvas and export as JPEG base64
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ url: dataUrl });
      };
      img.onerror = () => resolve({ error: "Failed to load image" });
      img.src = URL.createObjectURL(file);
    });
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Analyze a furniture image and return structured component data.
 */
export async function analyzeFurnitureImage(imageUrl: string): Promise<{ data?: FurnitureAnalysis; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/analyze-furniture`, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageUrl }),
    });

    let result: Record<string, unknown> = {};
    try {
      result = (await response.json()) as Record<string, unknown>;
    } catch {
      if (!response.ok) {
        return {
          error: `Analysis failed (HTTP ${response.status}). Try again or use a smaller image.`,
        };
      }
    }
    if (!response.ok) {
      const msg = typeof result.error === "string" ? result.error : `Analysis failed (HTTP ${response.status})`;
      return { error: msg };
    }
    return { data: result as unknown as FurnitureAnalysis };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("fetch")) {
      return {
        error:
          "Request timed out or could not reach the server. Try again in a moment, or use a smaller photo. If it keeps failing, redeploy the analyze-furniture Edge Function.",
      };
    }
    return { error: msg };
  }
}

/**
 * Classify a furniture image — returns structured metadata (category, style, material, color)
 * instead of trying to decompose into geometry. Used by the template-matching system.
 */
export async function classifyFurnitureImage(imageUrl: string): Promise<{ data?: Record<string, unknown>; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/classify-furniture`, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageUrl }),
    });

    let result: Record<string, unknown> = {};
    try {
      result = (await response.json()) as Record<string, unknown>;
    } catch {
      if (!response.ok) {
        return { error: `Classification failed (HTTP ${response.status}).` };
      }
    }

    if (!response.ok) {
      const msg = typeof result.error === "string" ? result.error : `Classification failed (HTTP ${response.status})`;
      return { error: msg };
    }

    return { data: result };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
      return { error: "Classification timed out or network error." };
    }
    return { error: msg };
  }
}

/**
 * AI Decompose — original pipeline restored from bd487a9.
 * Uses vision model to decompose image directly into geometric panels.
 * Returns same format as analyzeFurnitureImage (FurnitureAnalysis).
 */
export async function aiDecomposeFromImage(imageUrl: string): Promise<{ data?: FurnitureAnalysis; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/generate-3d`, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageUrl }),
    });

    let result: Record<string, unknown> = {};
    try {
      result = (await response.json()) as Record<string, unknown>;
    } catch {
      if (!response.ok) return { error: `AI decomposition failed (HTTP ${response.status}).` };
    }

    if (!response.ok) {
      return { error: typeof result.error === "string" ? result.error : "AI decomposition failed" };
    }

    if (import.meta.env.DEV) {
      (window as typeof window & { __lastAiAnalysis?: unknown }).__lastAiAnalysis = result;
      console.log("[aiDecomposeFromImage] raw analysis response", result);
    }

    return { data: result as unknown as FurnitureAnalysis };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
      return { error: "AI decomposition timed out or network error." };
    }
    return { error: msg };
  }
}

/**
 * @deprecated Use aiDecomposeFromImage or classifyFurnitureImage instead.
 */
export async function generate3DFromImage(imageUrl: string): Promise<{
  glbUrl?: string;
  analysis?: FurnitureAnalysis;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/generate-3d`, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageUrl }),
    });

    let result: Record<string, unknown> = {};
    try {
      result = (await response.json()) as Record<string, unknown>;
    } catch {
      if (!response.ok) {
        return { error: `3D generation failed (HTTP ${response.status}).` };
      }
    }

    if (!response.ok) {
      const msg = typeof result.error === "string" ? result.error : `3D generation failed (HTTP ${response.status})`;
      return { error: msg };
    }

    const glbUrl = typeof result.glbUrl === "string" ? result.glbUrl : undefined;
    const analysis = result.analysis as FurnitureAnalysis | null | undefined;

    if (!glbUrl && !analysis) {
      return { error: "Both 3D generation and part analysis failed." };
    }

    return {
      glbUrl: glbUrl || undefined,
      analysis: analysis || undefined,
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("fetch")) {
      return { error: "3D generation timed out or network error. Try again." };
    }
    return { error: msg };
  }
}
