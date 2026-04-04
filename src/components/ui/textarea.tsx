import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border-[1.5px] border-black/[0.12] bg-white px-3.5 py-2.5 text-[14px] ring-offset-background placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:border-[#C96A3D] focus-visible:shadow-[0_0_0_3px_rgba(201,106,61,0.12)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
