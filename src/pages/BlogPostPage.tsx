import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { BlogPublicShell } from "@/components/blog/BlogPublicShell";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import {
  fetchFaqsForPublishedPost,
  fetchPublishedPostBySlug,
  fetchRelatedWithFallback,
} from "@/lib/blog-api";
import { buildArticleJsonLd, buildFaqPageJsonLd } from "@/lib/blog-jsonld";
import { blogPostCanonicalPath, getSiteOrigin } from "@/lib/blog-url";
import type { BlogFaq, BlogPost } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [faqs, setFaqs] = useState<BlogFaq[]>([]);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const origin = typeof window !== "undefined" ? getSiteOrigin() : "";

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: p } = await fetchPublishedPostBySlug(slug);
      if (!alive) return;
      if (!p) {
        setPost(null);
        setFaqs([]);
        setRelated([]);
        setLoading(false);
        return;
      }
      setPost(p);
      const [{ data: fq }, { data: rel }] = await Promise.all([
        fetchFaqsForPublishedPost(p.id),
        fetchRelatedWithFallback(p.category, p.id, 3),
      ]);
      if (!alive) return;
      setFaqs(fq ?? []);
      setRelated(rel ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const pageUrl = useMemo(() => {
    if (!post || !origin) return "";
    return `${origin}${blogPostCanonicalPath(post.slug)}`;
  }, [post, origin]);

  const articleJson = useMemo(() => {
    if (!post || !pageUrl) return null;
    const desc =
      post.meta_description?.trim() ||
      post.excerpt?.trim() ||
      "Article from the DEXO journal on design and custom furniture.";
    return buildArticleJsonLd(post, { url: pageUrl, descriptionFallback: desc });
  }, [post, pageUrl]);

  const faqJson = useMemo(() => (faqs.length ? buildFaqPageJsonLd(faqs) : null), [faqs]);

  const metaTitle = post?.meta_title?.trim() || post?.title || "DEXO Journal";
  const metaDesc =
    post?.meta_description?.trim() ||
    post?.excerpt?.trim() ||
    "Read this article on the DEXO journal — custom furniture and interior design.";
  const ogImage = post?.cover_image_url || undefined;

  if (loading) {
    return (
      <BlogPublicShell>
        <div className="container max-w-3xl mx-auto py-32 flex justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      </BlogPublicShell>
    );
  }

  if (!post) {
    return (
      <BlogPublicShell>
        <Helmet>
          <title>Article not found · DEXO</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="container max-w-3xl mx-auto py-24 text-center space-y-6 px-5">
          <h1 className="font-serif text-2xl text-foreground">This article is unavailable</h1>
          <p className="text-muted-foreground text-sm">It may have been moved or is not published yet.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/blog">Back to journal</Link>
          </Button>
        </div>
      </BlogPublicShell>
    );
  }

  return (
    <BlogPublicShell>
      <Helmet>
        <title>{metaTitle} · DEXO Journal</title>
        <meta name="description" content={metaDesc} />
        {pageUrl ? <link rel="canonical" href={pageUrl} /> : null}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        {ogImage ? <meta property="og:image" content={ogImage} /> : null}
        {pageUrl ? <meta property="og:url" content={pageUrl} /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
        {articleJson ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJson) }}
          />
        ) : null}
        {faqJson ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
        ) : null}
      </Helmet>

      <div className="container max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <nav className="mb-10">
          <Link
            to="/blog"
            className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium inline-flex items-center gap-1"
          >
            ← Journal
          </Link>
        </nav>

        <BlogArticle
          post={post}
          faqs={faqs}
          relatedSlot={
            related.length ? (
              <section className="mt-20 pt-12 border-t border-border/70" aria-label="Related articles">
                <h2 className="font-serif text-2xl font-semibold text-foreground mb-8">Related</h2>
                <div className="grid sm:grid-cols-1 gap-8">
                  {related.map((p) => (
                    <BlogPostCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            ) : null
          }
        />
      </div>
    </BlogPublicShell>
  );
}
