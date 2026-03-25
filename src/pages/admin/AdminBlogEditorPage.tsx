import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BlogCoverImageField } from "@/components/admin/blog/BlogCoverImageField";
import { BlogFaqEditor, type FaqDraft } from "@/components/admin/blog/BlogFaqEditor";
import { BlogTipTapField } from "@/components/admin/blog/BlogTipTapField";
import { useAdmin } from "@/hooks/useAdmin";
import {
  adminFetchFaqs,
  adminFetchPostById,
  adminInsertPost,
  adminReplaceFaqs,
  adminUpdatePost,
  isSlugTaken,
  publishPatch,
} from "@/lib/blog-api";
import { emptyBlogDoc } from "@/lib/blog-content";
import { slugifyTitle, isValidBlogSlug, normalizeBlogSlug } from "@/lib/blog-slug";
import type { BlogPost, BlogPostStatus } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Eye, Loader2, AlertTriangle } from "lucide-react";

function splitTags(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AdminBlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { fetchAnalytics } = useAdmin();
  const [pendingCount, setPendingCount] = useState(0);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [postId, setPostId] = useState<string | null>(isNew ? null : id!);

  const slugManual = useRef(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState<Record<string, unknown>>(emptyBlogDoc as Record<string, unknown>);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [category, setCategory] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [keywordsStr, setKeywordsStr] = useState("");
  const [status, setStatus] = useState<BlogPostStatus>("draft");
  const [featured, setFeatured] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [publishedAt, setPublishedAt] = useState("");

  const [faqs, setFaqs] = useState<FaqDraft[]>([]);

  useEffect(() => {
    let alive = true;
    fetchAnalytics()
      .then((a) => {
        if (alive) setPendingCount(a.pendingCreators);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fetchAnalytics]);

  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: post, error } = await adminFetchPostById(id);
    if (error || !post) {
      toast.error("Could not load post", { description: error });
      navigate("/admin/blog");
      return;
    }
    setPostId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    slugManual.current = true;
    setExcerpt(post.excerpt ?? "");
    setBody((post.content ?? emptyBlogDoc) as Record<string, unknown>);
    setCoverUrl(post.cover_image_url ?? "");
    setCoverAlt(post.cover_image_alt ?? "");
    setCategory(post.category ?? "");
    setTagsStr((post.tags ?? []).join(", "));
    setKeywordsStr((post.keywords ?? []).join(", "));
    setStatus(post.status);
    setFeatured(post.featured);
    setAuthorName(post.author_name ?? "");
    setMetaTitle(post.meta_title ?? "");
    setMetaDescription(post.meta_description ?? "");
    setPublishedAt(post.published_at ? post.published_at.slice(0, 16) : "");

    const { data: faqRows } = await adminFetchFaqs(post.id);
    setFaqs(
      (faqRows ?? []).map((f) => ({
        localKey: f.id,
        question: f.question,
        answer: f.answer,
      }))
    );
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    loadPost();
  }, [isNew, loadPost]);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugManual.current) {
      setSlug(slugifyTitle(v));
    }
  };

  const onSlugChange = (v: string) => {
    slugManual.current = true;
    setSlug(v);
  };

  const health = useMemo(() => {
    const warnings: string[] = [];
    if (!title.trim()) warnings.push("Title is empty.");
    if (!slug.trim() || !isValidBlogSlug(normalizeBlogSlug(slug)))
      warnings.push("Slug is missing or invalid (use lowercase letters, numbers, hyphens).");
    if (!metaDescription.trim()) warnings.push("Meta description is empty — important for SEO.");
    if (!coverUrl.trim()) warnings.push("No cover image — recommended for social previews.");
    if (faqs.length === 0) warnings.push("No FAQs — optional, but helps structured data when you add them.");
    return warnings;
  }, [title, slug, metaDescription, coverUrl, faqs.length]);

  const buildPayload = (): Omit<BlogPost, "id" | "created_at" | "updated_at"> => {
    const finalSlug = normalizeBlogSlug(slug);
    return {
      title: title.trim() || "Untitled draft",
      slug: finalSlug,
      excerpt: excerpt.trim() || null,
      content: body,
      content_format: "json",
      cover_image_url: coverUrl.trim() || null,
      cover_image_alt: coverAlt.trim() || null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      keywords: splitTags(keywordsStr),
      category: category.trim() || null,
      tags: splitTags(tagsStr),
      status,
      featured,
      author_name: authorName.trim() || null,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
    };
  };

  const saveFaqsFor = async (pid: string) => {
    const rows = faqs
      .filter((f) => f.question.trim() && f.answer.trim())
      .map((f, i) => ({
        question: f.question.trim(),
        answer: f.answer.trim(),
        sort_order: i,
      }));
    const { error } = await adminReplaceFaqs(pid, rows);
    if (error) toast.error("Saved post but FAQs failed", { description: error });
  };

  const saveDraft = async () => {
    const payload = { ...buildPayload(), status: "draft" as BlogPostStatus };
    if (!isValidBlogSlug(payload.slug)) {
      toast.error("Fix the slug before saving", { description: "Use lowercase letters, numbers, and single hyphens." });
      return;
    }
    const taken = await isSlugTaken(payload.slug, postId ?? undefined);
    if (taken) {
      toast.error("Slug already in use", { description: "Choose a unique slug." });
      return;
    }

    setSaving(true);
    if (isNew || !postId) {
      const { data, error } = await adminInsertPost(payload);
      setSaving(false);
      if (error || !data) {
        toast.error("Could not create post", { description: error });
        return;
      }
      setPostId(data.id);
      setStatus("draft");
      await saveFaqsFor(data.id);
      toast.success("Draft created");
      navigate(`/admin/blog/${data.id}`, { replace: true });
      return;
    }

    const { error } = await adminUpdatePost(postId, payload);
    setSaving(false);
    if (error) {
      toast.error("Save failed", { description: error });
      return;
    }
    setStatus("draft");
    await saveFaqsFor(postId);
    toast.success("Draft saved");
    await loadPost();
  };

  const savePublish = async () => {
    const base = buildPayload();
    if (!isValidBlogSlug(base.slug)) {
      toast.error("Fix the slug before publishing");
      return;
    }
    const taken = await isSlugTaken(base.slug, postId ?? undefined);
    if (taken) {
      toast.error("Slug already in use");
      return;
    }

    setSaving(true);
    if (isNew || !postId) {
      const { data, error } = await adminInsertPost({
        ...base,
        status: "published",
        published_at: new Date().toISOString(),
      });
      setSaving(false);
      if (error || !data) {
        toast.error("Could not publish", { description: error });
        return;
      }
      setPostId(data.id);
      setStatus("published");
      await saveFaqsFor(data.id);
      toast.success("Post published");
      navigate(`/admin/blog/${data.id}`, { replace: true });
      return;
    }

    const { data: existing } = await adminFetchPostById(postId);
    const pub = existing ? publishPatch(existing) : { status: "published" as const, published_at: new Date().toISOString() };
    const { error } = await adminUpdatePost(postId, {
      ...base,
      ...pub,
    });
    setSaving(false);
    if (error) {
      toast.error("Publish failed", { description: error });
      return;
    }
    setStatus("published");
    await saveFaqsFor(postId);
    toast.success("Published");
    await loadPost();
  };

  if (loading) {
    return (
      <AdminLayout pendingCount={pendingCount}>
        <div className="flex items-center justify-center py-32 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading editor…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pendingCount={pendingCount}>
      <Helmet>
        <title>{isNew ? "New post" : title || "Edit post"} · Blog · DEXO Admin</title>
      </Helmet>

      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl shrink-0" asChild>
              <Link to="/admin/blog">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-serif font-semibold text-gray-900">{isNew ? "New post" : "Edit post"}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Writing studio · changes are saved when you use the buttons below</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {postId ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-gray-200"
                onClick={() => window.open(`/admin/blog/preview/${postId}`, "_blank", "noopener,noreferrer")}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="rounded-xl border-gray-200" disabled={saving} onClick={() => saveDraft()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save draft
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#C05621] hover:bg-[#a84a1c] text-white"
              disabled={saving}
              onClick={() => savePublish()}
            >
              {status === "published" ? "Update published" : "Publish"}
            </Button>
          </div>
        </div>

        {health.length ? (
          <Alert variant="default" className="rounded-xl border-amber-200/80 bg-amber-50/80">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">Content health</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 mt-1 text-sm text-amber-900/90 space-y-0.5">
                {health.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-8 space-y-6">
            <Card className="rounded-2xl border-gray-100 shadow-sm">
              <CardContent className="p-6 sm:p-8 space-y-5">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="A clear, compelling headline"
                    className="mt-2 rounded-xl text-lg font-serif border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => onSlugChange(e.target.value)}
                    placeholder="url-friendly-slug"
                    className="mt-2 rounded-xl font-mono text-sm border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Excerpt</Label>
                  <Textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Short summary for cards and meta fallback"
                    className="mt-2 rounded-xl min-h-[88px] border-gray-200 resize-y"
                  />
                </div>
                <BlogCoverImageField url={coverUrl} alt={coverAlt} onUrlChange={setCoverUrl} onAltChange={setCoverAlt} disabled={saving} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Design tips"
                      className="mt-2 rounded-xl border-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</Label>
                    <Input
                      value={tagsStr}
                      onChange={(e) => setTagsStr(e.target.value)}
                      placeholder="comma, separated"
                      className="mt-2 rounded-xl border-gray-200"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">Body</Label>
                  <BlogTipTapField value={body} onChange={setBody} disabled={saving} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">FAQs</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <BlogFaqEditor items={faqs} onChange={setFaqs} disabled={saving} />
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-4 space-y-6">
            <Card className="rounded-2xl border-gray-100 shadow-sm sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as BlogPostStatus)}>
                    <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="feat" className="text-sm font-medium">
                      Featured
                    </Label>
                    <p className="text-xs text-gray-500">Highlight on the blog index</p>
                  </div>
                  <Switch id="feat" checked={featured} onCheckedChange={setFeatured} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Author display name</Label>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. DEXO Team"
                    className="mt-1.5 rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Published at</Label>
                  <Input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="mt-1.5 rounded-xl border-gray-200"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Set when scheduling; publishing fills this if empty.</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meta title</Label>
                  <Input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Defaults to post title"
                    className="mt-2 rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meta description</Label>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="~150 characters for search & social"
                    className="mt-2 rounded-xl min-h-[88px] border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Keywords</Label>
                  <Input
                    value={keywordsStr}
                    onChange={(e) => setKeywordsStr(e.target.value)}
                    placeholder="comma, separated"
                    className="mt-2 rounded-xl border-gray-200"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
