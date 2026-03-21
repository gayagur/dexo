import { useState, useRef, useEffect, useCallback } from "react";
import { streamChat, type ChatMessage } from "@/lib/ai";
import { MATERIALS, STYLES, type PanelData, type FurnitureOption } from "@/lib/furnitureData";
import { Sparkles, Send, Loader2, X } from "lucide-react";

// ─── Types ──────────────────────────────────────────────

interface DesignCommand {
  action: string;
  [key: string]: unknown;
}

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
}

interface DesignChatPanelProps {
  furnitureType: FurnitureOption;
  dims: { w: number; h: number; d: number };
  style: string;
  panels: PanelData[];
  onUpdateDims: (dims: { w: number; h: number; d: number }) => void;
  onUpdateStyle: (style: string) => void;
  onUpdatePanelMaterial: (panelLabel: string, materialId: string) => void;
  onUpdateAllMaterials: (materialId: string) => void;
  onClose: () => void;
}

// ─── Command parsing ────────────────────────────────────

const CMD_REGEX = /\[DESIGN_CMD\]([\s\S]*?)\[\/DESIGN_CMD\]/g;

function extractCommands(text: string): { cleanText: string; commands: DesignCommand[] } {
  const commands: DesignCommand[] = [];
  const cleanText = text.replace(CMD_REGEX, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (parsed && typeof parsed.action === "string") {
        commands.push(parsed);
      }
    } catch {
      // skip malformed commands
    }
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();

  return { cleanText, commands };
}

function buildSystemContext(
  furnitureType: FurnitureOption,
  dims: { w: number; h: number; d: number },
  style: string,
  panels: PanelData[]
): string {
  const materialIds = MATERIALS.map((m) => m.id).join(", ");
  const styleList = STYLES.join(", ");
  const panelList = panels
    .map((p) => `  - "${p.label}" (${p.type}, material: ${p.materialId})`)
    .join("\n");

  return `You are a premium furniture design assistant embedded in a 3D editor. The user is designing a piece of furniture. Here is the current state:

Furniture type: ${furnitureType.label} (id: ${furnitureType.id})
Dimensions: ${dims.w}mm (W) x ${dims.h}mm (H) x ${dims.d}mm (D)
Style: ${style}
Panels:
${panelList}

Available materials: ${materialIds}
Available styles: ${styleList}

You can modify the design by including JSON command blocks in your response. The format is:
[DESIGN_CMD]{"action":"update_dims","w":2000,"h":900,"d":600}[/DESIGN_CMD]
[DESIGN_CMD]{"action":"update_style","style":"Modern"}[/DESIGN_CMD]
[DESIGN_CMD]{"action":"update_material","panelLabel":"Top","materialId":"walnut"}[/DESIGN_CMD]
[DESIGN_CMD]{"action":"update_all_materials","materialId":"walnut"}[/DESIGN_CMD]

Rules:
- Dimensions are in millimeters.
- panelLabel must match one of the current panel labels (case-insensitive).
- materialId must be one of the available materials listed above.
- style must be one of the available styles listed above.
- You may include multiple commands in one response.
- Always explain what you changed in natural language alongside any commands.
- If the user asks a general design question, answer helpfully without commands.
- Keep responses concise and professional.`;
}

// ─── Component ──────────────────────────────────────────

export function DesignChatPanel({
  furnitureType,
  dims,
  style,
  panels,
  onUpdateDims,
  onUpdateStyle,
  onUpdatePanelMaterial,
  onUpdateAllMaterials,
  onClose,
}: DesignChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingText]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const executeCommands = useCallback(
    (commands: DesignCommand[]) => {
      for (const cmd of commands) {
        switch (cmd.action) {
          case "update_dims": {
            const w = typeof cmd.w === "number" ? cmd.w : dims.w;
            const h = typeof cmd.h === "number" ? cmd.h : dims.h;
            const d = typeof cmd.d === "number" ? cmd.d : dims.d;
            onUpdateDims({ w, h, d });
            break;
          }
          case "update_style": {
            const s = String(cmd.style);
            if (STYLES.includes(s)) {
              onUpdateStyle(s);
            }
            break;
          }
          case "update_material": {
            const label = String(cmd.panelLabel);
            const matId = String(cmd.materialId);
            if (MATERIALS.some((m) => m.id === matId)) {
              onUpdatePanelMaterial(label, matId);
            }
            break;
          }
          case "update_all_materials": {
            const matId = String(cmd.materialId);
            if (MATERIALS.some((m) => m.id === matId)) {
              onUpdateAllMaterials(matId);
            }
            break;
          }
        }
      }
    },
    [dims, onUpdateDims, onUpdateStyle, onUpdatePanelMaterial, onUpdateAllMaterials]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setError(null);

    // Add user message to display
    const userMsg: DisplayMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Build messages for AI
    const systemContext = buildSystemContext(furnitureType, dims, style, panels);
    const systemMsg: ChatMessage = { role: "user", content: systemContext };
    const assistantAck: ChatMessage = {
      role: "assistant",
      content: "Understood. I'm ready to help you design your furniture. What would you like to change?",
    };

    const newHistory: ChatMessage[] = [
      ...(chatHistory.length === 0 ? [systemMsg, assistantAck] : chatHistory),
      { role: "user", content: text },
    ];

    // If history exists, inject updated context
    if (chatHistory.length > 0) {
      newHistory[0] = systemMsg;
    }

    setIsStreaming(true);
    setStreamingText("");

    const controller = streamChat(
      newHistory,
      null,
      // onChunk
      (chunk) => {
        setStreamingText((prev) => prev + chunk);
      },
      // onDone
      (fullText) => {
        setIsStreaming(false);
        setStreamingText("");

        const { cleanText, commands } = extractCommands(fullText);

        const assistantMsg: DisplayMessage = { role: "assistant", content: cleanText };
        setMessages((prev) => [...prev, assistantMsg]);

        setChatHistory([
          ...newHistory,
          { role: "assistant", content: fullText },
        ]);

        if (commands.length > 0) {
          executeCommands(commands);
        }
      },
      // onError
      (errMsg) => {
        setIsStreaming(false);
        setStreamingText("");
        setError(errMsg);
      }
    );

    abortRef.current = controller;
  }, [input, isStreaming, furnitureType, dims, style, panels, chatHistory, executeCommands]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    if (streamingText) {
      const { cleanText } = extractCommands(streamingText);
      if (cleanText) {
        setMessages((prev) => [...prev, { role: "assistant", content: cleanText + " ..." }]);
      }
    }
    setStreamingText("");
  };

  // Parse streaming text for display (strip command blocks in real-time)
  const displayStreamingText = streamingText.replace(CMD_REGEX, "").replace(/\[DESIGN_CMD\][^[]*$/s, "").trim();

  return (
    <div className="w-80 bg-[#1B2432] flex flex-col border-l border-[#2A3544] shrink-0 h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2A3544] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C87D5A] to-[#B06B4A] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Design Assistant</h3>
              <p className="text-[10px] text-gray-500">AI-powered editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-[#2A3544] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Context badge */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded-full bg-[#2A3544] text-[10px] text-gray-400 font-medium">
            {furnitureType.label}
          </div>
          <div className="px-2 py-0.5 rounded-full bg-[#2A3544] text-[10px] text-gray-400 font-medium">
            {dims.w} x {dims.h} x {dims.d}mm
          </div>
          <div className="px-2 py-0.5 rounded-full bg-[#2A3544] text-[10px] text-gray-400 font-medium">
            {style}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-[#2A3544]">
        {/* Welcome message */}
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-8 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C87D5A]/20 to-[#B06B4A]/20 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-[#C87D5A]" />
            </div>
            <p className="text-sm text-gray-400 mb-1">How can I help?</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ask me to change dimensions, materials, style, or get design advice for your {furnitureType.label.toLowerCase()}.
            </p>
            {/* Quick suggestions */}
            <div className="mt-4 space-y-1.5">
              {[
                "Make it walnut with brass accents",
                `Switch to Scandinavian style`,
                `Make it wider — 2400mm`,
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg bg-[#2A3544]/50 text-xs text-gray-400 hover:bg-[#2A3544] hover:text-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#C87D5A] text-white rounded-br-md"
                  : "bg-[#2A3544] text-gray-200 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-[#2A3544] text-gray-200 text-[13px] leading-relaxed">
              {displayStreamingText || (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Thinking...
                </span>
              )}
              {displayStreamingText && (
                <span className="inline-block w-1.5 h-4 bg-[#C87D5A] ml-0.5 animate-pulse rounded-sm align-text-bottom" />
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-800/40 text-red-300 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-3 pb-3 pt-1 border-t border-[#2A3544] shrink-0">
        {isStreaming && (
          <button
            onClick={handleCancel}
            className="w-full mb-2 py-1.5 rounded-lg bg-[#2A3544] text-gray-400 text-xs hover:bg-[#344050] transition-colors"
          >
            Stop generating
          </button>
        )}
        <div className="flex items-end gap-2 bg-[#2A3544] rounded-xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your design..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 resize-none outline-none max-h-24 leading-relaxed disabled:opacity-50"
            style={{ minHeight: "20px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-8 h-8 rounded-lg bg-[#C87D5A] hover:bg-[#B06B4A] disabled:bg-[#3A4555] disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-1.5">
          AI can modify your design directly
        </p>
      </div>
    </div>
  );
}
