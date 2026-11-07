import { useId, useState } from "react";
import { Check, Copy } from "lucide-react";
import { CODE_LANGS, type CodeLang } from "@/engine/codeLang";
import { CODE_LANG_NAMES } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/** Your language first, then the rest in the usual order (v1.5). */
export const tabOrder = (mine: CodeLang): CodeLang[] => [mine, ...CODE_LANGS.filter((l) => l !== mine)];

/**
 * A lesson's code template (v1.5) in four tabs, yours first and open. Plain monospace on a sunken
 * well, scrolls inside itself, and a Copy button. Arrow keys move between tabs.
 */
export function CodeTemplate({ code, mine }: { code: Record<CodeLang, string>; mine: CodeLang }) {
  const order = tabOrder(mine);
  const [tab, setTab] = useState<CodeLang>(mine);
  const [copied, setCopied] = useState(false);
  const id = useId();
  const copy = () => {
    void navigator.clipboard?.writeText(code[tab]).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  const move = (dir: 1 | -1) => {
    const next = order[(order.indexOf(tab) + dir + order.length) % order.length]!;
    setTab(next);
    document.getElementById(`${id}-${next}`)?.focus();
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Template language" className="flex items-center gap-1">
          {order.map((l) => (
            <button
              key={l}
              id={`${id}-${l}`}
              type="button"
              role="tab"
              aria-selected={tab === l}
              aria-controls={`${id}-panel`}
              tabIndex={tab === l ? 0 : -1}
              onClick={() => setTab(l)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") move(1);
                if (e.key === "ArrowLeft") move(-1);
              }}
              className={cn(
                "flex h-7 items-center rounded-xs px-2.5 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
                tab === l ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
              )}
            >
              {CODE_LANG_NAMES[l]}
              {l === mine && <span className="sr-only"> (your language)</span>}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex h-7 items-center gap-1.5 rounded-xs px-2 text-body-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
        >
          {copied ? <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} /> : <Copy aria-hidden className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        tabIndex={0}
        className="max-h-[320px] overflow-auto rounded-md border border-glass-border bg-abyss-sunken p-4 font-mono text-body-sm leading-relaxed text-ink select-text"
      >
        <code>{code[tab]}</code>
      </pre>
    </div>
  );
}
