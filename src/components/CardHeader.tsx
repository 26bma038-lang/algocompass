import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The bento card header every screen shares (DESIGN.md "Bento across the app"): a 22px Chakra Petch
 * title, an optional one-line description, and on the right an optional count pill and actions.
 */
export function CardHeader({
  id,
  title,
  description,
  pill,
  actions,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  pill?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2", className)}>
      <div className="flex max-w-[62ch] min-w-64 flex-1 basis-0 flex-col gap-1">
        <h2 id={id} className="font-display text-headline font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="text-body-sm text-ink-muted">{description}</p>}
      </div>
      {(pill || actions) && (
        <div className="flex shrink-0 items-center gap-3">
          {pill && <Pill>{pill}</Pill>}
          {actions}
        </div>
      )}
    </div>
  );
}

/** A count or status in the theme accent's soft fill ("0/3 quests", "5 open"). Words, never colour alone. */
export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("numeric inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-label font-semibold whitespace-nowrap text-ink", className)}>
      {children}
    </span>
  );
}
