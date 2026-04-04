import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border-[1.5px] border-black/[0.12] bg-white px-3.5 py-2.5 text-[14px] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:border-[#C96A3D] focus-visible:shadow-[0_0_0_3px_rgba(201,106,61,0.12)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
