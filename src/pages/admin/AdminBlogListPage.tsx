import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BlogStatusBadge } from "@/components/admin/blog/BlogStatusBadge";
import { useAdmin } from "@/hooks/useAdmin";
import { adminDeletePost, adminFetchAllPosts, adminUpdatePost, publishPatch } from "@/lib/blog-api";
import type { BlogPost, BlogPostStatus } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Plus,
  Search,
  Eye,
  Pencil,
  Archive,
  Send,
  FileX,
  Trash2,
  Star,
} from "lucide-react";

export default function AdminBlogListPage() {
  const { fetchAnalytics } = useAdmin();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await adminFetchAllPosts();
    setLoading(false);
    if (error) {
      toast.error("Could not load posts", { description: error });
      return;
    }
    setPosts(data);
  };

  useEffect(() => {
    load();
  }, []);

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

  const categories = useMemo(() => {
    const s = new Set<string>();
    posts.forEach((p) => {
      if (p.category?.trim()) s.add(p.category.trim());
    });
    return Array.from(s).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (categoryFilter !== "all" && (p.category || "") !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.excerpt || "").toLowerCase().includes(q)
      );
    });
  }, [posts, search, statusFilter, categoryFilter]);

  const runUpdate = async (post: BlogPost, patch: Partial<BlogPost>, msg: string) => {
    const { error } = await adminUpdatePost(post.id, patch);
    if (error) {
      toast.error("Update failed", { description: error });
      return;
    }
    toast.success(msg);
    await load();
  };

  const onPublish = (post: BlogPost) => runUpdate(post, publishPatch(post), "Post published");
  const onUnpublish = (post: BlogPost) => runUpdate(post, { status: "draft" as BlogPostStatus }, "Post unpublished");
  const onArchive = (post: BlogPost) => runUpdate(post, { status: "archived" as BlogPostStatus }, "Post archived");

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await adminDeletePost(deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("Delete failed", { description: error });
      return;
    }
    toast.success("Post deleted");
    setDeleteTarget(null);
    await load();
  };

  return (
    <AdminLayout pendingCount={pendingCount}>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-gray-900 tracking-tight">Blog</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl leading-relaxed">
              Create and manage editorial content for SEO and discoverability. Only published posts appear on the public blog.
            </p>
          </div>
          <Button asChild className="rounded-xl shadow-sm bg-[#C05621] hover:bg-[#a84a1c] text-white shrink-0">
            <Link to="/admin/blog/new" className="gap-2">
              <Plus className="w-4 h-4" />
              Create New Post
            </Link>
          </Button>
        </div>

        <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search title, slug, excerpt…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-gray-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px] rounded-xl border-gray-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[180px] rounded-xl border-gray-200">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="py-20 text-center text-sm text-gray-400">Loading posts…</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-sm text-gray-500">No posts match your filters.</div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                {filtered.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 sm:p-5 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/blog/${post.id}`}
                          className="font-medium text-gray-900 hover:text-[#C05621] transition-colors truncate"
                        >
                          {post.title || "Untitled"}
                        </Link>
                        {post.featured ? (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" aria-label="Featured" />
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate">/{post.slug}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <BlogStatusBadge status={post.status} />
                        {post.category ? (
                          <span className="text-[11px] uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {post.category}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-6 text-xs text-gray-500 lg:shrink-0">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Updated</div>
                        {format(new Date(post.updated_at), "MMM d, yyyy HH:mm")}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Published</div>
                        {post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 lg:pl-4">
                      <Button variant="outline" size="sm" className="rounded-lg border-gray-200" asChild>
                        <Link to={`/admin/blog/${post.id}`}>
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl">
                          <DropdownMenuItem
                            className="rounded-lg"
                            onClick={() => window.open(`/admin/blog/preview/${post.id}`, "_blank", "noopener,noreferrer")}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg" onClick={() => navigate(`/admin/blog/${post.id}`)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {post.status !== "published" ? (
                            <DropdownMenuItem className="rounded-lg" onClick={() => onPublish(post)}>
                              <Send className="w-4 h-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="rounded-lg" onClick={() => onUnpublish(post)}>
                              <FileX className="w-4 h-4 mr-2" />
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="rounded-lg" onClick={() => onArchive(post)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="rounded-lg text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(post)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{deleteTarget?.title}” and its FAQs. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
