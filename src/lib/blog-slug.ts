export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeBlogSlug(raw: string): string {
  const fromTitle = slugifyTitle(raw);
  if (fromTitle) return fromTitle;
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidBlogSlug(slug: string): boolean {
  if (!slug || slug.length > 200) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
