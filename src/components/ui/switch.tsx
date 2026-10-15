import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * On/off toggle (shadcn Switch, adapted to DESIGN.md): a sunken pill track that takes the accent
 * fill when on. The thumb's position carries the state, so it never hangs on color alone.
 */
export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-glass-border-strong bg-abyss-sunken p-[2px]",
      "transition-colors duration-[var(--dur-fast)] data-[state=checked]:border-accent data-[state=checked]:bg-accent",
      "disabled:cursor-not-allowed disabled:opacity-45",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-3.5 rounded-full bg-ink-muted shadow-sm",
        "transition-transform duration-[var(--dur-fast)] ease-out-quint data-[state=checked]:translate-x-4 data-[state=checked]:bg-abyss",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
