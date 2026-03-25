import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogPublicShell } from "@/components/blog/BlogPublicShell";
import { adminFetchFaqs, adminFetchPostById } from "@/lib/blog-api";
import type { BlogFaq, BlogPost } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AdminBlogPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [faqs, setFaqs] = useState<BlogFaq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: p } = await adminFetchPostById(id);
      if (!alive) return;
      if (!p) {
        setPost(null);
        setLoading(false);
        return;
      }
      setPost(p);
      const { data: f } = await adminFetchFaqs(id);
      if (!alive) return;
      setFaqs(f ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <BlogPublicShell>
        <div className="container max-w-3xl mx-auto py-32 flex justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading preview…
        </div>
      </BlogPublicShell>
    );
  }

  if (!post) {
    return (
      <BlogPublicShell>
        <div className="container max-w-3xl mx-auto py-24 text-center space-y-4">
          <p className="text-muted-foreground">Post not found.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/admin/blog">Back to blog admin</Link>
          </Button>
        </div>
      </BlogPublicShell>
    );
  }

  return (
    <BlogPublicShell>
      <Helmet>
        <title>Preview: {post.title} · DEXO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="bg-amber-50/90 border-b border-amber-200/60 text-center text-sm text-amber-950 py-2.5 px-4">
        <span className="font-medium">Admin preview</span>
        <span className="text-amber-800/90"> · Status: {post.status}</span>
        <span className="mx-2 text-amber-700/50">|</span>
        <Button variant="link" className="h-auto p-0 text-amber-900 font-semibold" asChild>
          <Link to={`/admin/blog/${post.id}`}>Edit post</Link>
        </Button>
      </div>
      <div className="container max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <BlogArticle post={post} faqs={faqs} />
      </div>
    </BlogPublicShell>
  );
}
