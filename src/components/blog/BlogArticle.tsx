import { blogJsonToHtml } from "@/lib/blog-content";
import type { BlogFaq, BlogPost } from "@/lib/database.types";
import { BlogArticleMeta } from "./BlogArticleMeta";
import { BlogCtaBlock } from "./BlogCtaBlock";
import { BlogFaqSection } from "./BlogFaqSection";

interface BlogArticleProps {
  post: BlogPost;
  faqs?: BlogFaq[];
  relatedSlot?: React.ReactNode;
}

export function BlogArticle({ post, faqs = [], relatedSlot }: BlogArticleProps) {
  const html = blogJsonToHtml(post.content as Record<string, unknown>);

  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-10">
        <BlogArticleMeta post={post} className="mb-6" />
        <h1 className="font-serif text-[2rem] sm:text-[2.65rem] lg:text-[2.85rem] font-semibold leading-[1.12] tracking-tight text-foreground text-balance">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="mt-5 text-lg sm:text-xl text-muted-foreground leading-relaxed font-light">{post.excerpt}</p>
        ) : null}
      </header>

      {post.cover_image_url ? (
        <figure className="mb-12 -mx-4 sm:mx-0 rounded-2xl overflow-hidden shadow-md border border-border/40">
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt || post.title}
            className="w-full aspect-[16/9] object-cover"
            loading="eager"
          />
          {post.cover_image_alt ? (
            <figcaption className="sr-only">{post.cover_image_alt}</figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="blog-article-body" dangerouslySetInnerHTML={{ __html: html }} />

      <BlogCtaBlock />
      <BlogFaqSection faqs={faqs} />
      {relatedSlot}
    </article>
  );
}
