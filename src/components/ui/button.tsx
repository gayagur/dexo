import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:scale-[1.02] active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-[0_8px_24px_rgba(201,106,61,0.25)] rounded-full",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 rounded-full",
        outline: "border-[1.5px] border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground rounded-full",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full",
        ghost: "text-[#6B6560] hover:bg-[#F5F5F3] hover:text-[#1A1208] rounded-full",
        link: "text-primary underline-offset-4 hover:underline hover:scale-100 active:scale-100",
        warm: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg rounded-full",
        hero: "bg-primary text-primary-foreground shadow-lg hover:shadow-xl text-base rounded-full",
        soft: "bg-primary/10 text-primary hover:bg-primary/20 rounded-full",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
