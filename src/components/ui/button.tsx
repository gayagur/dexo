import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium tracking-wide text-sm ring-offset-background transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:scale-[1.02] hover:-translate-y-px active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-[0_8px_24px_rgba(201,106,61,0.25)] rounded-sm",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 rounded-sm",
        outline: "border border-terracotta bg-transparent text-terracotta hover:bg-terracotta hover:text-cream rounded-sm hover:shadow-md hover:shadow-terracotta/10",
        secondary: "bg-cream text-navy border border-navy/20 hover:border-navy/40 hover:bg-cream-warm rounded-sm",
        ghost: "text-navy/70 hover:text-navy hover:bg-cream-warm rounded-sm relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-terracotta after:transition-all after:duration-300 hover:after:w-full",
        link: "text-terracotta underline-offset-4 hover:underline hover:scale-100 active:scale-100",
        warm: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg rounded-sm",
        hero: "bg-terracotta text-cream shadow-lg hover:bg-terracotta-light hover:shadow-xl hover:shadow-terracotta/25 text-base rounded-sm",
        soft: "bg-terracotta/10 text-terracotta hover:bg-terracotta/20 rounded-sm",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
