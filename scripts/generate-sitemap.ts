/**
 * Generates public/sitemap.xml with static routes + published blog post slugs.
 *
 * Requires (in .env or .env.local):
 *   SUPABASE_URL              — same as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role (or anon key works for public reads)
 *
 * Run: npx tsx scripts/generate-sitemap.ts
 * Add to build: "build": "tsx scripts/generate-sitemap.ts && vite build"
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

config({ path: ".env.local" });
config();

const SITE = "https://dexo.info";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠ Missing Supabase credentials — generating sitemap with static routes only.");
}

interface StaticRoute {
  path: string;
  changefreq: string;
  priority: number;
}

const staticRoutes: StaticRoute[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/auth", changefreq: "monthly", priority: 0.5 },
  { path: "/blog", changefreq: "weekly", priority: 0.8 },
];

function urlEntry(loc: string, changefreq: string, priority: number, lastmod?: string): string {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchBlogSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  if (!supabaseUrl || !supabaseKey) return [];
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.warn("⚠ Could not fetch blog posts:", error.message);
    return [];
  }
  return (data ?? []) as { slug: string; updated_at: string }[];
}

async function main() {
  const blogPosts = await fetchBlogSlugs();

  const urls: string[] = [];

  for (const route of staticRoutes) {
    urls.push(urlEntry(`${SITE}${route.path}`, route.changefreq, route.priority));
  }

  for (const post of blogPosts) {
    const lastmod = post.updated_at ? post.updated_at.slice(0, 10) : undefined;
    urls.push(urlEntry(`${SITE}/blog/${post.slug}`, "monthly", 0.6, lastmod));
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(__dirname, "../public/sitemap.xml");
  writeFileSync(outPath, xml, "utf-8");
  console.log(`✓ Sitemap written to ${outPath} (${staticRoutes.length} static + ${blogPosts.length} blog posts)`);
}

main().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exit(1);
});
