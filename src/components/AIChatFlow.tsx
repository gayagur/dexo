import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import {
  getConceptImageUrl,
  preloadImage,
  buildImagePrompt,
} from '@/lib/pollinations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  Loader2,
  Check,
  Palette,
  Ruler,
  Clock,
  DollarSign,
  Tag,
  Package,
  Star,
  ArrowRight,
  ImageIcon,
} from 'lucide-react';

// ─── Chat Flow Definition ───────────────────────────────────────
interface ChatStep {
  id: string;
  message: string;
  field: string;
  type: 'free_text' | 'chips' | 'chips_multi';
  options?: string[];
  placeholder?: string;
}

const CHAT_FLOW: ChatStep[] = [
  {
    id: 'greeting',
    message: "Hi! I'm your personal design consultant. Tell me — what kind of custom piece are you dreaming of?",
    field: 'description',
    type: 'free_text',
    placeholder: "Describe your idea...",
  },
  {
    id: 'category',
    message: "Great idea! Which category fits best?",
    field: 'category',
    type: 'chips',
    options: ['Jewelry', 'Custom Cakes', 'Furniture', 'Fashion', 'Ceramics', 'Personalized Gifts', 'Textiles', '3D Printing'],
  },
  {
    id: 'style',
    message: "What style are you going for?",
    field: 'style_tags',
    type: 'chips_multi',
    options: ['Minimalist', 'Modern', 'Vintage', 'Bohemian', 'Classic', 'Industrial', 'Rustic', 'Glamorous', 'Playful', 'Organic'],
  },
  {
    id: 'budget',
    message: "What's your budget range?",
    field: 'budget',
    type: 'chips',
    options: ['Under $100', '$100-$500', '$500-$1,000', '$1,000-$5,000', '$5,000+'],
  },
  {
    id: 'size',
    message: "Any specific size or dimensions?",
    field: 'size',
    type: 'free_text',
    placeholder: "e.g., 45cm chain, A4 size, 2m wide...",
  },
  {
    id: 'materials',
    message: "Any material preferences?",
    field: 'materials',
    type: 'free_text',
    placeholder: "e.g., 18k gold, oak wood, fondant...",
  },
  {
    id: 'timeline',
    message: "When do you need it by?",
    field: 'timeline',
    type: 'chips',
    options: ['No rush', '2-4 weeks', '1-2 months', '3+ months', 'Specific date'],
  },
  {
    id: 'special',
    message: "Anything else I should know? Special requirements, engraving, personalization?",
    field: 'special_requirements',
    type: 'free_text',
    placeholder: "Any special details...",
  },
];

// ─── Category Detection ─────────────────────────────────────────
function detectCategory(text: string): string | null {
  const lower = text.toLowerCase();
  if (/ring|necklace|bracelet|earring|pendant|gold\b|silver\b|jewel/i.test(lower)) return 'Jewelry';
  if (/cake|cupcake|pastry|bakery|birthday cake|wedding cake/i.test(lower)) return 'Custom Cakes';
  if (/table|chair|desk|shelf|cabinet|bed|sofa|bench|wood\s*work|furniture/i.test(lower)) return 'Furniture';
  if (/dress|suit|shirt|jacket|coat|gown|tailor|cloth|fashion/i.test(lower)) return 'Fashion';
  if (/vase|bowl|mug|pot|planter|ceramic|pottery|clay/i.test(lower)) return 'Ceramics';
  if (/gift|engrav|personali[sz]|monogram/i.test(lower)) return 'Personalized Gifts';
  if (/rug|tapestry|curtain|pillow|blanket|quilt|embroidery|textile/i.test(lower)) return 'Textiles';
  if (/3d\s*print|prototype|figurine|model|filament/i.test(lower)) return '3D Printing';
  return null;
}

// ─── Budget Parsing ─────────────────────────────────────────────
function parseBudgetMin(budget: string): number {
  if (budget.includes('Under')) return 0;
  const match = budget.match(/\$([\d,]+)/);
  return match ? parseInt(match[1].replace(',', ''), 10) : 0;
}
function parseBudgetMax(budget: string): number {
  if (budget.includes('5,000+')) return 10000;
  if (budget.includes('Under')) return 100;
  const matches = [...budget.matchAll(/\$([\d,]+)/g)];
  if (matches.length >= 2) return parseInt(matches[1][1].replace(',', ''), 10);
  return parseInt((matches[0]?.[1] || '0').replace(',', ''), 10);
}

// ─── Brief Generation ───────────────────────────────────────────
interface BriefData {
  description: string;
  category: string;
  style_tags: string[];
  budget: string;
  size: string;
  materials: string;
  timeline: string;
  special_requirements: string;
}

function generateBrief(data: BriefData) {
  const titleDesc = data.description.length > 50
    ? data.description.slice(0, 50) + '...'
    : data.description;
  return {
    title: `Custom ${data.category} — ${titleDesc}`,
    category: data.category,
    description: data.description,
    style_tags: data.style_tags,
    budget_min: parseBudgetMin(data.budget),
    budget_max: parseBudgetMax(data.budget),
    materials: data.materials ? [data.materials] : [],
    dimensions: data.size || 'To be discussed',
    deadline: data.timeline,
    special_requirements: data.special_requirements || '',
  };
}

// ─── Message Types ──────────────────────────────────────────────
interface Message {
  role: 'ai' | 'user';
  text: string;
}

// ─── Progress Item Icons ────────────────────────────────────────
const PROGRESS_ITEMS = [
  { field: 'category', label: 'Category', icon: Tag },
  { field: 'style_tags', label: 'Style', icon: Palette },
  { field: 'budget', label: 'Budget', icon: DollarSign },
  { field: 'size', label: 'Size', icon: Ruler },
  { field: 'materials', label: 'Materials', icon: Package },
  { field: 'timeline', label: 'Timeline', icon: Clock },
];

// ─── Typing Indicator ───────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-[#C05621]/50"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function AIChatFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProject } = useProjects();
  const { toast } = useToast();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(true); // starts with greeting typing
  const [inputValue, setInputValue] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [briefData, setBriefData] = useState<Partial<BriefData>>({});
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [awaitingCategoryConfirm, setAwaitingCategoryConfirm] = useState(false);

  // Phase: chatting | brief | generating_image | done
  const [phase, setPhase] = useState<'chatting' | 'brief' | 'generating_image' | 'done'>('chatting');
  const [conceptImageUrl, setConceptImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Show greeting after initial typing delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([{ role: 'ai', text: CHAT_FLOW[0].message }]);
      setIsTyping(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Focus input when typing indicator disappears
  useEffect(() => {
    if (!isTyping && phase === 'chatting') {
      inputRef.current?.focus();
    }
  }, [isTyping, phase]);

  const currentStepData = CHAT_FLOW[currentStep];

  // Advance to next step with typing animation
  const advanceStep = useCallback((nextStepIndex: number) => {
    if (nextStepIndex >= CHAT_FLOW.length) {
      // All questions done — show brief
      setPhase('brief');
      return;
    }
    setCurrentStep(nextStepIndex);
    setIsTyping(true);
    setSelectedChips([]);
    setInputValue('');

    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'ai', text: CHAT_FLOW[nextStepIndex].message }]);
      setIsTyping(false);
    }, 600);
  }, []);

  // Handle user sending a free text answer
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInputValue('');

    const step = CHAT_FLOW[currentStep];

    // Step 0 (greeting/description): detect category
    if (step.id === 'greeting') {
      setBriefData((prev) => ({ ...prev, description: text }));
      const detected = detectCategory(text);
      if (detected) {
        setDetectedCategory(detected);
        setAwaitingCategoryConfirm(true);
        setIsTyping(true);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: 'ai', text: `Sounds like ${detected}! Is that right?` },
          ]);
          setIsTyping(false);
        }, 600);
      } else {
        // No category detected — skip to category chips
        advanceStep(1);
      }
      return;
    }

    // Save free text data
    setBriefData((prev) => ({ ...prev, [step.field]: text }));
    advanceStep(currentStep + 1);
  }, [inputValue, currentStep, advanceStep]);

  // Handle chip selection (single)
  const handleChipSelect = useCallback((value: string) => {
    setMessages((prev) => [...prev, { role: 'user', text: value }]);
    const step = CHAT_FLOW[currentStep];
    setBriefData((prev) => ({ ...prev, [step.field]: value }));
    advanceStep(currentStep + 1);
  }, [currentStep, advanceStep]);

  // Handle category confirm/change
  const handleCategoryConfirm = useCallback((confirmed: boolean) => {
    if (confirmed && detectedCategory) {
      setMessages((prev) => [...prev, { role: 'user', text: `Yes, ${detectedCategory}!` }]);
      setBriefData((prev) => ({ ...prev, category: detectedCategory }));
      setAwaitingCategoryConfirm(false);
      // Skip the category step (index 1), go to style (index 2)
      advanceStep(2);
    } else {
      setMessages((prev) => [...prev, { role: 'user', text: "Let me pick a different one." }]);
      setAwaitingCategoryConfirm(false);
      // Show category chips
      advanceStep(1);
    }
  }, [detectedCategory, advanceStep]);

  // Handle multi-chip confirm (style tags)
  const handleMultiChipConfirm = useCallback(() => {
    if (selectedChips.length === 0) return;
    setMessages((prev) => [...prev, { role: 'user', text: selectedChips.join(', ') }]);
    const step = CHAT_FLOW[currentStep];
    setBriefData((prev) => ({ ...prev, [step.field]: selectedChips }));
    advanceStep(currentStep + 1);
  }, [selectedChips, currentStep, advanceStep]);

  const toggleChip = useCallback((value: string) => {
    setSelectedChips((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }, []);

  // ─── Image Generation ───────────────────────────────────────
  const handleGenerateImage = useCallback(async () => {
    setPhase('generating_image');
    const data = briefData as BriefData;
    const prompt = buildImagePrompt(data.description, data.category, data.style_tags || []);
    const url = getConceptImageUrl(prompt);
    const loaded = await preloadImage(url);
    setConceptImageUrl(loaded ? url : null);
    setPhase('done');
  }, [briefData]);

  // ─── Submit Project ─────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!user) {
      toast({ title: 'Please sign in first', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const data = briefData as BriefData;
    const brief = generateBrief(data);

    const { error } = await createProject({
      customer_id: user.id,
      title: brief.title,
      description: brief.description,
      category: brief.category,
      style_tags: brief.style_tags,
      budget_min: brief.budget_min,
      budget_max: brief.budget_max,
      details: {
        dimensions: brief.dimensions,
        deadline: brief.deadline,
        materials: brief.materials,
        special_requirements: brief.special_requirements,
      },
      inspiration_images: conceptImageUrl ? [conceptImageUrl] : [],
      ai_brief: `${brief.description}. Style: ${brief.style_tags.join(', ')}. Materials: ${brief.materials.join(', ')}. Dimensions: ${brief.dimensions}. Deadline: ${brief.deadline}.`,
      ai_concept: conceptImageUrl,
      status: 'open',
    });

    setSubmitting(false);
    if (error) {
      toast({ title: 'Error creating project', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Project created!' });
      navigate('/dashboard');
    }
  }, [user, briefData, conceptImageUrl, createProject, navigate, toast]);

  // ─── Key handler ────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Brief Data for display ─────────────────────────────────
  const finalBrief = phase !== 'chatting' ? generateBrief(briefData as BriefData) : null;

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#FDFCF8] flex">
      {/* ─── Sidebar: Brief Progress ─── */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-[#C05621]/[0.08] bg-white/50 p-6">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-[#C05621]" />
          <h2 className="font-serif text-lg font-bold text-[#1B2432]">Brief Progress</h2>
        </div>

        <div className="space-y-3 flex-1">
          {PROGRESS_ITEMS.map((item) => {
            const value = briefData[item.field as keyof BriefData];
            const filled = Array.isArray(value) ? value.length > 0 : !!value;
            const Icon = item.icon;
            return (
              <div
                key={item.field}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                  filled
                    ? 'bg-[#C05621]/[0.06] border border-[#C05621]/10'
                    : 'bg-white/60 border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    filled ? 'bg-[#C05621]/10 text-[#C05621]' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {filled ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#4A5568]">{item.label}</div>
                  {filled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-[#C05621] truncate mt-0.5"
                    >
                      {Array.isArray(value) ? (value as string[]).join(', ') : String(value)}
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
              {PROGRESS_ITEMS.filter((i) => {
                const v = briefData[i.field as keyof BriefData];
                return Array.isArray(v) ? v.length > 0 : !!v;
              }).length}
              /{PROGRESS_ITEMS.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#C05621]"
              initial={{ width: 0 }}
              animate={{
                width: `${
                  (PROGRESS_ITEMS.filter((i) => {
                    const v = briefData[i.field as keyof BriefData];
                    return Array.isArray(v) ? v.length > 0 : !!v;
                  }).length /
                    PROGRESS_ITEMS.length) *
                  100
                }%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </aside>

      {/* ─── Main Chat Area ─── */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#C05621]/[0.06] bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#C05621]/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-[#C05621]" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-[#1B2432]">DEXO Design Assistant</h1>
              <p className="text-xs text-[#4A5568]">Let's bring your idea to life</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-5 py-3 rounded-2xl text-[0.92rem] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#C05621] text-white rounded-br-md'
                      : 'bg-white border border-[#C05621]/[0.06] text-[#1B2432] rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-[#C05621]/[0.06] rounded-2xl rounded-bl-md shadow-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}

          {/* ─── Brief Card (phase: brief / done) ─── */}
          {(phase === 'brief' || phase === 'done') && finalBrief && (
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

              <h3 className="text-2xl font-serif font-bold text-[#1B2432]">{finalBrief.title}</h3>
              <p className="text-[#4A5568] leading-relaxed">{finalBrief.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
                  <span className="text-[#4A5568] text-xs">Category</span>
                  <p className="font-medium text-[#1B2432] mt-0.5">{finalBrief.category}</p>
                </div>
                <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
                  <span className="text-[#4A5568] text-xs">Budget</span>
                  <p className="font-medium text-[#1B2432] mt-0.5">${finalBrief.budget_min} – ${finalBrief.budget_max}</p>
                </div>
                <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
                  <span className="text-[#4A5568] text-xs">Timeline</span>
                  <p className="font-medium text-[#1B2432] mt-0.5">{finalBrief.deadline}</p>
                </div>
                <div className="bg-[#FDFCF8] rounded-xl p-3 border border-[#C05621]/[0.06]">
                  <span className="text-[#4A5568] text-xs">Dimensions</span>
                  <p className="font-medium text-[#1B2432] mt-0.5">{finalBrief.dimensions}</p>
                </div>
              </div>

              {finalBrief.style_tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {finalBrief.style_tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-[#C05621]/[0.07] text-[#C05621] text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {finalBrief.materials.length > 0 && finalBrief.materials[0] && (
                <p className="text-sm text-[#4A5568]">
                  <span className="font-medium text-[#1B2432]">Materials:</span> {finalBrief.materials.join(', ')}
                </p>
              )}

              {finalBrief.special_requirements && (
                <p className="text-sm text-[#4A5568]">
                  <span className="font-medium text-[#1B2432]">Special notes:</span> {finalBrief.special_requirements}
                </p>
              )}

              {/* Concept image */}
              {phase === 'done' && conceptImageUrl && (
                <div className="rounded-2xl overflow-hidden border border-[#C05621]/[0.08]">
                  <img src={conceptImageUrl} alt="AI concept" className="w-full h-64 object-cover" />
                </div>
              )}

              {phase === 'generating_image' && (
                <div className="flex items-center justify-center h-48 rounded-2xl bg-[#FDFCF8] border border-[#C05621]/[0.06]">
                  <Loader2 className="w-8 h-8 text-[#C05621] animate-spin" />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {phase === 'brief' && (
                  <>
                    <Button
                      onClick={handleGenerateImage}
                      className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl gap-2"
                      size="lg"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Generate Concept Image
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      variant="outline"
                      size="lg"
                      className="rounded-xl border-[#1B2432]/20 text-[#1B2432] gap-2"
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Skip Image & Submit
                    </Button>
                  </>
                )}
                {phase === 'done' && (
                  <Button
                    onClick={handleSubmit}
                    className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl gap-2"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirm & Find Creators
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ─── Input Area ─── */}
        {phase === 'chatting' && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-4 border-t border-[#C05621]/[0.06] bg-white/60 backdrop-blur-sm"
          >
            {/* Category confirm chips */}
            {awaitingCategoryConfirm && (
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => handleCategoryConfirm(true)}
                  className="px-4 py-2 rounded-full bg-[#C05621] text-white text-sm font-medium hover:bg-[#A84A1C] transition-colors"
                >
                  Yes, {detectedCategory}!
                </button>
                <button
                  onClick={() => handleCategoryConfirm(false)}
                  className="px-4 py-2 rounded-full bg-white border border-[#C05621]/20 text-[#1B2432] text-sm font-medium hover:bg-[#C05621]/5 transition-colors"
                >
                  No, let me pick
                </button>
              </div>
            )}

            {/* Single-select chips */}
            {!awaitingCategoryConfirm && currentStepData?.type === 'chips' && currentStepData.options && (
              <div className="flex flex-wrap gap-2 mb-3">
                {currentStepData.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleChipSelect(option)}
                    className="px-4 py-2 rounded-full bg-white border border-[#C05621]/15 text-[#1B2432] text-sm font-medium
                               hover:bg-[#C05621] hover:text-white hover:border-[#C05621] transition-all duration-200"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Multi-select chips (style tags) */}
            {!awaitingCategoryConfirm && currentStepData?.type === 'chips_multi' && currentStepData.options && (
              <div className="space-y-3 mb-3">
                <div className="flex flex-wrap gap-2">
                  {currentStepData.options.map((option) => {
                    const selected = selectedChips.includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => toggleChip(option)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          selected
                            ? 'bg-[#C05621] text-white border border-[#C05621]'
                            : 'bg-white border border-[#C05621]/15 text-[#1B2432] hover:border-[#C05621]/40'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 inline mr-1" />}
                        {option}
                      </button>
                    );
                  })}
                </div>
                {selectedChips.length > 0 && (
                  <Button
                    onClick={handleMultiChipConfirm}
                    size="sm"
                    className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-full"
                  >
                    Continue with {selectedChips.length} selected
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            )}

            {/* Free text input */}
            {!awaitingCategoryConfirm && (currentStepData?.type === 'free_text' || !currentStepData) && (
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentStepData?.placeholder || "Type your answer..."}
                  className="flex-1 px-4 py-3 rounded-xl border border-[#C05621]/10 bg-white text-[#1B2432]
                             placeholder:text-[#4A5568]/50 focus:outline-none focus:ring-2 focus:ring-[#C05621]/30
                             focus:border-[#C05621]/30 transition-all"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="bg-[#C05621] text-white hover:bg-[#A84A1C] rounded-xl h-12 w-12 p-0 flex-shrink-0
                             disabled:opacity-40"
                >
                  <Send className="w-4.5 h-4.5" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
