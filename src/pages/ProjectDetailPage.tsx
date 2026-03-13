import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useOffers } from '@/hooks/useOffers';
import { useMessages } from '@/hooks/useMessages';
import { useImageUpload } from '@/hooks/useImageUpload';
import { AppLayout } from '@/components/app/AppLayout';
import { categories, styleOptions } from '@/lib/data';
import type { Project } from '@/lib/database.types';
import {
  ArrowLeft, Send, DollarSign, Clock, Star, Check,
  Loader2, MessageSquare, Image as ImageIcon, Tag, Wallet, Sparkles,
  Pencil, X, Save, Plus, Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Status Config ──────────────────────────────────────────
const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-muted/80', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50' },
  sent: { label: 'Sent to designers', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  offers_received: { label: 'Offers received', bg: 'bg-accent/15', text: 'text-accent-foreground', dot: 'bg-accent' },
  in_progress: { label: 'In progress', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};

// ─── Editable Field Wrapper ─────────────────────────────────
function EditableField({
  label,
  value,
  editing,
  onSave,
  type = 'text',
  icon: Icon,
}: {
  label: string;
  value: string;
  editing: boolean;
  onSave: (val: string) => void;
  type?: 'text' | 'textarea' | 'number';
  icon?: React.ElementType;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (!editing) {
    return (
      <div className="flex items-start gap-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
          <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{value || '—'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-1.5 shrink-0" />}
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
        {type === 'textarea' ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSave(draft)}
            className="mt-1 min-h-[80px]"
          />
        ) : (
          <Input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSave(draft)}
            className="mt-1 h-9"
          />
        )}
      </div>
    </div>
  );
}

// ─── Tag Selector ───────────────────────────────────────────
function TagSelector({
  label,
  selected,
  options,
  editing,
  onSave,
}: {
  label: string;
  selected: string[];
  options: string[];
  editing: boolean;
  onSave: (tags: string[]) => void;
}) {
  if (!editing) {
    return (
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide ml-7">{label}</span>
        <div className="flex flex-wrap gap-1.5 mt-1.5 ml-7">
          {selected.map((tag) => (
            <span key={tag} className="px-2.5 py-1 bg-secondary rounded-full text-xs font-medium text-secondary-foreground">
              {tag}
            </span>
          ))}
          {selected.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
        </div>
      </div>
    );
  }

  const toggle = (tag: string) => {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    onSave(next);
  };

  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide ml-7">{label}</span>
      <div className="flex flex-wrap gap-1.5 mt-1.5 ml-7">
        {options.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggle(tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ProjectDetailPage = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [fetched, setFetched] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [completing, setCompleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Project>>({});

  const loading = authLoading || (!fetched && !!user);
  const { uploading, uploadImage } = useImageUpload();

  const { offers, fetchOffersForProject } = useOffers(id);
  const [businessMap, setBusinessMap] = useState<Record<string, any>>({});
  const { messages, sendMessage } = useMessages(id);

  const isOwner = user && project && user.id === project.customer_id;
  const canEdit = isOwner && project?.status !== 'completed';

  // Smart scroll
  const handleChatScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fetch project
  useEffect(() => {
    if (authLoading) return;
    if (!id || !user) { setFetched(true); return; }

    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[ProjectDetail] fetch error:', error.message);
        setProject(null);
      } else {
        setProject(data as Project);
      }
      setFetched(true);
    };
    fetchProject();
  }, [id, authLoading, user]);

  // Fetch businesses for offers
  useEffect(() => {
    if (offers.length === 0) return;
    const bizIds = [...new Set(offers.map(o => o.business_id))];
    const fetchBusinesses = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .in('id', bizIds);
      if (data) {
        const map: Record<string, any> = {};
        for (const biz of data) map[biz.id] = biz;
        setBusinessMap(map);
      }
    };
    fetchBusinesses();
  }, [offers]);

  // ─── Edit Handlers ──────────────────────────────────────
  const startEditing = () => {
    if (!project) return;
    setEditDraft({
      title: project.title,
      description: project.description,
      category: project.category,
      style_tags: [...project.style_tags],
      budget_min: project.budget_min,
      budget_max: project.budget_max,
      details: { ...project.details as Record<string, unknown> },
      inspiration_images: [...project.inspiration_images],
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditDraft({});
  };

  const updateDraft = (field: string, value: unknown) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateDetailField = (field: string, value: unknown) => {
    setEditDraft((prev) => ({
      ...prev,
      details: { ...(prev.details as Record<string, unknown> || {}), [field]: value },
    }));
  };

  const handleSaveEdits = async () => {
    if (!project || !id) return;
    setSaving(true);

    const updates: Partial<Project> = {};
    const draft = editDraft;

    // Only include changed fields
    if (draft.title !== undefined && draft.title !== project.title) updates.title = draft.title;
    if (draft.description !== undefined && draft.description !== project.description) updates.description = draft.description;
    if (draft.category !== undefined && draft.category !== project.category) updates.category = draft.category;
    if (draft.style_tags !== undefined && JSON.stringify(draft.style_tags) !== JSON.stringify(project.style_tags)) updates.style_tags = draft.style_tags;
    if (draft.budget_min !== undefined && draft.budget_min !== project.budget_min) updates.budget_min = draft.budget_min;
    if (draft.budget_max !== undefined && draft.budget_max !== project.budget_max) updates.budget_max = draft.budget_max;
    if (draft.details !== undefined && JSON.stringify(draft.details) !== JSON.stringify(project.details)) updates.details = draft.details as Record<string, unknown>;
    if (draft.inspiration_images !== undefined && JSON.stringify(draft.inspiration_images) !== JSON.stringify(project.inspiration_images)) updates.inspiration_images = draft.inspiration_images;

    if (Object.keys(updates).length === 0) {
      toast({ title: 'No changes', description: 'Nothing was modified.' });
      setEditing(false);
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Update local state
    setProject((prev) => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : prev);

    // If project was already sent to creators, notify them
    if (project.status !== 'draft') {
      await supabase.from('messages').insert({
        project_id: id,
        sender_id: user!.id,
        sender_type: 'customer',
        content: '📋 The project brief has been updated — please review the latest changes before submitting your offer.',
      });
    }

    toast({ title: 'Project updated', description: 'Your changes have been saved.' });
    setEditing(false);
    setSaving(false);
  };

  // ─── Image Handling ─────────────────────────────────────
  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImages = (editDraft.inspiration_images as string[]) || [];
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const url = await uploadImage(file, 'project-images');
      if (url) newUrls.push(url);
    }

    updateDraft('inspiration_images', [...currentImages, ...newUrls]);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const current = (editDraft.inspiration_images as string[]) || [];
    updateDraft('inspiration_images', current.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const { error } = await sendMessage(newMessage, 'customer');
    if (!error) setNewMessage('');
  };

  const handleMarkComplete = async () => {
    if (!id) return;
    setCompleting(true);
    const { error } = await supabase
      .from('projects')
      .update({ status: 'completed' })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setProject(prev => prev ? { ...prev, status: 'completed' } : prev);
      toast({ title: 'Project completed!', description: 'This project has been marked as finished.' });
    }
    setCompleting(false);
  };

  const handleAcceptOffer = async (offerId: string) => {
    const { error } = await supabase
      .from('offers')
      .update({ status: 'accepted' })
      .eq('id', offerId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    await supabase
      .from('projects')
      .update({ status: 'in_progress' })
      .eq('id', id);
    setProject(prev => prev ? { ...prev, status: 'in_progress' } : prev);

    toast({
      title: 'Offer accepted!',
      description: "The creator has been notified. They'll be in touch soon.",
    });
    fetchOffersForProject(id);
  };

  // ─── Loading / Not Found ──────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif mb-4">Project not found</h1>
          <Link to="/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[project.status] || statusConfig.draft;
  const acceptedOffer = offers.find(o => o.status === 'accepted');
  const hasChat = !!acceptedOffer;
  const details = (editing ? editDraft.details : project.details) as Record<string, any> || {};
  const currentImages = editing ? (editDraft.inspiration_images as string[] || []) : project.inspiration_images;
  const currentStyleTags = editing ? (editDraft.style_tags as string[] || []) : project.style_tags;

  return (
    <AppLayout>
      <main className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>

          {/* Edit Controls */}
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={startEditing} className="gap-2">
              <Pencil className="w-3.5 h-3.5" />
              Edit Project
            </Button>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving} className="gap-2">
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdits} disabled={saving} className="gap-2">
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-3.5 h-3.5" />Save Changes</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Edit mode banner */}
        {editing && (
          <div className="mb-6 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary flex items-center gap-2">
            <Pencil className="w-4 h-4 shrink-0" />
            You're editing this project. Click fields to modify them, then save your changes.
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ═══ Main Column ═══ */}
          <div className="lg:col-span-2 space-y-8 animate-fade-in">
            {/* ─── Project Header ─── */}
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} mb-4`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label>
                    <Input
                      value={(editDraft.title as string) || ''}
                      onChange={(e) => updateDraft('title', e.target.value)}
                      className="mt-1 text-2xl font-serif h-auto py-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                    <Textarea
                      value={(editDraft.description as string) || ''}
                      onChange={(e) => updateDraft('description', e.target.value)}
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-serif mb-3">{project.title}</h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">{project.description}</p>
                </>
              )}

              {project.status === 'in_progress' && !editing && (
                <Button onClick={handleMarkComplete} disabled={completing} className="mt-5 gap-2">
                  {completing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Completing...</>
                  ) : (
                    <><Check className="h-4 w-4" />Mark as Complete</>
                  )}
                </Button>
              )}
            </div>

            {/* ─── AI Concept Visual Anchor ─── */}
            {project.ai_concept && (
              <Card className="overflow-hidden">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={project.ai_concept}
                    alt="AI concept visualization"
                    className="w-full h-full object-cover"
                  />
                </div>
              </Card>
            )}

            {/* ─── Offers Section ─── */}
            {offers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl">Offers from Designers</h2>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {offers.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {offers.map((offer) => {
                    const business = businessMap[offer.business_id];
                    const isAccepted = offer.status === 'accepted';

                    return (
                      <Card
                        key={offer.id}
                        className={isAccepted ? 'ring-2 ring-primary/60 border-primary/20' : ''}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-lg font-serif text-primary">
                                  {business?.name?.charAt(0) ?? '?'}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{business?.name ?? 'Creator'}</h3>
                                {business && (
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                                    <span>{business.rating}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {isAccepted ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                <Check className="w-4 h-4" />
                                Accepted
                              </div>
                            ) : (
                              <Button onClick={() => handleAcceptOffer(offer.id)} size="sm">
                                Accept Offer
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl mb-3">
                            <div className="flex items-center gap-2.5">
                              <DollarSign className="w-4 h-4 text-primary" />
                              <div>
                                <div className="text-xs text-muted-foreground">Price</div>
                                <div className="text-sm font-semibold">${offer.price.toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Clock className="w-4 h-4 text-primary" />
                              <div>
                                <div className="text-xs text-muted-foreground">Timeline</div>
                                <div className="text-sm font-semibold">{offer.timeline}</div>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground leading-relaxed">{offer.note}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Chat Section ─── */}
            {hasChat && (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/60 bg-muted/30">
                  <MessageSquare className="w-4.5 h-4.5 text-primary" />
                  <h2 className="font-semibold text-foreground">Messages</h2>
                  {messages.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col" style={{ maxHeight: '32rem' }}>
                  <div ref={chatContainerRef} onScroll={handleChatScroll} className="space-y-3 flex-1 min-h-0 overflow-y-auto mb-4 scroll-smooth">
                    {messages.map((msg) => {
                      const isCustomer = msg.sender_type === 'customer';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              isCustomer
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted/70 text-foreground rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <span
                              className={`text-[11px] mt-1 block ${
                                isCustomer ? 'text-primary-foreground/60' : 'text-muted-foreground'
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {messages.length === 0 && (
                      <div className="text-center py-10">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No messages yet. Start the conversation!
                        </p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex gap-2.5">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="h-11"
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-4.5 h-4.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* ═══ Sidebar ═══ */}
          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {/* Project Details */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-serif text-lg mb-4">Project Details</h3>
                <div className="space-y-4">
                  {/* Category */}
                  {editing ? (
                    <div className="flex items-start gap-3">
                      <Tag className="w-4 h-4 text-muted-foreground mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                        <select
                          value={(editDraft.category as string) || ''}
                          onChange={(e) => updateDraft('category', e.target.value)}
                          className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Category</span>
                        <p className="text-sm font-medium text-foreground">{project.category}</p>
                      </div>
                    </div>
                  )}

                  {/* Budget */}
                  {editing ? (
                    <div className="flex items-start gap-3">
                      <Wallet className="w-4 h-4 text-muted-foreground mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Budget</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            value={editDraft.budget_min ?? ''}
                            onChange={(e) => updateDraft('budget_min', parseInt(e.target.value) || 0)}
                            placeholder="Min"
                            className="h-9"
                          />
                          <span className="text-muted-foreground self-center">–</span>
                          <Input
                            type="number"
                            value={editDraft.budget_max ?? ''}
                            onChange={(e) => updateDraft('budget_max', parseInt(e.target.value) || 0)}
                            placeholder="Max"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Wallet className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Budget</span>
                        <p className="text-sm font-medium text-foreground">
                          ${project.budget_min.toLocaleString()} – ${project.budget_max.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Style Tags */}
                  <TagSelector
                    label="Style"
                    selected={currentStyleTags}
                    options={styleOptions}
                    editing={editing}
                    onSave={(tags) => updateDraft('style_tags', tags)}
                  />

                  {/* Timeline */}
                  <EditableField
                    label="Timeline"
                    value={details?.timing || ''}
                    editing={editing}
                    onSave={(val) => updateDetailField('timing', val)}
                    icon={Clock}
                  />

                  {/* Size */}
                  {(details?.size || editing) && (
                    <EditableField
                      label="Size"
                      value={details?.size || ''}
                      editing={editing}
                      onSave={(val) => updateDetailField('size', val)}
                    />
                  )}

                  {/* Materials */}
                  {(details?.materials?.length > 0 || editing) && (
                    <EditableField
                      label="Materials"
                      value={Array.isArray(details?.materials) ? details.materials.join(', ') : (details?.materials || '')}
                      editing={editing}
                      onSave={(val) => updateDetailField('materials', val.split(',').map((s: string) => s.trim()).filter(Boolean))}
                    />
                  )}

                  {/* Special Requirements */}
                  {(details?.special_requirements || editing) && (
                    <EditableField
                      label="Special Requirements"
                      value={details?.special_requirements || ''}
                      editing={editing}
                      onSave={(val) => updateDetailField('special_requirements', val)}
                      type="textarea"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inspiration Images */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-serif text-lg">Inspiration</h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {currentImages.map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative group">
                      <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      {editing && (
                        <button
                          onClick={() => handleRemoveImage(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {editing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          <span className="text-[10px]">Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {currentImages.length === 0 && !editing && (
                  <p className="text-sm text-muted-foreground text-center py-4">No inspiration images</p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleAddImages}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default ProjectDetailPage;
