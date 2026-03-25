import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { blogJsonToHtml, readingTimeMinutesFromJson } from "@/lib/blog-content";
import type { BlogFaq, BlogPost } from "@/lib/database.types";
import { BlogArticleMeta } from "./BlogArticleMeta";
import { BlogCtaBlock } from "./BlogCtaBlock";
import { BlogFaqSection } from "./BlogFaqSection";
import { Twitter, Linkedin, Facebook, LinkIcon, ChevronDown } from "lucide-react";

// ─── Key Takeaways extraction ────────────────────────────

function extractKeyTakeaways(html: string): string[] {
  // Look for a section that starts with "Key Takeaways" heading, or extract first list
  const takeawayMatch = html.match(/<h[23][^>]*>.*?[Kk]ey\s+[Tt]akeaways.*?<\/h[23]>\s*([\s\S]*?)(?=<h[23]|$)/);
  if (takeawayMatch) {
    const listItems = takeawayMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g);
    if (listItems) return listItems.map(li => li.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  }
  // Fallback: extract first 3-5 sentences as key points
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 4);
  return sentences.map(s => s.trim() + ".");
}

// ─── TOC extraction ──────────────────────────────────────

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractToc(html: string): TocItem[] {
  const items: TocItem[] = [];
  const regex = /<h([23])[^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text) {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      items.push({ id, text, level: parseInt(match[1]) });
    }
  }
  return items;
}

function injectHeadingIds(html: string): string {
  return html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h([23])>/gi, (_, level, attrs, content, closeLevel) => {
    const text = content.replace(/<[^>]+>/g, "").trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `<h${level}${attrs} id="${id}">${content}</h${closeLevel}>`;
  });
}

// ─── Reading Progress Bar ────────────────────────────────

function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-[#C87D5A] to-[#D4956F] transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ─── Table of Contents (sidebar) ─────────────────────────

function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="hidden xl:block" aria-label="Table of contents">
      <div className="sticky top-24">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3"
        >
          Contents
          <ChevronDown className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        {!collapsed && (
          <ul className="space-y-1 border-l-2 border-border/50 pl-3">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`block text-[13px] leading-snug py-1 transition-colors duration-200 ${
                    item.level === 3 ? "pl-3" : ""
                  } ${
                    activeId === item.id
                      ? "text-[#C87D5A] font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}

// ─── Social Share ─────────────────────────────────────────

function SocialShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const btnClass = "w-9 h-9 rounded-full border border-border/60 bg-card hover:bg-secondary hover:border-primary/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200";

  return (
    <div className="hidden lg:flex flex-col gap-2" aria-label="Share this article">
      <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer" className={btnClass} title="Share on X">
        <Twitter className="w-3.5 h-3.5" />
      </a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className={btnClass} title="Share on LinkedIn">
        <Linkedin className="w-3.5 h-3.5" />
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className={btnClass} title="Share on Facebook">
        <Facebook className="w-3.5 h-3.5" />
      </a>
      <button onClick={copy} className={btnClass} title={copied ? "Copied!" : "Copy link"}>
        <LinkIcon className={`w-3.5 h-3.5 ${copied ? "text-green-500" : ""}`} />
      </button>
    </div>
  );
}

// ─── Author Box ──────────────────────────────────────────

function AuthorBox({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="mt-16 pt-8 border-t border-border/70">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C87D5A] to-[#D4956F] flex items-center justify-center text-white font-semibold text-sm">
          {initials}
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">Written by {name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">DEXO Journal contributor</p>
        </div>
      </div>
    </div>
  );
}

// ─── Key Takeaways Box ───────────────────────────────────

function KeyTakeawaysBox({ takeaways }: { takeaways: string[] }) {
  if (takeaways.length === 0) return null;
  return (
    <div className="mb-10 rounded-xl border-l-4 border-[#C87D5A] bg-[#FDF8F4] p-6 sm:p-7">
      <h2 className="font-serif text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="text-[#C87D5A]">&#x2728;</span> Key Takeaways
      </h2>
      <ul className="space-y-2">
        {takeaways.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground/80 leading-relaxed">
            <span className="text-[#C87D5A] mt-0.5 shrink-0">&#x2022;</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

interface BlogArticleProps {
  post: BlogPost;
  faqs?: BlogFaq[];
  relatedSlot?: React.ReactNode;
}

export function BlogArticle({ post, faqs = [], relatedSlot }: BlogArticleProps) {
  const rawHtml = blogJsonToHtml(post.content as Record<string, unknown>);
  const html = injectHeadingIds(rawHtml);
  const toc = useMemo(() => extractToc(rawHtml), [rawHtml]);
  const takeaways = useMemo(() => extractKeyTakeaways(rawHtml), [rawHtml]);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const authorName = post.author_name?.trim() || "DEXO";

  return (
    <>
      <ReadingProgressBar />

      {/* Layout: sidebar TOC + article + share buttons */}
      <div className="relative flex gap-10">
        {/* Left: Table of Contents (desktop only) */}
        <div className="hidden xl:block w-52 shrink-0 -ml-60">
          <TableOfContents items={toc} />
        </div>

        {/* Center: Article */}
        <article className="max-w-[720px] mx-auto flex-1 min-w-0">
          <header className="mb-10">
            <BlogArticleMeta post={post} className="mb-6" />
            <h1 className="font-serif text-[2rem] sm:text-[2.65rem] lg:text-[2.85rem] font-semibold leading-[1.12] tracking-tight text-foreground text-balance">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-5 text-lg sm:text-xl text-muted-foreground leading-relaxed font-light">
                {post.excerpt}
              </p>
            )}
          </header>

          {/* Cover image */}
          {post.cover_image_url && (
            <figure className="mb-12 -mx-4 sm:mx-0 rounded-2xl overflow-hidden shadow-md border border-border/40">
              <img
                src={post.cover_image_url}
                alt={post.cover_image_alt || post.title}
                className="w-full aspect-[16/9] object-cover"
                loading="eager"
                width={720}
                height={405}
              />
              {post.cover_image_alt && (
                <figcaption className="text-xs text-muted-foreground text-center py-2 px-4">
                  {post.cover_image_alt}
                </figcaption>
              )}
            </figure>
          )}

          {/* Key Takeaways */}
          <KeyTakeawaysBox takeaways={takeaways} />

          {/* Article body — typography styles via CSS below */}
          <div
            className="blog-article-body prose-dexo"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Author Box */}
          <AuthorBox name={authorName} />

          {/* CTA */}
          <BlogCtaBlock />

          {/* FAQs */}
          <BlogFaqSection faqs={faqs} />

          {/* Related Posts */}
          {relatedSlot}
        </article>

        {/* Right: Social Share (desktop floating) */}
        <div className="hidden lg:block w-12 shrink-0">
          <div className="sticky top-24">
            <SocialShare url={pageUrl} title={post.title} />
          </div>
        </div>
      </div>

      {/* Mobile social share bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border/60 px-4 py-2 flex justify-center gap-3">
        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground">
          <Twitter className="w-3.5 h-3.5" />
        </a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground">
          <Linkedin className="w-3.5 h-3.5" />
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground">
          <Facebook className="w-3.5 h-3.5" />
        </a>
        <button onClick={() => navigator.clipboard.writeText(pageUrl)} className="w-9 h-9 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground">
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
}
