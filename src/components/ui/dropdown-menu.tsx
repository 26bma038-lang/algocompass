import * as React from "react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui's dropdown menu, on DESIGN.md tokens: a Float-plane panel (abyss-raised, strong
 * hairline, shadow-float), 32px items with glass-hover, and the same quick fade the tooltip uses.
 */
export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Content>
>(({ className, sideOffset = 6, align = "end", ...props }, ref) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        "z-50 min-w-[220px] rounded-sm border border-glass-border-strong bg-abyss-raised p-1 text-ink shadow-float",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    />
  </MenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
    className={cn(
      "flex cursor-default flex-col gap-0.5 rounded-xs px-2.5 py-1.5 text-body-sm text-ink outline-none select-none",
      "data-[highlighted]:bg-glass-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>
>(({ className, ...props }, ref) => <MenuPrimitive.Separator ref={ref} className={cn("my-1 h-px bg-glass-border", className)} {...props} />);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
