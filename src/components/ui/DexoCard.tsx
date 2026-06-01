import { cn } from "@/lib/utils";

interface DexoCardProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
  as?: "div" | "button" | "article";
}

/**
 * DEXO base card: cream/white, rounded-sm, terracotta border/shadow on hover.
 * Pass `selected` to show the active ring state (used in selection flows).
 */
export function DexoCard({
  children,
  className,
  selected = false,
  onClick,
  as: Tag = "div",
}: DexoCardProps) {
  return (
    <Tag
      className={cn(
        "bg-white rounded-sm border transition-all duration-300",
        "hover:border-terracotta hover:shadow-lg hover:shadow-terracotta/10",
        selected
          ? "border-terracotta ring-2 ring-terracotta ring-offset-2"
          : "border-navy/10",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}
