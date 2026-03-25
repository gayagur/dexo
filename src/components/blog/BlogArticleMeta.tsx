import { format } from "date-fns";
import { Clock } from "lucide-react";
import type { BlogPost } from "@/lib/database.types";
import { readingTimeMinutesFromJson } from "@/lib/blog-content";

interface BlogArticleMetaProps {
  post: BlogPost;
  className?: string;
}

export function BlogArticleMeta({ post, className = "" }: BlogArticleMetaProps) {
  const minutes = readingTimeMinutesFromJson(post.content);
  const pub = post.published_at ? format(new Date(post.published_at), "MMMM d, yyyy") : null;
  const mod = format(new Date(post.updated_at), "MMMM d, yyyy");

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground ${className}`}
    >
      {post.category ? (
        <span className="text-primary font-medium tracking-wide text-xs uppercase">{post.category}</span>
      ) : null}
      {post.category ? <span className="text-border">·</span> : null}
      {post.author_name ? <span>By {post.author_name}</span> : <span>By DEXO</span>}
      <span className="text-border hidden sm:inline">·</span>
      {pub ? <time dateTime={post.published_at ?? undefined}>Published {pub}</time> : null}
      {pub ? <span className="text-border">·</span> : null}
      <time dateTime={post.updated_at}>Updated {mod}</time>
      <span className="text-border">·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 opacity-70" />
        {minutes} min read
      </span>
    </div>
  );
}
