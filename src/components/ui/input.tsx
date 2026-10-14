import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      spellCheck={false}
      className={cn(
        "h-[38px] w-full rounded-sm border border-glass-border bg-abyss-sunken px-3 text-body text-ink placeholder:text-ink-faint",
        "transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out-quint",
        "hover:border-glass-border-strong focus-visible:border-accent",
        "aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
