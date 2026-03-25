import type { Extensions } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
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

const tableGroup: Extensions = [
  Table.configure({
    resizable: false,
    HTMLAttributes: { class: "blog-table w-full border-collapse text-sm my-8" },
  }),
  TableRow.configure({
    HTMLAttributes: { class: "border-b border-border/60" },
  }),
  TableHeader.configure({
    HTMLAttributes: {
      class:
        "bg-secondary/75 px-3 py-2.5 text-left font-semibold text-foreground border border-border/55 align-top",
    },
  }),
  TableCell.configure({
    HTMLAttributes: { class: "px-3 py-2.5 align-top border border-border/55 text-foreground/90" },
  }),
];

const starter = {
  heading: headingConfig,
  ...listsAndQuote,
  link: false as const,
  underline: false as const,
};

export function getBlogHtmlExtensions(): Extensions {
  return [StarterKit.configure(starter), Underline, link, ...tableGroup];
}

export function getBlogEditorExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure(starter),
    Underline,
    link,
    ...tableGroup,
    Placeholder.configure({ placeholder }),
  ];
}
