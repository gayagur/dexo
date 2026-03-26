import { supabase } from "./supabase";
import type { GroupData } from "./furnitureData";

export interface LibrarySubmission {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  group_data: GroupData;
  dims: { w: number; h: number; d: number };
  thumbnail_url: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityTemplate {
  id: string;
  submission_id: string | null;
  name: string;
  category: string;
  description: string;
  tags: string[];
  icon: string;
  group_data: GroupData;
  dims: { w: number; h: number; d: number };
  thumbnail_url: string | null;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
}

export async function submitToLibrary(params: {
  name: string;
  category: string;
  description: string;
  tags: string[];
  groupData: GroupData;
  dims: { w: number; h: number; d: number };
  thumbnailUrl?: string;
}): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("library_submissions").insert({
    user_id: user.id,
    name: params.name,
    category: params.category,
    description: params.description,
    tags: params.tags,
    group_data: params.groupData as unknown,
    dims: params.dims as unknown,
    thumbnail_url: params.thumbnailUrl ?? null,
  });

  return { error: error?.message ?? null };
}

export async function fetchPendingSubmissions(): Promise<{ data: LibrarySubmission[]; error: string | null }> {
  const { data, error } = await supabase
    .from("library_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return { data: (data ?? []) as LibrarySubmission[], error: error?.message ?? null };
}

export async function approveSubmission(
  id: string,
  updates?: { name?: string; category?: string; icon?: string },
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch submission
  const { data: sub, error: fetchErr } = await supabase
    .from("library_submissions")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !sub) return { error: fetchErr?.message ?? "Not found" };

  // Fetch author name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", sub.user_id)
    .maybeSingle();

  // Insert into community_templates
  const { error: insErr } = await supabase.from("community_templates").insert({
    submission_id: id,
    name: updates?.name ?? sub.name,
    category: updates?.category ?? sub.category,
    description: sub.description,
    tags: sub.tags,
    icon: updates?.icon ?? "🪑",
    group_data: sub.group_data,
    dims: sub.dims,
    thumbnail_url: sub.thumbnail_url,
    author_id: sub.user_id,
    author_name: profile?.full_name ?? "Community",
  });
  if (insErr) return { error: insErr.message };

  // Update submission status
  const { error: upErr } = await supabase
    .from("library_submissions")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  return { error: upErr?.message ?? null };
}

export async function rejectSubmission(id: string, reason?: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("library_submissions")
    .update({
      status: "rejected",
      reject_reason: reason ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function fetchCommunityTemplates(): Promise<{ data: CommunityTemplate[]; error: string | null }> {
  const { data, error } = await supabase
    .from("community_templates")
    .select("*")
    .order("created_at", { ascending: false });
  return { data: (data ?? []) as CommunityTemplate[], error: error?.message ?? null };
}
