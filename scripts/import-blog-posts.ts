/**
 * One-time / idempotent blog import from blog/*.md + blog/pictures covers.
 *
 * Requires (in .env or .env.local):
 *   SUPABASE_URL              — same as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role (bypasses RLS for insert/update)
 *
 * Run: npx tsx scripts/import-blog-posts.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import matter from "gray-matter";
import { marked } from "marked";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { generateJSON } from "@tiptap/html/server";
import { getBlogHtmlExtensions } from "../src/lib/blog-tiptap-extensions.ts";
import { preprocessBlogMarkdown } from "./blog-preprocess.ts";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BLOG_DIR = join(ROOT, "blog");
const PICTURES_DIR = join(ROOT, "blog", "pictures");

const CATEGORIES = [
  "Custom Design",
  "AI Design",
  "Interior Trends",
  "Materials",
  "Small Spaces",
  "Kitchens",
  "Home Office",
  "Design Software",
  "Sustainability",
  "Manufacturing",
  "Wardrobes",
  "Commercial Design",
  "Design Psychology",
  "Bathrooms",
  "Kids Rooms",
] as const;

/** Slug → cover filename + SEO alt (per product spec). */
const COVER_BY_SLUG: Record<string, { file: string; alt: string }> = {
  "custom-furniture-design-guide-2026": {
    file: "Gemini_Generated_Image_2s6sp12s6sp12s6s.png",
    alt: "Custom furniture design workspace with digital planning tools and modern interior elements",
  },
  "ai-furniture-design-2026": {
    file: "Gemini_Generated_Image_a9pnksa9pnksa9pn.png",
    alt: "AI-powered furniture design workflow shown on professional desktop screens",
  },
  "interior-design-trends-2026": {
    file: "Gemini_Generated_Image_a2eofka2eofka2eo.png",
    alt: "Warm modern living room reflecting interior design trends for 2026",
  },
  "choosing-furniture-wood-guide": {
    file: "Gemini_Generated_Image_e1fuv9e1fuv9e1fu.png",
    alt: "Comparison of furniture wood samples in different tones and finishes",
  },
  "small-space-furniture-design-2026": {
    file: "Gemini_Generated_Image_lr3ro3lr3ro3lr3r.png",
    alt: "Compact multifunctional living room furniture designed for small spaces",
  },
  "kitchen-cabinet-design-guide-2026": {
    file: "Gemini_Generated_Image_9zk3uy9zk3uy9zk3.png",
    alt: "Kitchen cabinet planning and digital design process for custom cabinetry",
  },
  "home-office-furniture-guide-2026": {
    file: "Gemini_Generated_Image_u6mbnvu6mbnvu6mb.png",
    alt: "Ergonomic home office setup with desk, chair, and natural light",
  },
  "3d-furniture-software-comparison-2026": {
    file: "Gemini_Generated_Image_a9pnksa9pnksa9pn (1).png",
    alt: "3D furniture design software displayed on professional workstation screens",
  },
  "sustainable-furniture-design-2026": {
    file: "Gemini_Generated_Image_mnry6rmnry6rmnry.png",
    alt: "Eco-friendly furniture materials shown in a sustainable design context",
  },
  "custom-furniture-production-process": {
    file: "Gemini_Generated_Image_8kuj6z8kuj6z8kuj.png",
    alt: "Custom furniture manufacturing workshop with CNC-style production environment",
  },
  "wardrobe-design-ideas-2026": {
    file: "Gemini_Generated_Image_4lx97f4lx97f4lx9.png",
    alt: "Custom wardrobe and closet design with warm lighting and built-in storage",
  },
  "commercial-furniture-design-2026": {
    file: "Gemini_Generated_Image_bv5sv8bv5sv8bv5s.png",
    alt: "Commercial interior with custom restaurant or cafe furniture design",
  },
  "psychology-of-furniture-design-2026": {
    file: "Gemini_Generated_Image_ygzaixygzaixygza.png",
    alt: "Interior scene showing emotional contrast in furniture and space design",
  },
  "bathroom-furniture-design-2026": {
    file: "Gemini_Generated_Image_jmb7ubjmb7ubjmb7.png",
    alt: "Modern bathroom vanity and storage design with custom cabinetry",
  },
  "childrens-room-furniture-2026": {
    file: "Gemini_Generated_Image_rpth1wrpth1wrpth.png",
    alt: "Children’s room furniture designed for safety, creativity, and growth",
  },
};

function stripDuplicateBlock(body: string, topicNum: number): string {
  const re = new RegExp(
    `^TOPIC\\s*${topicNum}\\s*:[\\s\\S]*?^Suggested URL slug:\\s*[^\\n]+\\n+`,
    "m"
  );
  return body.replace(re, "").trim();
}

async function markdownToTipTapDoc(md: string): Promise<Record<string, unknown>> {
  marked.setOptions({ gfm: true, breaks: true });
  let html = await marked.parse(md);
  if (typeof html !== "string") html = String(html);
  html = html.replace(/<h1\b/gi, "<h2");
  try {
    return generateJSON(`<div>${html}</div>`, getBlogHtmlExtensions()) as Record<string, unknown>;
  } catch (e) {
    console.warn("generateJSON failed, falling back to plain paragraphs:", e);
    const plain = md.replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim();
    const chunks: string[] = [];
    const sentences = plain.split(/(?<=[.!?])\s+/);
    let buf: string[] = [];
    for (const s of sentences) {
      buf.push(s);
      if (buf.join(" ").length > 450 || buf.length >= 5) {
        chunks.push(buf.join(" "));
        buf = [];
      }
    }
    if (buf.length) chunks.push(buf.join(" "));
    return {
      type: "doc",
      content: chunks.map((text) => ({
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      })),
    };
  }
}

function parseKeywords(kw: string): string[] {
  return kw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function clipMeta(s: string, max = 158): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function buildExcerpt(metaDescription: string, body: string): string {
  const md = metaDescription.trim();
  if (md.length >= 80 && md.length <= 320) return md;
  const plain = body.replace(/[#*_[\]`]/g, " ").replace(/\s+/g, " ").trim();
  const first = plain.split(/(?<=[.!?])\s+/)[0] || plain.slice(0, 200);
  return clipMeta(first, 220);
}

function buildFaqs(data: {
  title: string;
  meta_description: string;
  keywords: string[];
}): { question: string; answer: string }[] {
  const shortTitle = data.title.includes(":") ? data.title.split(":").pop()!.trim() : data.title;
  const kw = data.keywords.slice(0, 4).join(", ");
  return [
    {
      question: `What will I learn from this guide on ${shortTitle}?`,
      answer: `${data.meta_description} The article breaks down practical considerations so you can plan materials, dimensions, and next steps with confidence.`,
    },
    {
      question: "How does DEXO fit into custom furniture and interior projects?",
      answer:
        "DEXO helps you visualize ideas, structure a clear brief, and connect with skilled designers and makers—so concepts move from inspiration to buildable specifications with less guesswork.",
    },
    {
      question: "What should I prepare before I start designing or requesting quotes?",
      answer:
        "Measure the space, note how you use the room day to day, gather inspiration images, and decide your budget range. Clear constraints lead to better layouts, lead times, and pricing conversations.",
    },
    {
      question: kw
        ? "What themes should I remember from this article?"
        : "Where should I start if I am new to custom furniture?",
      answer: kw
        ? `Key themes include: ${kw}. Use them as a checklist when comparing options, materials, and professionals.`
        : "Start with function and fit, then materials and maintenance, then style. Iterate in a 3D or AI-assisted tool before you commit to fabrication.",
    },
    {
      question: "How do I begin with DEXO today?",
      answer:
        "Visit dexo.com to start a project, explore design directions, and match with creators who can translate your goals into a realistic plan.",
    },
  ];
}

function publishedAtForTopic(n: number): string {
  const d = new Date(Date.UTC(2026, 0, 14 + n, 12, 0, 0));
  return d.toISOString();
}

function extToMime(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function main() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceKey) {
    console.error(
      "Missing SUPABASE_URL (or VITE_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Add them to .env.local — the anon key cannot insert past RLS as a script.\n" +
        "Get the service role key from Supabase Dashboard → Project Settings → API."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const mdFiles = readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") && /^\d{2}-/.test(f))
    .sort();

  if (mdFiles.length !== 15) {
    console.warn(`Expected 15 markdown posts, found ${mdFiles.length}. Proceeding with available files.`);
  }

  for (const file of mdFiles) {
    const full = join(BLOG_DIR, file);
    const raw = readFileSync(full, "utf8");
    const { data: fm, content: bodyRaw } = matter(raw);

    const slug = String(fm.slug || "").trim();
    if (!slug) {
      console.error(`Skip ${file}: no slug in frontmatter`);
      continue;
    }

    const topicNum = Number(fm.topic_number) || parseInt(file.slice(0, 2), 10) || 1;
    const title = String(fm.title || "").replace(/^["']|["']$/g, "").trim();
    const seoTitle = String(fm.seo_title || title).replace(/^["']|["']$/g, "").trim();
    const metaDescription = clipMeta(String(fm.meta_description || "").replace(/^["']|["']$/g, "").trim());
    const keywordsStr = String(fm.keywords || "").replace(/^["']|["']$/g, "").trim();
    const keywords = parseKeywords(keywordsStr);

    const cover = COVER_BY_SLUG[slug];
    if (!cover) {
      console.error(`No cover mapping for slug "${slug}" (${file})`);
      process.exit(1);
    }

    const coverPath = join(PICTURES_DIR, cover.file);
    let coverBuf: Buffer;
    try {
      coverBuf = readFileSync(coverPath);
    } catch {
      console.error(`Cover image not found: ${coverPath}`);
      process.exit(1);
    }

    const ext = cover.file.match(/\.[^.]+$/)?.[0] || ".png";
    const storagePath = `imported-covers/${slug}${ext}`;
    const { error: upErr } = await supabase.storage.from("blog-images").upload(storagePath, coverBuf, {
      contentType: extToMime(ext),
      upsert: true,
    });
    if (upErr) {
      console.error(`Storage upload failed for ${slug}:`, upErr.message);
      process.exit(1);
    }
    const { data: pub } = supabase.storage.from("blog-images").getPublicUrl(storagePath);
    const coverUrl = pub.publicUrl;

    let body = stripDuplicateBlock(bodyRaw.trim(), topicNum);
    body = preprocessBlogMarkdown(body);
    const content = await markdownToTipTapDoc(body);

    const category = CATEGORIES[Math.min(Math.max(topicNum, 1), 15) - 1];
    const tags = Array.from(
      new Set([
        ...keywords.slice(0, 6),
        ...category.split(/\s+/),
        "2026",
        "DEXO",
      ])
    ).slice(0, 12);

    const excerpt = buildExcerpt(metaDescription, body);
    const featured = topicNum === 1;
    const status = "draft" as const;
    const publishedAt = publishedAtForTopic(topicNum);

    const row = {
      title,
      slug,
      excerpt,
      content,
      content_format: "json",
      cover_image_url: coverUrl,
      cover_image_alt: cover.alt,
      meta_title: clipMeta(seoTitle, 65),
      meta_description: metaDescription,
      keywords,
      category,
      tags,
      status,
      featured,
      author_name: "DEXO Team",
      published_at: publishedAt,
    };

    const { data: upserted, error: postErr } = await supabase
      .from("blog_posts")
      .upsert(row, { onConflict: "slug" })
      .select("id")
      .single();

    if (postErr || !upserted) {
      console.error(`blog_posts upsert failed for ${slug}:`, postErr?.message);
      process.exit(1);
    }

    const postId = upserted.id as string;

    await supabase.from("blog_faqs").delete().eq("post_id", postId);

    const faqs = buildFaqs({ title, meta_description: metaDescription, keywords });
    const faqRows = faqs.map((f, i) => ({
      post_id: postId,
      question: f.question,
      answer: f.answer,
      sort_order: i,
    }));

    const { error: faqErr } = await supabase.from("blog_faqs").insert(faqRows);
    if (faqErr) {
      console.error(`blog_faqs insert failed for ${slug}:`, faqErr.message);
      process.exit(1);
    }

    console.log(`OK  ${slug}  (topic ${topicNum})  cover uploaded  ${faqs.length} FAQs`);
  }

  console.log("\nDone. All posts imported as draft; topic 1 is featured. Review in /admin/blog then publish.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
