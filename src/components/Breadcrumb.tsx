import { Fragment } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * v1.8: the one way back on every page that sits below a screen or a tab: Lesson, Watch and
 * Playlist (since v1.3/v1.6), and now a sheet, the beginner's sheet list, Badges and the Topics map
 * too (they had four different "‹ Back" links). Side panels keep their ×.
 */

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * "‹ Learn › Beginner Path › Step 3". The back arrow goes back in history when there is some (so
 * Back from a lesson opened on Today returns to Today), and otherwise to the parent crumb.
 */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  const navigate = useNavigate();
  const parent = [...crumbs].reverse().find((c) => c.to)?.to ?? "/";
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(parent);
  };
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={back}
        aria-label="Back"
        title="Back (Alt Left)"
        className="-ml-2 grid size-8 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <ol className="flex min-w-0 items-center gap-1 text-body-sm">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <li aria-hidden className="text-ink-faint">
                <ChevronRight className="size-3.5" />
              </li>
            )}
            <li className={cn("min-w-0", i === crumbs.length - 1 ? "truncate" : "shrink-0")}>
              {c.to ? (
                <Link to={c.to} className="rounded-xs text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">
                  {c.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
