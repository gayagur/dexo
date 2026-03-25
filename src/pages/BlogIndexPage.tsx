import { Helmet } from "react-helmet-async";
import { BlogPublicShell } from "@/components/blog/BlogPublicShell";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { FeaturedBlogPost } from "@/components/blog/FeaturedBlogPost";
import { fetchFeaturedPublishedPost, fetchPublishedBlogPosts } from "@/lib/blog-api";
import { getSiteOrigin } from "@/lib/blog-url";
import type { BlogPost } from "@/lib/database.types";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function BlogIndexPage() {
  const [featured, setFeatured] = useState<BlogPost | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const origin = typeof window !== "undefined" ? getSiteOrigin() : "";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: feat }, { data: all }] = await Promise.all([
        fetchFeaturedPublishedPost(),
        fetchPublishedBlogPosts(),
      ]);
      if (!alive) return;
      setFeatured(feat);
      const rest = feat ? all.filter((p) => p.id !== feat.id) : all;
      setPosts(rest);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canonical = `${origin}/blog`;

  return (
    <BlogPublicShell>
      <Helmet>
        <title>Journal · DEXO</title>
        <meta
          name="description"
          content="Ideas on custom furniture, AI-assisted design, and interiors — from the DEXO team."
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="DEXO Journal — Design & interiors" />
        <meta
          property="og:description"
          content="Ideas on custom furniture, AI-assisted design, and interiors — from the DEXO team."
        />
        {origin ? <meta property="og:url" content={canonical} /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DEXO Journal — Design & interiors" />
        <meta
          name="twitter:description"
          content="Ideas on custom furniture, AI-assisted design, and interiors — from the DEXO team."
        />
      </Helmet>

      <div className="container max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <header className="max-w-2xl mb-14 sm:mb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary mb-4">Journal</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-foreground leading-[1.08] tracking-tight text-balance">
            Spaces, craft, and thoughtful design
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed font-light">
            Long-form notes on custom furniture, working with makers, and using AI to see your room before you build.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading stories…
          </div>
        ) : (
          <>
            {featured ? (
              <section className="mb-16 sm:mb-20" aria-label="Featured article">
                <FeaturedBlogPost post={featured} />
              </section>
            ) : null}

            {posts.length === 0 && !featured ? (
              <p className="text-center text-muted-foreground py-16">New articles are on the way. Check back soon.</p>
            ) : (
              <section aria-label="All articles">
                <h2 className="sr-only">All articles</h2>
                <div className="grid sm:grid-cols-2 gap-8 lg:gap-10">
                  {posts.map((p) => (
                    <BlogPostCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </BlogPublicShell>
  );
}
