import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui button, adapted to DESIGN.md (accent fill, glass ghost) and React 18 (forwardRef).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm font-sans text-body font-semibold transition-[background-color,border-color,box-shadow,transform,color] duration-[var(--dur-fast)] ease-out-quint active:scale-[0.97] active:duration-[var(--dur-press)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:shadow-aura",
        ghost:
          "border border-transparent bg-transparent text-ink hover:border-glass-border-strong hover:bg-glass-hover",
        outline:
          "border border-glass-border-strong bg-glass text-ink hover:bg-glass-hover",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-body-sm",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
