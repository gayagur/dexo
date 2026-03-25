/** Canonical site origin for meta tags and JSON-LD (client: current origin). */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv?.startsWith("http")) {
    return fromEnv.replace(/\/$/, "");
  }
  return "";
}

export function blogPostCanonicalPath(slug: string): string {
  return `/blog/${slug}`;
}
