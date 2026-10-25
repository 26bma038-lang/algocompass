import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

/** Fired by the shell on every route change: any open tooltip closes (v1.4 polish). */
const NAVIGATED = "algocompass:navigated";
export const closeTooltips = () => window.dispatchEvent(new Event(NAVIGATED));

/**
 * Radix's Root, closing itself when the screen changes, so a tooltip opened on the link you clicked
 * never lingers over the next screen's heading or tabs.
 */
export function Tooltip({ open, defaultOpen, onOpenChange, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [inner, setInner] = React.useState(defaultOpen ?? false);
  const controlled = open !== undefined;
  const change = React.useCallback(
    (o: boolean) => {
      if (!controlled) setInner(o);
      onOpenChange?.(o);
    },
    [controlled, onOpenChange],
  );
  React.useEffect(() => {
    const close = () => change(false);
    window.addEventListener(NAVIGATED, close);
    return () => window.removeEventListener(NAVIGATED, close);
  }, [change]);
  return <TooltipPrimitive.Root open={controlled ? open : inner} onOpenChange={change} {...props} />;
}
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-xs border border-glass-border-strong bg-abyss-raised px-2.5 py-1.5 text-label text-ink shadow-float",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";
