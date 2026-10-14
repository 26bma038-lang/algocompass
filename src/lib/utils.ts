import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default font sizes, so it would read our DESIGN.md scale
 * (`text-label`, `text-body-sm`, …) as text colors and drop it whenever a `text-ink*` follows.
 * Registering the scale keeps size and color as separate groups.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["hero", "display", "headline", "title", "body", "body-sm", "label"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
