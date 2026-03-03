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
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${FUNCTIONS_URL}/design-chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages, projectId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        // Supabase gateway returns { message }, our functions return { error }
        const msg = err.error || err.message || `HTTP ${response.status}`;
        onError(msg);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
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

      onDone(fullText);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Aborted by user — not an error
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
}

/**
 * Edit an image via FLUX Kontext Pro (instruction-based, no mask).
 */
export async function editImage(
  imageUrl: string,
  instruction: string,
  versionId: string | null,
  projectId: string | null
): Promise<EditResult> {
  const doRequest = async (inst: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/edit-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageUrl, instruction: inst, versionId, projectId: projectId || undefined }),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || "Image editing failed" };
    return data as EditResult;
  };

  try {
    const result = await doRequest(instruction);
    // On 502-level errors, retry once with simplified instruction
    if (result.error && !result.error.includes("limit")) {
      const simplified = `Simple edit: ${instruction.slice(0, 80)}`;
      const retry = await doRequest(simplified);
      if (!retry.error) return retry;
    }
    return result;
  } catch (err) {
    return { error: (err as Error).message };
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
  const styleStr = styleTags.length > 0 ? ` Style: ${styleTags.join(", ")}.` : "";
  const matStr = materials ? ` Materials: ${materials}.` : "";
  return `Professional product photo of a custom ${category.toLowerCase()}. ${description}.${styleStr}${matStr} Studio lighting, clean background, high quality, artisan craftsmanship.`;
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
