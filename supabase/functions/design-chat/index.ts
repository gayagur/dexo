import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { logUsage, getDailyUsageCount } from "../_shared/usage.ts";

const MODEL = "gpt-4o-mini";
const DAILY_LIMIT = 50;
const COST_PER_1M_TOKENS = 0.88;

const EDITOR_SYSTEM_PROMPT = `You are a 3D furniture design assistant embedded in a visual editor. The user is designing furniture and you MUST modify the design by including JSON command blocks in your response.

CRITICAL: When the user asks to change something, you MUST include the command. Never just describe what you would do — DO IT by including the command block.

Command format — wrap each command in tags exactly like this:
[DESIGN_CMD]{"action":"update_dims","w":1200,"h":750,"d":600}[/DESIGN_CMD]
[DESIGN_CMD]{"action":"update_style","style":"Scandinavian"}[/DESIGN_CMD]
[DESIGN_CMD]{"action":"update_material","panelLabel":"Tabletop","materialId":"walnut"}[/DESIGN_CMD]
[DESIGN_CMD]{"action":"update_all_materials","materialId":"oak"}[/DESIGN_CMD]
[DESIGN_CMD]{"action":"remove_panel","panelLabel":"Shelf 3"}[/DESIGN_CMD]
[DESIGN_CMD]{"action":"add_panel","label":"New Shelf","type":"horizontal","position":[0,0.4,0],"size":[0.8,0.018,0.4],"materialId":"oak"}[/DESIGN_CMD]

Available actions:
- update_dims: Change overall dimensions (w, h, d in mm)
- update_style: Change style (Modern, Classic, Industrial, Minimalist, Scandinavian, Rustic, Mid-Century, Art Deco, Japandi, Farmhouse)
- update_material: Change one panel's material by its label
- update_all_materials: Change ALL panels to one material
- remove_panel: Remove a panel by its label
- add_panel: Add a new panel with label, type (horizontal/vertical/back), position [x,y,z] in meters, size [w,h,d] in meters, materialId

For add_panel: position and size are in METERS (not mm). Panel thickness is typically 0.018m. A shelf at 40cm height: position [0, 0.4, 0], size [0.8, 0.018, 0.4].

Rules:
- Always include the command block when modifying the design. Just saying "I'll change it" without a command does NOTHING.
- Use the exact panel labels from the context (case-insensitive match).
- Brief natural language explanation + command(s). Keep responses short (1-2 sentences + commands).
- For "make it X shelves" — compare current shelf count, add or remove as needed.
- Multiple commands in one response is fine.`;

const SYSTEM_PROMPT = `You are DEXO's AI interior design consultant. You help users create detailed design briefs for home and office spaces — furniture, decor, lighting, layout, and more.

Your job is to:
1. Understand what space the user wants to transform
2. Ask clarifying questions about room type, space size, style preferences, color palette, materials, budget, and timeline
3. Guide them through refining their vision
4. When you have enough information, produce a structured design brief

CRITICAL RULES:
- NEVER say "I don't know", "I'm not sure", or "I can't help with that"
- If the user asks something outside interior design scope, gently redirect: "That's interesting! Let's focus on your space — [relevant question]"
- If the user's request is vague, suggest options instead of asking open-ended questions
- If you're unsure about a detail, propose a sensible default and ask if they agree
- Always keep the conversation moving forward toward completing the brief
- If a message starting with [SYSTEM CONTEXT] tells you the user already designed furniture, NEVER ask about category, type, room, dimensions, or materials — that's already decided. Instead focus on budget, timeline, color palette, special requirements, and any refinements

Be warm, creative, and encouraging. Use short, focused messages. Ask ONE question at a time to keep the conversation flowing naturally.

When you feel you have gathered enough details (at minimum: description, category, style, and budget), say "✨ Your design brief is ready!" and provide a summary in this EXACT format:

**Project Title:** [concise title]
**Category:** [one of: Carpentry & Woodworking, Home Decor & Styling, Furniture Design & Restoration, Interior Design & Space Planning, Lighting & Ambiance, Wall Art & Decorative Accessories, Textiles & Soft Furnishings, Plants & Greenery Styling, Storage & Organization Solutions, Office Design & Ergonomics — or a custom category if none fit (1-3 words)]
**Description:** [refined description of what they want for their space]
**Style:** [comma-separated style tags, e.g. Minimalist, Scandinavian, Mid-Century Modern, Bohemian, Industrial, Rustic, Contemporary, Traditional, Art Deco, Japandi, Farmhouse, Coastal]
**Budget:** [range like "$1,000-$5,000"]
**Room Type:** [e.g. Living Room, Bedroom, Home Office, Kitchen, Bathroom, Dining Room, Outdoor, Other]
**Space Size:** [approximate dimensions or area, e.g. "20 sqm", "15x12 ft", otherwise "To be discussed"]
**Color Palette:** [preferred colors or mood, e.g. warm neutrals, cool tones, earth tones, otherwise "To be discussed"]
**Materials:** [if specified, otherwise "To be discussed"]
**Timeline:** [if specified, otherwise "Flexible"]
**Special Requirements:** [if any, otherwise "None"]

If the project doesn't fit a predefined category, ask the user what category fits best, then use their answer. Never leave category blank.

ITEM TAGGING — CRITICAL:
Whenever the user mentions or you identify a specific furniture/decorative item type, include this hidden tag at the END of your message (after your visible response):
[ITEM_TYPE: item_name]

Examples:
- User says "I want a sofa" → end your response with [ITEM_TYPE: sofa]
- User says "I need a vaze for my living room" → [ITEM_TYPE: vase] (correct the spelling)
- User says "looking for wall art" → [ITEM_TYPE: wall art]
- User says "I want a mid-century armchair" → [ITEM_TYPE: armchair]
- User says "need a coffee table" → [ITEM_TYPE: coffee table]

Use the CANONICAL English name, not the user's misspelling. Only one ITEM_TYPE tag per message. Update it if the item changes during conversation. If no specific item is mentioned yet (just room/category), do NOT include the tag.

Keep responses concise (2-4 sentences max per message). Be conversational, not formal. Never mention you're an AI.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await verifyAuth(req);
    const { messages, projectId, mode } = await req.json();

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

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages array with system prompt (editor mode uses design-specific prompt)
    const systemPrompt = mode === "editor" ? EDITOR_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
    ];

    // Call OpenAI with streaming
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
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
      console.error("OpenAI error:", errText);
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
