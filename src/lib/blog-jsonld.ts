import type { BlogFaq, BlogPost } from "./database.types";
import { blogJsonToHtml } from "./blog-content";
import { getSiteOrigin } from "./blog-url";

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildArticleJsonLd(
  post: BlogPost,
  opts: { url: string; descriptionFallback: string }
): Record<string, unknown> {
  const origin = getSiteOrigin();
  const image = post.cover_image_url ?? undefined;
  const desc =
    post.meta_description?.trim() ||
    post.excerpt?.trim() ||
    stripTags(blogJsonToHtml(post.content as Record<string, unknown>)).slice(0, 280) ||
    opts.descriptionFallback;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.meta_title?.trim() || post.title,
    description: desc,
    image: image ? (image.startsWith("http") ? image : `${origin}${image}`) : undefined,
    author: {
      "@type": "Person",
      name: post.author_name?.trim() || "DEXO",
    },
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": opts.url,
    },
    publisher: {
      "@type": "Organization",
      name: "DEXO",
      url: origin || undefined,
    },
  };
}

export function buildFaqPageJsonLd(faqs: BlogFaq[]): Record<string, unknown> | null {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}
