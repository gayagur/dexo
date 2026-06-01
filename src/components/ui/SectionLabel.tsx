import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  light?: boolean;
}

/**
 * Editorial section label: thin terracotta line + uppercase text.
 * Example output: — CRAFT & DESIGN
 */
export function SectionLabel({ children, className, light = false }: SectionLabelProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-3 text-xs font-sans font-medium tracking-[0.22em] uppercase",
        light ? "text-terracotta-muted" : "text-terracotta",
        className
      )}
    >
      <span
        className={cn("block h-px w-6 flex-shrink-0", light ? "bg-terracotta-muted" : "bg-terracotta")}
        aria-hidden
      />
      {children}
    </p>
  );
}
