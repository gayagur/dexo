import { supabase } from "./supabase";
import type { BlogFaq, BlogPost, BlogPostStatus } from "./database.types";

export type BlogPostRow = BlogPost;
export type BlogFaqRow = BlogFaq;

export async function fetchPublishedBlogPosts(): Promise<{ data: BlogPost[]; error: string | null }> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as BlogPost[], error: null };
}

export async function fetchFeaturedPublishedPost(): Promise<{ data: BlogPost | null; error: string | null }> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as BlogPost | null, error: null };
}

export async function fetchPublishedPostBySlug(
  slug: string
): Promise<{ data: BlogPost | null; error: string | null }> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as BlogPost | null, error: null };
}

export async function fetchFaqsForPublishedPost(
  postId: string
): Promise<{ data: BlogFaq[]; error: string | null }> {
  const { data, error } = await supabase
    .from("blog_faqs")
    .select("*")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as BlogFaq[], error: null };
}

export async function fetchRelatedPublishedPosts(
  category: string | null,
  excludeId: string,
  limit = 3
): Promise<{ data: BlogPost[]; error: string | null }> {
  let q = supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .neq("id", excludeId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (category?.trim()) {
    q = q.eq("category", category.trim());
  }

  const { data, error } = await q;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as BlogPost[], error: null };
}

/** Prefer same category; if too few matches, fill from recent published posts. */
export async function fetchRelatedWithFallback(
  category: string | null,
  excludeId: string,
  limit = 3
): Promise<{ data: BlogPost[]; error: string | null }> {
  const primary = await fetchRelatedPublishedPosts(category?.trim() ? category : null, excludeId, limit);
  if (primary.error) return primary;
  if (!category?.trim() || primary.data.length >= limit) return primary;

  const extra = await fetchRelatedPublishedPosts(null, excludeId, limit);
  if (extra.error) return primary;
  const seen = new Set(primary.data.map((p) => p.id));
  const merged = [...primary.data];
  for (const p of extra.data) {
    if (merged.length >= limit) break;
    if (!seen.has(p.id)) {
      seen.add(p.id);
      merged.push(p);
    }
  }
  return { data: merged, error: null };
}

// ─── Admin ─────────────────────────────────────────────────

export async function adminFetchAllPosts(): Promise<{ data: BlogPost[]; error: string | null }> {
  const { data, error } = await supabase.from("blog_posts").select("*").order("updated_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as BlogPost[], error: null };
}

export async function adminFetchPostById(
  id: string
): Promise<{ data: BlogPost | null; error: string | null }> {
  const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data as BlogPost | null, error: null };
}

export async function adminFetchFaqs(postId: string): Promise<{ data: BlogFaq[]; error: string | null }> {
  const { data, error } = await supabase
    .from("blog_faqs")
    .select("*")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as BlogFaq[], error: null };
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  let q = supabase.from("blog_posts").select("id").eq("slug", slug).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q.maybeSingle();
  if (error) return true;
  return !!data;
}

export async function adminInsertPost(
  payload: Omit<BlogPost, "id" | "created_at" | "updated_at">
): Promise<{ data: BlogPost | null; error: string | null }> {
  const { data, error } = await supabase.from("blog_posts").insert(payload).select("*").single();
  if (error) return { data: null, error: error.message };
  return { data: data as BlogPost, error: null };
}

export async function adminUpdatePost(
  id: string,
  patch: Partial<Omit<BlogPost, "id">>
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("blog_posts").update(patch).eq("id", id);
  return { error: error?.message ?? null };
}

export async function adminDeletePost(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function adminReplaceFaqs(
  postId: string,
  items: { question: string; answer: string; sort_order: number }[]
): Promise<{ error: string | null }> {
  const { error: delErr } = await supabase.from("blog_faqs").delete().eq("post_id", postId);
  if (delErr) return { error: delErr.message };
  if (!items.length) return { error: null };
  const rows = items.map((i) => ({
    post_id: postId,
    question: i.question,
    answer: i.answer,
    sort_order: i.sort_order,
  }));
  const { error: insErr } = await supabase.from("blog_faqs").insert(rows);
  return { error: insErr?.message ?? null };
}

/** Publish: set status and published_at if missing. */
export function publishPatch(existing: BlogPost): Partial<BlogPost> {
  return {
    status: "published" as BlogPostStatus,
    published_at: existing.published_at ?? new Date().toISOString(),
  };
}
