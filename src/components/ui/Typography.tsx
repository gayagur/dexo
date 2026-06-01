import { cn } from "@/lib/utils";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;
type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;

export function H1({ className, children, ...props }: HeadingProps) {
  return (
    <h1
      className={cn(
        "font-serif font-semibold text-display-lg text-navy leading-tight tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function H2({ className, children, ...props }: HeadingProps) {
  return (
    <h2
      className={cn(
        "font-serif font-semibold text-display-md text-navy leading-tight tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function H3({ className, children, ...props }: HeadingProps) {
  return (
    <h3
      className={cn(
        "font-serif font-medium text-2xl text-navy leading-snug tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function Body({ className, children, ...props }: ParagraphProps) {
  return (
    <p
      className={cn(
        "font-sans text-base leading-relaxed text-stone",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function Caption({ className, children, ...props }: ParagraphProps) {
  return (
    <p
      className={cn(
        "font-sans text-xs leading-relaxed text-stone/70",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
