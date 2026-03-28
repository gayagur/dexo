import { useState, useRef, useEffect, useCallback } from "react";
import { streamChat, type ChatMessage, uploadFurnitureImage, analyzeFurnitureImage, generate3DFromImage, type FurnitureAnalysis } from "@/lib/ai";
import { MATERIALS, STYLES, type PanelData, type FurnitureOption } from "@/lib/furnitureData";
import { Sparkles, Send, Loader2, X, ImagePlus } from "lucide-react";

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
  onRemovePanel: (panelLabel: string) => void;
  onAddPanel: (panel: { label: string; type: PanelData["type"]; position: [number, number, number]; size: [number, number, number]; materialId: string }) => void;
  onBuildFromImage: (analysis: FurnitureAnalysis, mode: "replace" | "add") => void;
  onAddGLBGroup?: (name: string, glbUrl: string) => Promise<void>;
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
  onRemovePanel,
  onAddPanel,
  onBuildFromImage,
  onAddGLBGroup,
  onClose,
}: DesignChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your design assistant. I can help you:\n\n**Upload a furniture photo** — I'll analyze it and build a 3D model from it\n\n**Describe changes** — \"make the table wider\" or \"add a shelf\"\n\n**Suggest materials** — \"what wood goes with modern style?\"\n\nTry sending me a photo of furniture you like!",
    },
  ]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<FurnitureAnalysis | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          case "remove_panel": {
            const label = String(cmd.panelLabel);
            onRemovePanel(label);
            break;
          }
          case "add_panel": {
            const label = String(cmd.label || "New Panel");
            const type = (cmd.type as PanelData["type"]) || "horizontal";
            const position = (cmd.position as [number, number, number]) || [0, 0.5, 0];
            const size = (cmd.size as [number, number, number]) || [0.5, 0.018, 0.3];
            const matId = String(cmd.materialId || "oak");
            onAddPanel({ label, type, position, size, materialId: matId });
            break;
          }
        }
      }
    },
    [dims, onUpdateDims, onUpdateStyle, onUpdatePanelMaterial, onUpdateAllMaterials, onRemovePanel, onAddPanel]
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
      },
      "editor" // Use editor-specific system prompt
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

  // ─── Image upload & analysis ───────────────────────────
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    if (isAnalyzing || isStreaming) return;

    setIsAnalyzing(true);
    setError(null);
    setMessages((prev) => [...prev, {
      role: "user",
      content: `📷 Uploaded image: ${file.name}`,
    }]);
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: "Processing your image...",
    }]);

    const { url, error: uploadErr } = await uploadFurnitureImage(file);
    if (uploadErr || !url) {
      setIsAnalyzing(false);
      setError(uploadErr || "Upload failed");
      return;
    }

    // Analyze with AI Vision
    const { data: analysis, error: analysisErr } = await analyzeFurnitureImage(url);
    setIsAnalyzing(false);

    if (analysisErr || !analysis) {
      const errMsg = analysisErr || "Analysis failed";
      setError(errMsg);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Analysis failed: ${errMsg}`,
      }]);
      return;
    }

    const panelList = analysis.panels.map(p => `• ${p.label} (${p.shape})`).join("\n");
    const has3D = !!onAddGLBGroup;
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: `I identified **${analysis.name}** with ${analysis.panels.length} components:\n${panelList}\n\nEstimated size: ${analysis.estimatedDims.w}×${analysis.estimatedDims.h}×${analysis.estimatedDims.d}mm\n\nChoose an action:\n• **Replace** or **Add** — build from components (fast)\n${has3D ? "• **Generate 3D** — create a 3D model from the image (slower, higher quality)" : ""}`,
    }]);
    setPendingAnalysis(analysis);
    setPendingImageUrl(url);
  }, [isAnalyzing, isStreaming, onAddGLBGroup]);

  const handleAnalysisAction = useCallback((mode: "replace" | "add") => {
    if (!pendingAnalysis) return;
    onBuildFromImage(pendingAnalysis, mode);
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: mode === "replace"
        ? `Done! Replaced with ${pendingAnalysis.panels.length} components from the image.`
        : `Done! Added ${pendingAnalysis.panels.length} components to the scene.`,
    }]);
    setPendingAnalysis(null);
    setPendingImageUrl(null);
  }, [pendingAnalysis, onBuildFromImage]);

  const handleGenerate3D = useCallback(async () => {
    if (!pendingImageUrl || !onAddGLBGroup) return;
    setPendingAnalysis(null);
    setIsAnalyzing(true);
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: "Generating 3D model from your image... This may take 1-2 minutes.",
    }]);

    const { glbUrl, error: genErr } = await generate3DFromImage(pendingImageUrl);
    setIsAnalyzing(false);
    setPendingImageUrl(null);

    if (genErr || !glbUrl) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `3D generation failed: ${genErr || "Unknown error"}`,
      }]);
      return;
    }

    try {
      await onAddGLBGroup("Imported 3D", glbUrl);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "3D model generated and added to the scene!",
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Failed to load the 3D model: ${(err as Error).message}`,
      }]);
    }
  }, [pendingImageUrl, onAddGLBGroup]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
    // Reset so same file can be selected again
    e.target.value = "";
  }, [handleImageUpload]);

  // Parse streaming text for display (strip command blocks in real-time)
  const displayStreamingText = streamingText.replace(CMD_REGEX, "").replace(/\[DESIGN_CMD\][^[]*$/s, "").trim();

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#C87D5A]" />
          <span className="text-xs font-semibold text-gray-700">AI Assistant</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Context badges */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500 font-medium">
          {furnitureType.label}
        </div>
        <div className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500 font-medium">
          {dims.w} x {dims.h} x {dims.d}mm
        </div>
        <div className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500 font-medium">
          {style}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-200">
        {/* Welcome message */}
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-6 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C87D5A]/20 to-[#B06B4A]/20 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-[#C87D5A]" />
            </div>
            <p className="text-sm text-gray-600 mb-1">How can I help?</p>
            <p className="text-xs text-gray-400 leading-relaxed">
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
                  className="block w-full text-left px-3 py-2 rounded-lg bg-gray-100 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
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
                  : "bg-gray-100 text-gray-700 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-gray-100 text-gray-700 text-[13px] leading-relaxed">
              {displayStreamingText || (
                <span className="flex items-center gap-1.5 text-gray-400">
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

        {/* Analyzing indicator */}
        {isAnalyzing && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-gray-100 text-gray-500 text-[13px]">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing furniture in image...
              </span>
            </div>
          </div>
        )}

        {/* Pending analysis: Replace/Add/Generate 3D buttons */}
        {(pendingAnalysis || pendingImageUrl) && (
          <div className="flex flex-col gap-2 px-1">
            {pendingAnalysis && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAnalysisAction("replace")}
                  className="flex-1 py-2 rounded-lg bg-[#C87D5A] hover:bg-[#B06B4A] text-white text-xs font-medium transition-colors"
                >
                  Replace current
                </button>
                <button
                  onClick={() => handleAnalysisAction("add")}
                  className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium border border-gray-200 transition-colors"
                >
                  Add to scene
                </button>
              </div>
            )}
            {pendingImageUrl && onAddGLBGroup && (
              <button
                onClick={handleGenerate3D}
                disabled={isAnalyzing}
                className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-medium transition-colors"
              >
                {isAnalyzing ? "Generating 3D model..." : "Generate 3D model"}
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Upload photo row */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
        <label className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-500 hover:text-[#C87D5A] hover:bg-[#C87D5A]/5 rounded cursor-pointer transition-colors">
          <ImagePlus className="w-3 h-3" />
          Upload photo
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      {/* Input area */}
      <div className="px-3 pb-3 pt-1 border-t border-gray-100 shrink-0">
        {isStreaming && (
          <button
            onClick={handleCancel}
            className="w-full mb-2 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 transition-colors"
          >
            Stop generating
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-end gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your design..."
            rows={1}
            disabled={isStreaming || isAnalyzing}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 resize-none outline-none max-h-24 leading-relaxed disabled:opacity-50"
            style={{ minHeight: "20px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || isAnalyzing}
            className="w-8 h-8 rounded-lg bg-[#C87D5A] hover:bg-[#B06B4A] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          AI can modify your design directly
        </p>
      </div>
    </div>
  );
}
