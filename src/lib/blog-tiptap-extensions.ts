import type { Extensions } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

const link = Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    class:
      "border-b border-primary/35 text-primary hover:border-primary hover:text-primary/90 font-medium transition-colors underline-offset-2",
  },
});

const listsAndQuote = {
  bulletList: { HTMLAttributes: { class: "list-disc pl-6 my-4 space-y-1.5 text-foreground/90" } },
  orderedList: { HTMLAttributes: { class: "list-decimal pl-6 my-4 space-y-1.5 text-foreground/90" } },
  blockquote: {
    HTMLAttributes: {
      class:
        "border-l-[3px] border-primary/35 pl-5 py-1 my-8 italic text-muted-foreground bg-secondary/40 rounded-r-xl rounded-l-sm",
    },
  },
} as const;

const headingConfig = {
  levels: [2, 3] as const,
  HTMLAttributes: { class: "scroll-mt-24" },
};

export function getBlogHtmlExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: headingConfig,
      ...listsAndQuote,
    }),
    Underline,
    link,
  ];
}

export function getBlogEditorExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: headingConfig,
      ...listsAndQuote,
    }),
    Underline,
    link,
    Placeholder.configure({ placeholder }),
  ];
}
