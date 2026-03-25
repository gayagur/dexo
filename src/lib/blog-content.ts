import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { getBlogHtmlExtensions } from "./blog-tiptap-extensions";

export const emptyBlogDoc: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function blogJsonToHtml(doc: Record<string, unknown> | null | undefined): string {
  const json = (
    doc && typeof doc === "object" && (doc as JSONContent).type === "doc" ? doc : emptyBlogDoc
  ) as JSONContent;
  try {
    return generateHTML(json, getBlogHtmlExtensions());
  } catch {
    return "";
  }
}

export function extractPlainTextFromBlogJson(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) {
    return n.content.map(extractPlainTextFromBlogJson).filter(Boolean).join(" ");
  }
  return "";
}

export function readingTimeMinutesFromJson(doc: unknown): number {
  const words = extractPlainTextFromBlogJson(doc)
    .split(/\s+/)
    .filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / 200));
}
