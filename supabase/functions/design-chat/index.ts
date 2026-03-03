import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";

const MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
const DAILY_LIMIT = 50;
const COST_PER_1M_TOKENS = 0.88;

const SYSTEM_PROMPT = `You are DEXO's AI design consultant. You help users create detailed design briefs for custom-made products — jewelry, furniture, cakes, fashion, home decor, and more.

Your job is to:
1. Understand what the user wants to create
2. Ask clarifying questions about materials, dimensions, style, colors, budget, and timeline
3. Guide them through refining their vision
4. When you have enough information, produce a structured design brief

Be warm, creative, and encouraging. Use short, focused messages. Ask ONE question at a time to keep the conversation flowing naturally.

When you feel you have gathered enough details (at minimum: description, category, style, and budget), say "✨ Your design brief is ready!" and provide a summary in this EXACT format:

**Project Title:** [concise title]
**Category:** [one of: Jewelry, Custom Cakes, Furniture, Fashion, Ceramics, Personalized Gifts, Textiles, 3D Printing]
**Description:** [refined description of what they want]
**Style:** [comma-separated style tags]
**Budget:** [range like "$100-$500"]
**Materials:** [if specified, otherwise "To be discussed"]
**Dimensions:** [if specified, otherwise "To be discussed"]
**Timeline:** [if specified, otherwise "Flexible"]
**Special Requirements:** [if any, otherwise "None"]

Keep responses concise (2-4 sentences max per message). Be conversational, not formal. Never mention you're an AI.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await verifyAuth(req);
    const { messages, projectId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    const todayCount = await getDailyUsageCount(userId, "design-chat");
    if (todayCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daily chat limit reached (50/day). Try again tomorrow." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages array with system prompt
    const llmMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
    ];

    // Call Together AI with streaming
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: llmMessages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Together AI error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream passthrough — forward SSE chunks to client
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
      async flush() {
        // Fire-and-forget usage logging after stream completes
        // Estimate tokens: ~4 chars per token
        const inputChars = llmMessages.reduce((sum, m) => sum + m.content.length, 0);
        totalTokensIn = Math.ceil(inputChars / 4);
        const cost = ((totalTokensIn + totalTokensOut) / 1_000_000) * COST_PER_1M_TOKENS;

        logUsage({
          userId,
          functionName: "design-chat",
          model: MODEL,
          tokensIn: totalTokensIn,
          tokensOut: totalTokensOut,
          costUsd: cost,
          metadata: { projectId },
        }).catch((err) => console.error("Usage log failed:", err));
      },
    });

    const reader = response.body!.getReader();
    const writer = transformStream.writable.getWriter();

    // Pump the stream
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Try to parse SSE chunks to count output tokens
          const text = new TextDecoder().decode(value);
          const lines = text.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.usage) {
                totalTokensIn = parsed.usage.prompt_tokens || totalTokensIn;
                totalTokensOut = parsed.usage.completion_tokens || totalTokensOut;
              }
              // Count content tokens
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                totalTokensOut += Math.ceil(content.length / 4);
              }
            } catch {
              // Skip unparseable chunks
            }
          }

          await writer.write(value);
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(transformStream.readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
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
