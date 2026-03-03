import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { streamChat, generateImage, buildImagePrompt } from '@/lib/ai';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles, Send, Loader2, ImageIcon, Square,
  Check, Tag, Palette, DollarSign, Ruler, Package, Clock, Pencil,
  ImagePlus, X, Star, ArrowRight,
} from 'lucide-react';

import type { ChatMessage } from '@/lib/ai';

// ─── Types ──────────────────────────────────────────────────
interface DisplayMessage {
  role: 'ai' | 'user';
  text: string;
  images?: string[];
}

interface BriefData {
  title: string;
  category: string;
  description: string;
  style: string;
  budget: string;
  materials: string;
  dimensions: string;
  timeline: string;
  specialRequirements: string;
}

type Phase = 'chatting' | 'brief' | 'generating_image' | 'done';

// ─── Brief Parsing ──────────────────────────────────────────
const BRIEF_FIELDS = [
  { key: 'title', pattern: /\*\*Project Title:\*\*\s*(.+)/i },
  { key: 'category', pattern: /\*\*Category:\*\*\s*(.+)/i },
  { key: 'description', pattern: /\*\*Description:\*\*\s*(.+)/i },
  { key: 'style', pattern: /\*\*Style:\*\*\s*(.+)/i },
  { key: 'budget', pattern: /\*\*Budget:\*\*\s*(.+)/i },
  { key: 'materials', pattern: /\*\*Materials:\*\*\s*(.+)/i },
  { key: 'dimensions', pattern: /\*\*Dimensions:\*\*\s*(.+)/i },
  { key: 'timeline', pattern: /\*\*Timeline:\*\*\s*(.+)/i },
  { key: 'specialRequirements', pattern: /\*\*Special Requirements:\*\*\s*(.+)/i },
] as const;

function parseBrief(text: string): BriefData | null {
  if (!text.includes('Your design brief is ready') && !text.includes('**Project Title:**')) {
    return null;
  }
  const data: Record<string, string> = {};
  for (const { key, pattern } of BRIEF_FIELDS) {
    const match = text.match(pattern);
    if (match) data[key] = match[1].trim();
  }
  if (!data.title || !data.category || !data.description) return null;
  return {
    title: data.title,
    category: data.category,
    description: data.description,
    style: data.style || '',
    budget: data.budget || 'To be discussed',
    materials: data.materials || 'To be discussed',
    dimensions: data.dimensions || 'To be discussed',
    timeline: data.timeline || 'Flexible',
    specialRequirements: data.specialRequirements || 'None',
  };
}

function parseBudgetRange(budget: string): { min: number; max: number } {
  const nums = [...budget.matchAll(/\$?([\d,]+)/g)].map(m => parseInt(m[1].replace(',', ''), 10));
  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  if (nums.length === 1) return { min: 0, max: nums[0] };
  return { min: 0, max: 1000 };
}

// ─── Progress Tracking ──────────────────────────────────────
// Tracks what info the AI has extracted from conversation so far
const PROGRESS_FIELDS = [
  { key: 'category', label: 'Category', icon: Tag },
  { key: 'style', label: 'Style', icon: Palette },
  { key: 'budget', label: 'Budget', icon: DollarSign },
  { key: 'dimensions', label: 'Size', icon: Ruler },
  { key: 'materials', label: 'Materials', icon: Package },
  { key: 'timeline', label: 'Timeline', icon: Clock },
] as const;

function extractProgress(messages: DisplayMessage[]): Record<string, string> {
  const allText = messages.map(m => m.text).join('\n');
  const progress: Record<string, string> = {};

  // Category detection from conversation
  const catPatterns: [RegExp, string][] = [
    [/ring|necklace|bracelet|earring|pendant|gold\b|silver\b|jewel/i, 'Jewelry'],
    [/cake|cupcake|pastry|birthday cake|wedding cake/i, 'Custom Cakes'],
    [/table|chair|desk|shelf|cabinet|bed|sofa|furniture/i, 'Furniture'],
    [/dress|suit|shirt|jacket|gown|tailor|fashion/i, 'Fashion'],
    [/vase|bowl|mug|pot|ceramic|pottery|clay/i, 'Ceramics'],
    [/gift|engrav|personali[sz]|monogram/i, 'Personalized Gifts'],
    [/rug|tapestry|curtain|pillow|blanket|textile/i, 'Textiles'],
    [/3d\s*print|prototype|figurine|filament/i, '3D Printing'],
  ];
  for (const [pat, cat] of catPatterns) {
    if (pat.test(allText)) { progress.category = cat; break; }
  }

  // Style detection
  const styles = ['minimalist', 'modern', 'vintage', 'bohemian', 'classic', 'industrial', 'rustic', 'glamorous', 'playful', 'organic'];
  const found = styles.filter(s => allText.toLowerCase().includes(s));
  if (found.length > 0) progress.style = found.map(s => s[0].toUpperCase() + s.slice(1)).join(', ');

  // Budget detection
  const budgetMatch = allText.match(/\$[\d,]+\s*[-–]\s*\$[\d,]+|\$[\d,]+/);
  if (budgetMatch) progress.budget = budgetMatch[0];

  // Dimensions detection
  const dimMatch = allText.match(/\d+\s*(?:cm|mm|in|inch|feet|ft|m\b|"|')\s*(?:[x×]\s*\d+\s*(?:cm|mm|in|inch|feet|ft|m\b|"|'))?/i);
  if (dimMatch) progress.dimensions = dimMatch[0];

  // Materials detection
  const matPatterns = /\b(gold|silver|platinum|wood|oak|walnut|pine|leather|silk|cotton|fondant|marble|ceramic|steel|copper|brass)\b/gi;
  const mats = [...new Set([...allText.matchAll(matPatterns)].map(m => m[1].toLowerCase()))];
  if (mats.length > 0) progress.materials = mats.map(m => m[0].toUpperCase() + m.slice(1)).join(', ');

  // Timeline detection
  const timeMatch = allText.match(/\d+\s*(?:week|month|day)s?|no rush|asap|urgent/i);
  if (timeMatch) progress.timeline = timeMatch[0];

  return progress;
}

// ─── Suggestion Chips ───────────────────────────────────────
const SUGGESTIONS = [
  'Custom engagement ring 💍',
  'Handmade wooden shelf 🪵',
  'Birthday cake design 🎂',
  'Leather messenger bag 👜',
];

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function AIChatFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProject } = useProjects();
  const { toast } = useToast();
  const { uploading: imageUploading, uploadMultiple } = useImageUpload();

  // Chat state
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Brief & project state
  const [phase, setPhase] = useState<Phase>('chatting');
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [conceptImageUrl, setConceptImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image uploads
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const briefFileInputRef = useRef<HTMLInputElement>(null);

  // Abort controller
  const abortRef = useRef<AbortController | null>(null);
  // LLM message history
  const llmMessagesRef = useRef<ChatMessage[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // Focus textarea when not loading
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading, phase]);

  // Progress from conversation
  const progress = extractProgress(messages);

  // ─── Send Message ─────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText && pendingFiles.length === 0) return;
    if (isLoading) return;

    // Upload pending images
    let imageUrls: string[] = [];
    if (pendingFiles.length > 0) {
      imageUrls = await uploadMultiple(pendingFiles, 'project-images');
      setUploadedImages(prev => [...prev, ...imageUrls]);
      pendingPreviews.forEach(url => URL.revokeObjectURL(url));
      setPendingFiles([]);
      setPendingPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    const userMsg: DisplayMessage = {
      role: 'user',
      text: msgText || '(attached images)',
      images: imageUrls.length > 0 ? imageUrls : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    // Add to LLM context
    llmMessagesRef.current.push({ role: 'user', content: msgText || '(attached reference images)' });

    let assistantSoFar = '';

    const controller = streamChat(
      llmMessagesRef.current,
      null,
      // onChunk
      (chunk) => {
        assistantSoFar += chunk;
        setStreamingContent(assistantSoFar);
      },
      // onDone
      (fullText) => {
        setIsLoading(false);
        setStreamingContent('');
        setMessages(prev => [...prev, { role: 'ai', text: fullText }]);
        llmMessagesRef.current.push({ role: 'assistant', content: fullText });

        // Check if AI produced a brief
        const parsed = parseBrief(fullText);
        if (parsed) {
          setBriefData(parsed);
          setPhase('brief');
        }
      },
      // onError
      (errMsg) => {
        setIsLoading(false);
        setStreamingContent('');
        toast({ title: 'AI error', description: errMsg, variant: 'destructive' });
      }
    );

    abortRef.current = controller;
  }, [input, isLoading, pendingFiles, pendingPreviews, uploadMultiple, toast]);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
    if (streamingContent) {
      setMessages(prev => [...prev, { role: 'ai', text: streamingContent }]);
      llmMessagesRef.current.push({ role: 'assistant', content: streamingContent });
    }
    setIsLoading(false);
    setStreamingContent('');
    abortRef.current = null;
  }, [streamingContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Image Generation ─────────────────────────────────────
  const handleGenerateImage = useCallback(async () => {
    if (!briefData) return;
    setPhase('generating_image');
    const styleTags = briefData.style.split(',').map(s => s.trim()).filter(Boolean);
    const prompt = buildImagePrompt(briefData.description, briefData.category, styleTags, briefData.materials);

    const result = await generateImage(prompt, null);
    if (result.url) {
      setConceptImageUrl(result.url);
    } else {
      toast({ title: 'Image generation failed', description: result.error || 'Please try again', variant: 'destructive' });
    }
    setPhase('done');
  }, [briefData, toast]);

  // ─── Submit Project ───────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!user || !briefData) {
      toast({ title: 'Please sign in first', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    const { min, max } = parseBudgetRange(briefData.budget);
    const styleTags = briefData.style.split(',').map(s => s.trim()).filter(Boolean);
    const materials = briefData.materials !== 'To be discussed' ? briefData.materials.split(',').map(s => s.trim()) : [];

    const { error } = await createProject({
      customer_id: user.id,
      title: briefData.title,
      description: briefData.description,
      category: briefData.category,
      style_tags: styleTags,
      budget_min: min,
      budget_max: max,
      details: {
        dimensions: briefData.dimensions,
        deadline: briefData.timeline,
        materials,
        special_requirements: briefData.specialRequirements !== 'None' ? briefData.specialRequirements : '',
      },
      inspiration_images: [...uploadedImages, ...(conceptImageUrl ? [conceptImageUrl] : [])],
      ai_brief: `${briefData.description}. Style: ${briefData.style}. Materials: ${briefData.materials}. Dimensions: ${briefData.dimensions}. Timeline: ${briefData.timeline}.`,
      ai_concept: conceptImageUrl,
      status: 'sent',
    });

    setSubmitting(false);
    if (error) {
      toast({ title: 'Error creating project', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Project created!' });
      navigate('/dashboard');
    }
  }, [user, briefData, conceptImageUrl, uploadedImages, createProject, navigate, toast]);

  // ─── File Handlers ────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPendingFiles(prev => [...prev, ...files]);
    setPendingPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingPreviews(prev => { URL.revokeObjectURL(prev[index]); return prev.filter((_, i) => i !== index); });
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleBriefFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadedImages.length >= 5) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 5 - uploadedImages.length);
    if (files.length === 0) return;
    const urls = await uploadMultiple(files, 'project-images');
    setUploadedImages(prev => [...prev, ...urls]);
  }, [uploadedImages, uploadMultiple]);

  const handleBriefFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - uploadedImages.length);
    if (files.length === 0) return;
    const urls = await uploadMultiple(files, 'project-images');
    setUploadedImages(prev => [...prev, ...urls]);
    if (briefFileInputRef.current) briefFileInputRef.current.value = '';
  }, [uploadedImages, uploadMultiple]);

  const canSend = (input.trim().length > 0 || pendingFiles.length > 0) && !isLoading;

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#FDFCF8] flex">
      {/* Progress Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-[#C05621]/[0.08] bg-white/50 p-6">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-[#C05621]" />
          <h2 className="font-serif text-lg font-bold text-[#1B2432]">Brief Progress</h2>
        </div>

        <div className="space-y-3 flex-1">
          {PROGRESS_FIELDS.map(({ key, label, icon: Icon }) => {
            const value = briefData ? (briefData as Record<string, string>)[key] : progress[key];
            const filled = !!value && value !== 'To be discussed' && value !== 'None' && value !== 'Flexible';

            return (
              <div
                key={key}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                  filled
                    ? 'bg-[#C05621]/[0.06] border border-[#C05621]/10'
                    : 'bg-white/60 border border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  filled ? 'bg-[#C05621]/10 text-[#C05621]' : 'bg-gray-100 text-gray-400'
                }`}>
                  {filled ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#4A5568]">{label}</div>
                  {filled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-[#C05621] truncate mt-0.5"
                    >
                      {value}
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-auto pt-6">
          <div className="flex justify-between text-xs text-[#4A5568] mb-2">
            <span>Progress</span>
            <span>
              {PROGRESS_FIELDS.filter(f => {
                const v = briefData ? (briefData as Record<string, string>)[f.key] : progress[f.key];
                return !!v && v !== 'To be discussed' && v !== 'None' && v !== 'Flexible';
              }).length}/{PROGRESS_FIELDS.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#C05621]"
              initial={{ width: 0 }}
              animate={{
                width: `${(PROGRESS_FIELDS.filter(f => {
                  const v = briefData ? (briefData as Record<string, string>)[f.key] : progress[f.key];
                  return !!v && v !== 'To be discussed' && v !== 'None' && v !== 'Flexible';
                }).length / PROGRESS_FIELDS.length) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#C05621]/[0.06] bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#C05621]/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-[#C05621]" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-[#1B2432]">DEXO Design Assistant</h1>
              <p className="text-xs text-[#4A5568]">
                {isLoading ? 'Thinking...' : "Let's bring your idea to life"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C05621]/10 bg-white mb-6">
                <Sparkles className="w-4 h-4 text-[#C05621]" />
                <span className="text-sm text-[#4A5568]">AI Design Consultant</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1B2432] mb-3">
                What would you like to create?
              </h2>
              <p className="text-[#4A5568] max-w-md">
                Describe your vision — jewelry, furniture, cakes, fashion, or anything custom-made.
                I'll help you refine every detail.
              </p>
              <div className="flex flex-wrap gap-2 mt-8 justify-center">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="px-4 py-2 rounded-full border border-[#C05621]/10 bg-white text-sm text-[#1B2432] hover:bg-[#C05621]/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-[0.92rem] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#C05621] text-white rounded-br-md'
                    : 'bg-white border border-[#C05621]/[0.06] text-[#1B2432] rounded-bl-md shadow-sm'
                }`}>
                  {msg.role === 'user' ? (
                    msg.text
                  ) : (
                    <div className="prose prose-sm prose-stone max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>strong]:text-[#1B2432]">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                  {msg.images && msg.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {msg.images.map((url, j) => (
                        <img key={j} src={url} alt="" className="rounded-lg w-full h-24 object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming content */}
          {isLoading && streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[80%] px-5 py-3 rounded-2xl rounded-bl-md text-[0.92rem] leading-relaxed bg-white border border-[#C05621]/[0.06] text-[#1B2432] shadow-sm">
                <div className="prose prose-sm prose-stone max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span className="inline-block w-1.5 h-4 bg-[#C05621]/60 animate-pulse ml-0.5 align-text-bottom" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading dots (before stream starts) */}
          {isLoading && !streamingContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white border border-[#C05621]/[0.06] rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#C05621]/50"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Brief Card */}
          {phase !== 'chatting' && briefData && (
            <BriefCard
              brief={briefData}
              phase={phase}
              conceptImageUrl={conceptImageUrl}
              submitting={submitting}
              imageUploading={imageUploading}
              uploadedImages={uploadedImages}
              onGenerateImage={handleGenerateImage}
              onSubmit={handleSubmit}
              onBriefFileDrop={handleBriefFileDrop}
              onBriefFileSelect={handleBriefFileSelect}
              onRemoveBriefImage={(i) => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
              briefFileInputRef={briefFileInputRef}
            />
          )}

          <div style={{ height: 1 }} />
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-[#C05621]/[0.06] bg-white/60 backdrop-blur-sm">
          {/* Pending image previews */}
          {pendingPreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {pendingPreviews.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#C05621]/10" />
                  <button
                    onClick={() => removePendingFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-12 w-12 flex items-center justify-center rounded-xl border border-[#C05621]/10 bg-white hover:bg-[#C05621]/5 text-[#C05621]/60 hover:text-[#C05621] transition-colors flex-shrink-0"
              title="Attach images"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={phase === 'chatting' ? 'Describe your design idea...' : 'Ask follow-up questions...'}
              rows={1}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl border border-[#C05621]/10 bg-white text-[#1B2432]
                         placeholder:text-[#4A5568]/50 focus:outline-none focus:ring-2 focus:ring-[#C05621]/30
                         focus:border-[#C05621]/30 transition-all resize-none min-h-[48px] max-h-[150px]
                         disabled:opacity-50"
            />
            {isLoading ? (
              <Button
                onClick={handleAbort}
                className="bg-red-500 text-white hover:bg-red-600 rounded-xl h-12 w-12 p-0 flex-shrink-0"
                title="Stop generating"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => sendMessage()}
                disabled={!canSend}
                className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl h-12 w-12 p-0 flex-shrink-0 disabled:opacity-40"
              >
                <Send className="w-4.5 h-4.5" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Brief Card (inline) ────────────────────────────────────
function BriefCard({
  brief,
  phase,
  conceptImageUrl,
  submitting,
  imageUploading,
  uploadedImages,
  onGenerateImage,
  onSubmit,
  onBriefFileDrop,
  onBriefFileSelect,
  onRemoveBriefImage,
  briefFileInputRef,
}: {
  brief: BriefData;
  phase: Phase;
  conceptImageUrl: string | null;
  submitting: boolean;
  imageUploading: boolean;
  uploadedImages: string[];
  onGenerateImage: () => void;
  onSubmit: () => void;
  onBriefFileDrop: (e: React.DragEvent) => void;
  onBriefFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBriefImage: (i: number) => void;
  briefFileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { min, max } = parseBudgetRange(brief.budget);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl border border-[#C05621]/[0.08] shadow-md p-8 space-y-6"
    >
      <div className="flex items-center gap-2 text-[#C05621]">
        <Star className="w-5 h-5" />
        <span className="font-semibold text-sm uppercase tracking-wider">Your Project Brief</span>
      </div>

      <h3 className="text-2xl font-serif font-bold text-[#1B2432]">{brief.title}</h3>
      <p className="text-[#4A5568] leading-relaxed">{brief.description}</p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
          <span className="text-[#4A5568] text-xs">Category</span>
          <p className="font-medium text-[#1B2432] mt-0.5">{brief.category}</p>
        </div>
        <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
          <span className="text-[#4A5568] text-xs">Budget</span>
          <p className="font-medium text-[#1B2432] mt-0.5">${min} – ${max}</p>
        </div>
        <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
          <span className="text-[#4A5568] text-xs">Timeline</span>
          <p className="font-medium text-[#1B2432] mt-0.5">{brief.timeline}</p>
        </div>
        <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
          <span className="text-[#4A5568] text-xs">Dimensions</span>
          <p className="font-medium text-[#1B2432] mt-0.5">{brief.dimensions}</p>
        </div>
      </div>

      {brief.style && (
        <div className="flex flex-wrap gap-2">
          {brief.style.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full bg-[#C05621]/[0.07] text-[#C05621] text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {brief.materials && brief.materials !== 'To be discussed' && (
        <p className="text-sm text-[#4A5568]">
          <span className="font-medium text-[#1B2432]">Materials:</span> {brief.materials}
        </p>
      )}

      {brief.specialRequirements && brief.specialRequirements !== 'None' && (
        <p className="text-sm text-[#4A5568]">
          <span className="font-medium text-[#1B2432]">Special notes:</span> {brief.specialRequirements}
        </p>
      )}

      {/* Reference images */}
      <div className="space-y-3">
        {uploadedImages.length > 0 && (
          <div>
            <span className="text-xs font-medium text-[#4A5568]">Reference Images</span>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {uploadedImages.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="rounded-xl w-full h-24 object-cover" />
                  <button
                    onClick={() => onRemoveBriefImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {uploadedImages.length < 5 && (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onBriefFileDrop}
            onClick={() => briefFileInputRef.current?.click()}
            className="border-2 border-dashed border-[#C05621]/20 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[#C05621]/40 hover:bg-[#C05621]/[0.02] transition-colors"
          >
            {imageUploading ? (
              <Loader2 className="w-6 h-6 text-[#C05621] animate-spin" />
            ) : (
              <ImagePlus className="w-6 h-6 text-[#C05621]/40" />
            )}
            <span className="text-xs text-[#4A5568]">Drop images here or click to browse</span>
            <span className="text-xs text-[#4A5568]/60">{uploadedImages.length}/5 images</span>
          </div>
        )}
        <input ref={briefFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onBriefFileSelect} />
      </div>

      {/* Concept image */}
      {(phase === 'done') && conceptImageUrl && (
        <div className="rounded-2xl overflow-hidden border border-[#C05621]/[0.08]">
          <img src={conceptImageUrl} alt="AI concept" className="w-full h-64 object-cover" />
        </div>
      )}

      {phase === 'generating_image' && (
        <div className="flex items-center justify-center h-48 rounded-2xl bg-[#FDFCF8] border border-[#C05621]/[0.06]">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#C05621] animate-spin mx-auto" />
            <p className="text-sm text-[#4A5568]">Generating concept image...</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {phase === 'brief' && (
          <>
            <Button onClick={onGenerateImage} className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl gap-2" size="lg">
              <ImageIcon className="w-4 h-4" />
              Generate Concept Image
            </Button>
            <Button onClick={onSubmit} variant="outline" size="lg" className="rounded-xl border-[#1B2432]/20 text-[#1B2432] gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Skip Image & Submit
            </Button>
          </>
        )}
        {phase === 'done' && (
          <Button onClick={onSubmit} className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl gap-2" size="lg" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Confirm & Find Creators
          </Button>
        )}
      </div>
    </motion.div>
  );
}
