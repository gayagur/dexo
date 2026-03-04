import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
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
  Tag, Palette, DollarSign, Ruler, Package, Clock,
  ImagePlus, X, ArrowDown,
} from 'lucide-react';

import type { ChatMessage } from '@/lib/ai';
import type { ImageVersion } from '@/lib/database.types';
import type { ProgressItem } from '@/components/chat/types';
import { ProgressSidebar } from '@/components/chat/ProgressSidebar';
import { BriefCard } from '@/components/chat/BriefCard';
import { ImageEditor } from '@/components/chat/ImageEditor';
import { SingleChipSelector, MultiChipSelector } from '@/components/chat/ChipSelector';
import {
  toBriefDisplayData,
  toProgressBriefData,
  progressToSharedBrief,
  parseBudgetRange,
  type InternalBriefData,
} from '@/components/chat/briefAdapter';

// ─── Types ──────────────────────────────────────────────────
interface DisplayMessage {
  role: 'ai' | 'user';
  text: string;
  images?: string[];
}

type Phase = 'chatting' | 'brief' | 'generating_image' | 'editing_image' | 'done';

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

interface ParseBriefResult {
  brief: InternalBriefData | null;
  missingRequired: string[];
}

function parseBrief(text: string): ParseBriefResult {
  if (!text.includes('Your design brief is ready') && !text.includes('**Project Title:**')) {
    return { brief: null, missingRequired: [] };
  }
  const data: Record<string, string> = {};
  for (const { key, pattern } of BRIEF_FIELDS) {
    const match = text.match(pattern);
    if (match) data[key] = match[1].trim();
  }

  // Track which required fields are missing
  const missingRequired: string[] = [];
  if (!data.title) missingRequired.push('title');
  if (!data.category) missingRequired.push('category');
  if (!data.description) missingRequired.push('description');

  if (missingRequired.length > 0) {
    return { brief: null, missingRequired };
  }

  return {
    brief: {
      title: data.title,
      category: data.category,
      description: data.description,
      style: data.style || '',
      budget: data.budget || 'To be discussed',
      materials: data.materials || 'To be discussed',
      dimensions: data.dimensions || 'To be discussed',
      timeline: data.timeline || 'Flexible',
      specialRequirements: data.specialRequirements || 'None',
    },
    missingRequired: [],
  };
}

// ─── Progress Tracking ──────────────────────────────────────
// Maps fields to ProgressSidebar's ProgressItem format
const PROGRESS_ITEMS: ProgressItem[] = [
  { field: 'category', label: 'Category', icon: Tag, stepIndex: 0 },
  { field: 'style_tags', label: 'Style', icon: Palette, stepIndex: 1 },
  { field: 'budget', label: 'Budget', icon: DollarSign, stepIndex: 2 },
  { field: 'size', label: 'Size', icon: Ruler, stepIndex: 3 },
  { field: 'materials', label: 'Materials', icon: Package, stepIndex: 4 },
  { field: 'timeline', label: 'Timeline', icon: Clock, stepIndex: 5 },
];

// Chip options for editable fields
const CATEGORY_OPTIONS = ['Jewelry', 'Custom Cakes', 'Furniture', 'Fashion', 'Ceramics', 'Personalized Gifts', 'Textiles', '3D Printing'];
const STYLE_OPTIONS = ['Minimalist', 'Modern', 'Vintage', 'Bohemian', 'Classic', 'Industrial', 'Rustic', 'Glamorous', 'Playful', 'Organic'];

function extractProgress(messages: DisplayMessage[]): Record<string, string> {
  const allText = messages.map(m => m.text).join('\n');
  const progress: Record<string, string> = {};

  // Category detection — Tier 1: keyword patterns for known categories
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

  // Tier 2: AI's explicit category mention (e.g. "Category: Skateboard")
  if (!progress.category) {
    const aiTexts = messages.filter(m => m.role === 'ai').map(m => m.text).join('\n');
    const explicitCat = aiTexts.match(/\*?\*?Category\*?\*?:\s*(.+?)(?:\n|$)/i);
    if (explicitCat) progress.category = explicitCat[1].trim();
  }

  // Tier 3: extract from user intent ("I want to create a [X]")
  if (!progress.category) {
    const userTexts = messages.filter(m => m.role === 'user').map(m => m.text).join('\n');
    const intentMatch = userTexts.match(/(?:want|like|need|create|design|make|build)\s+(?:a|an|some|my)?\s*(?:custom\s+)?(.{2,30?})(?:\.|,|!|\?|$)/i);
    if (intentMatch) {
      const raw = intentMatch[1].trim().replace(/\s+/g, ' ');
      // Capitalize first letter of each word
      progress.category = raw.split(' ').map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
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

// ─── Memoized Markdown Renderer ──────────────────────────────
const MemoMarkdown = memo(function MemoMarkdown({ text }: { text: string }) {
  const rendered = useMemo(() => <ReactMarkdown>{text}</ReactMarkdown>, [text]);
  return rendered;
});

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
  const [briefData, setBriefData] = useState<InternalBriefData | null>(null);
  const [conceptImageUrl, setConceptImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Field editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Image editing state
  const [imageVersions, setImageVersions] = useState<ImageVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);

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
  // Debounce timer for streaming content
  const streamDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Smart scroll: track whether user is near the bottom
  const handleScrollEvent = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isNearBottomRef.current = distanceFromBottom < 150;
    setShowScrollBtn(distanceFromBottom > 300);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  // Auto-scroll only when near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
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

  // Progress overrides — stores manual edits made during chatting phase
  const [progressOverrides, setProgressOverrides] = useState<Record<string, string>>({});

  // Progress from conversation, merged with manual overrides
  const progress = { ...extractProgress(messages), ...progressOverrides };

  // ─── Send Message ─────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText && pendingFiles.length === 0) return;
    if (isLoading) return;

    // If editing a free-text field, intercept and update directly
    if (editingField && editingField !== 'category' && editingField !== 'style_tags' && msgText) {
      setMessages(prev => [...prev, { role: 'user', text: msgText }]);
      setInput('');
      handleFieldUpdate(editingField, msgText);
      return;
    }

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
      // onChunk — debounce React state updates to ~50ms batches
      (chunk) => {
        assistantSoFar += chunk;
        if (!streamDebounceRef.current) {
          streamDebounceRef.current = setTimeout(() => {
            setStreamingContent(assistantSoFar);
            streamDebounceRef.current = null;
          }, 50);
        }
      },
      // onDone
      (fullText) => {
        if (streamDebounceRef.current) { clearTimeout(streamDebounceRef.current); streamDebounceRef.current = null; }
        setIsLoading(false);
        setStreamingContent('');

        // Detect unhelpful "I don't know" style responses
        const unhelpfulPattern = /\b(i don'?t know|i'?m not sure|i can'?t help|i'?m unable|outside my|beyond my)\b/i;
        const isUnhelpful = unhelpfulPattern.test(fullText) && fullText.length < 200;

        if (isUnhelpful) {
          // Replace with a redirect message
          const redirect = "Let me help you with your design! Could you describe what kind of custom product you'd like to create? For example: jewelry, furniture, a cake, fashion piece, or anything else you have in mind.";
          setMessages(prev => [...prev, { role: 'ai', text: redirect }]);
          llmMessagesRef.current.push({ role: 'assistant', content: redirect });
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: fullText }]);
          llmMessagesRef.current.push({ role: 'assistant', content: fullText });
        }

        // Check if AI produced a brief
        const { brief: parsed, missingRequired } = parseBrief(fullText);
        if (parsed) {
          setBriefData(parsed);
          setPhase('brief');
        } else if (missingRequired.length > 0) {
          // AI tried to create a brief but fields are missing — ask for them
          const missing = missingRequired.join(', ');
          const retryMsg = `I noticed the brief is missing some details (${missing}). Could you help me fill those in? Let's make sure everything is perfect.`;
          setMessages(prev => [...prev, { role: 'ai', text: retryMsg }]);
          llmMessagesRef.current.push({ role: 'assistant', content: retryMsg });
        }
      },
      // onError
      (errMsg) => {
        if (streamDebounceRef.current) { clearTimeout(streamDebounceRef.current); streamDebounceRef.current = null; }
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
      // Initialize version tracking (local, no DB yet)
      const initialVersion: ImageVersion = {
        id: `local-${Date.now()}`,
        project_id: '',
        parent_version_id: null,
        image_url: result.url,
        prompt,
        edit_instruction: null,
        mask_path: null,
        edit_type: 'generation',
        version_number: 1,
        is_current: true,
        created_at: new Date().toISOString(),
      };
      setImageVersions([initialVersion]);
      setCurrentVersionId(initialVersion.id);
    } else {
      toast({ title: 'Image generation failed', description: result.error || 'Please try again', variant: 'destructive' });
    }
    setPhase('done');
  }, [briefData, toast]);

  // ─── Regenerate Image ────────────────────────────────────
  const handleRegenerateImage = useCallback(async () => {
    if (!briefData) return;
    setPhase('generating_image');
    const styleTags = briefData.style.split(',').map(s => s.trim()).filter(Boolean);
    const prompt = buildImagePrompt(briefData.description, briefData.category, styleTags, briefData.materials);

    const result = await generateImage(prompt, null);
    if (result.url) {
      setConceptImageUrl(result.url);
      const newVersion: ImageVersion = {
        id: `local-${Date.now()}`,
        project_id: '',
        parent_version_id: null,
        image_url: result.url,
        prompt,
        edit_instruction: null,
        mask_path: null,
        edit_type: 'generation',
        version_number: 1,
        is_current: true,
        created_at: new Date().toISOString(),
      };
      setImageVersions([newVersion]);
      setCurrentVersionId(newVersion.id);
    } else {
      toast({ title: 'Regeneration failed', description: result.error || 'Please try again', variant: 'destructive' });
    }
    setPhase('done');
  }, [briefData, toast]);

  // ─── Image Editing ──────────────────────────────────────
  const handleStartEditImage = useCallback(() => {
    setPhase('editing_image');
  }, []);

  const handleNewVersion = useCallback((url: string, versionId: string) => {
    const nextNum = imageVersions.length + 1;
    const newVersion: ImageVersion = {
      id: versionId || `local-${Date.now()}`,
      project_id: '',
      parent_version_id: currentVersionId,
      image_url: url,
      prompt: null,
      edit_instruction: 'edited',
      mask_path: null,
      edit_type: 'global_edit',
      version_number: nextNum,
      is_current: true,
      created_at: new Date().toISOString(),
    };
    setImageVersions(prev => [...prev, newVersion]);
    setCurrentVersionId(newVersion.id);
    setConceptImageUrl(url);
  }, [imageVersions.length, currentVersionId]);

  const handleRevert = useCallback((version: ImageVersion) => {
    setConceptImageUrl(version.image_url);
    setCurrentVersionId(version.id);
  }, []);

  const handleDoneEditing = useCallback(() => {
    setPhase('done');
  }, []);

  // ─── Field Editing ──────────────────────────────────────
  const handleEditField = useCallback((field: string, _stepIndex: number) => {
    if (!briefData) return;
    setEditingField(field);

    // Map shared field names back to internal brief keys
    const fieldLabelMap: Record<string, string> = {
      category: 'Category',
      style_tags: 'Style',
      budget: 'Budget',
      size: 'Size/Dimensions',
      materials: 'Materials',
      timeline: 'Timeline',
    };
    const internalKeyMap: Record<string, keyof InternalBriefData> = {
      category: 'category',
      style_tags: 'style',
      budget: 'budget',
      size: 'dimensions',
      materials: 'materials',
      timeline: 'timeline',
    };

    const internalKey = internalKeyMap[field];
    const currentVal = internalKey ? briefData[internalKey] : '';
    const label = fieldLabelMap[field] || field;

    // Add AI prompt message
    setMessages(prev => [...prev, {
      role: 'ai',
      text: `Sure! Let's update the **${label}**. Current value: **${currentVal}**. What would you like to change it to?`,
    }]);

    // Pre-select current styles if editing style
    if (field === 'style_tags') {
      setSelectedStyles(briefData.style.split(',').map(s => s.trim()).filter(Boolean));
    }
  }, [briefData]);

  const handleFieldUpdate = useCallback((field: string, value: string) => {
    if (!briefData) return;

    const internalKeyMap: Record<string, keyof InternalBriefData> = {
      category: 'category',
      style_tags: 'style',
      budget: 'budget',
      size: 'dimensions',
      materials: 'materials',
      timeline: 'timeline',
    };

    const internalKey = internalKeyMap[field];
    if (internalKey) {
      setBriefData(prev => prev ? { ...prev, [internalKey]: value } : prev);
    }

    setEditingField(null);
    setSelectedStyles([]);
    setMessages(prev => [...prev, {
      role: 'ai',
      text: `Updated! I've changed that to **${value}**.`,
    }]);
  }, [briefData]);

  /** Direct update from sidebar inline input — no chat message, just update state */
  const handleDirectFieldUpdate = useCallback((field: string, value: string) => {
    const internalKeyMap: Record<string, keyof InternalBriefData> = {
      category: 'category',
      style_tags: 'style',
      budget: 'budget',
      size: 'dimensions',
      materials: 'materials',
      timeline: 'timeline',
    };

    if (briefData) {
      // Brief phase — update briefData directly
      const internalKey = internalKeyMap[field];
      if (internalKey) {
        setBriefData(prev => prev ? { ...prev, [internalKey]: value } : prev);
      }
    } else {
      // Chatting phase — update progress overrides (keys match extractProgress output)
      const progressKeyMap: Record<string, string> = {
        category: 'category',
        style_tags: 'style',
        budget: 'budget',
        size: 'dimensions',
        materials: 'materials',
        timeline: 'timeline',
      };
      const progressKey = progressKeyMap[field] || field;
      setProgressOverrides(prev => ({ ...prev, [progressKey]: value }));
    }
  }, [briefData]);

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
    <div className="fixed inset-0 bg-[#FDFCF8] flex overflow-hidden">
      {/* Progress Sidebar */}
      <ProgressSidebar
        items={PROGRESS_ITEMS}
        briefData={briefData ? toProgressBriefData(briefData) : progressToSharedBrief(progress)}
        editingField={editingField}
        phase={phase}
        onEditField={handleEditField}
        onDirectUpdate={handleDirectFieldUpdate}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
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
        <div ref={scrollRef} onScroll={handleScrollEvent} className="flex-1 min-h-0 overflow-y-auto px-6 py-6 scroll-smooth">
          <div className="flex flex-col min-h-full">
          {/* Empty state — centered; or spacer that pushes messages to bottom */}
          {messages.length === 0 && !isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
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
          ) : (
            <div className="flex-1" /> /* spacer pushes messages to bottom */
          )}

          {/* Message bubbles */}
          <div className="space-y-4">
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
                      <MemoMarkdown text={msg.text} />
                    </div>
                  )}
                  {msg.images && msg.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {msg.images.map((url, j) => (
                        <img key={j} src={url} alt="" loading="lazy" className="rounded-lg w-full h-24 object-cover" />
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

          {/* Chip selectors for field editing */}
          {editingField === 'category' && (
            <SingleChipSelector
              options={CATEGORY_OPTIONS}
              onSelect={(val) => handleFieldUpdate('category', val)}
            />
          )}
          {editingField === 'style_tags' && (
            <MultiChipSelector
              options={STYLE_OPTIONS}
              selected={selectedStyles}
              onToggle={(val) => setSelectedStyles(prev =>
                prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
              )}
              onConfirm={() => handleFieldUpdate('style_tags', selectedStyles.join(', '))}
            />
          )}

          {/* Brief Card */}
          {phase !== 'chatting' && phase !== 'editing_image' && briefData && (
            <BriefCard
              brief={toBriefDisplayData(briefData)}
              phase={phase as 'brief' | 'generating_image' | 'editing_image' | 'done'}
              conceptImageUrl={conceptImageUrl}
              submitting={submitting}
              imageUploading={imageUploading}
              uploadedImages={uploadedImages}
              onGenerateImage={handleGenerateImage}
              onSubmit={handleSubmit}
              onEditImage={handleStartEditImage}
              onRegenerate={handleRegenerateImage}
              onBriefFileDrop={handleBriefFileDrop}
              onBriefFileSelect={handleBriefFileSelect}
              onRemoveBriefImage={(i) => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
              briefFileInputRef={briefFileInputRef}
            />
          )}

          {/* Image Editor */}
          {phase === 'editing_image' && conceptImageUrl && (
            <ImageEditor
              currentImageUrl={conceptImageUrl}
              currentVersionId={currentVersionId}
              projectId={null}
              versions={imageVersions}
              onNewVersion={handleNewVersion}
              onRevert={handleRevert}
              onDone={handleDoneEditing}
            />
          )}

          <div style={{ height: 1 }} />
          </div> {/* end space-y-4 messages wrapper */}
          </div> {/* end min-h-full flex col */}
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <div className="relative">
            <button
              onClick={scrollToBottom}
              className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-white border border-[#C05621]/15 shadow-md flex items-center justify-center hover:bg-[#C05621]/5 transition-colors"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 text-[#C05621]" />
            </button>
          </div>
        )}

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

