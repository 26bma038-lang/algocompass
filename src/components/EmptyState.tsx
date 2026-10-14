import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Honest "nothing here yet" state: says what will appear and what to do next. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-[52ch] flex-col items-start gap-2", className)}>
      <span className="mb-2 grid size-10 place-items-center rounded-md bg-accent-soft">
        <Icon aria-hidden className="size-5 text-accent" strokeWidth={1.8} />
      </span>
      <h2 className="text-title font-semibold text-ink">{title}</h2>
      <p className="text-body text-ink-muted">{children}</p>
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}
