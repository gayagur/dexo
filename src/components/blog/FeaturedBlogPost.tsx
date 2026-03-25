import { Link } from "react-router-dom";
import { format } from "date-fns";
import type { BlogPost } from "@/lib/database.types";
import { readingTimeMinutesFromJson } from "@/lib/blog-content";

interface FeaturedBlogPostProps {
  post: BlogPost;
}

export function FeaturedBlogPost({ post }: FeaturedBlogPostProps) {
  const minutes = readingTimeMinutesFromJson(post.content);
  const dateStr = post.published_at ? format(new Date(post.published_at), "MMMM d, yyyy") : "";

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group grid lg:grid-cols-12 gap-0 rounded-3xl overflow-hidden border border-border/60 bg-gradient-to-br from-card via-background to-secondary/30 shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-500"
    >
      <div className="lg:col-span-7 aspect-[16/10] lg:aspect-auto lg:min-h-[320px] overflow-hidden bg-secondary/40">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt || post.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full min-h-[240px] bg-gradient-to-br from-primary/15 via-muted/40 to-secondary" />
        )}
      </div>
      <div className="lg:col-span-5 p-8 sm:p-10 lg:py-12 flex flex-col justify-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90 mb-4">Featured</span>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
          {post.category ? <span className="font-medium text-foreground/70">{post.category}</span> : null}
          {post.category && dateStr ? <span>·</span> : null}
          {dateStr ? <time dateTime={post.published_at ?? undefined}>{dateStr}</time> : null}
          <span>·</span>
          <span>{minutes} min read</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-semibold leading-tight text-foreground group-hover:text-primary transition-colors text-balance">
          {post.title}
        </h2>
        {post.excerpt ? (
          <p className="mt-4 text-muted-foreground leading-relaxed line-clamp-4">{post.excerpt}</p>
        ) : null}
        <span className="mt-8 inline-flex items-center text-sm font-semibold text-primary">
          Read the full story
          <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}
