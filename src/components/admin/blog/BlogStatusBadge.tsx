import { Badge } from "@/components/ui/badge";
import type { BlogPostStatus } from "@/lib/database.types";

const CONFIG: Record<BlogPostStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 border-0" },
  published: { label: "Published", className: "bg-emerald-100 text-emerald-800 border-0" },
  archived: { label: "Archived", className: "bg-amber-50 text-amber-900 border-0" },
};

export function BlogStatusBadge({ status }: { status: string }) {
  const c = CONFIG[status as BlogPostStatus] ?? CONFIG.draft;
  return (
    <Badge variant="secondary" className={`font-medium text-xs ${c.className}`}>
      {c.label}
    </Badge>
  );
}
