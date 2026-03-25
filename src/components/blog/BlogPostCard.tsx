import { Link } from "react-router-dom";
import { format } from "date-fns";
import type { BlogPost } from "@/lib/database.types";
import { readingTimeMinutesFromJson } from "@/lib/blog-content";

interface BlogPostCardProps {
  post: BlogPost;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const minutes = readingTimeMinutesFromJson(post.content);
  const dateStr = post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : "";

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-2xl border border-border/70 bg-card/40 hover:bg-card hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
    >
      <div className="aspect-[16/10] overflow-hidden bg-secondary/50">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt || post.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            loading="lazy"
            width={400}
            height={250}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary via-muted/30 to-primary/10" />
        )}
      </div>
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
          {post.category ? (
            <span className="text-primary font-semibold uppercase tracking-wider">{post.category}</span>
          ) : null}
          {post.category && dateStr ? <span>·</span> : null}
          {dateStr ? <time dateTime={post.published_at ?? undefined}>{dateStr}</time> : null}
          <span>·</span>
          <span>{minutes} min read</span>
        </div>
        <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {post.title}
        </h2>
        {post.excerpt ? (
          <p className="mt-3 text-sm sm:text-[15px] text-muted-foreground leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>
        ) : null}
        <span className="mt-5 inline-flex items-center text-sm font-medium text-primary opacity-90 group-hover:opacity-100">
          Read article
          <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}
