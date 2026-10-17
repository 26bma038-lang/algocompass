import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useSchemeStore } from "@/lib/theme";

/** shadcn-style Sonner toaster on DESIGN.md's Float plane. */
export function Toaster(props: ToasterProps) {
  const scheme = useSchemeStore((st) => st.scheme);
  return (
    <Sonner
      theme={scheme}
      position="bottom-right"
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-md !border !border-glass-border-strong !bg-abyss-raised !text-ink !shadow-float !font-sans !text-body-sm",
          title: "!font-semibold !text-ink",
          description: "!text-ink-muted",
          error: "[&_[data-icon]]:!text-danger",
          success: "[&_[data-icon]]:!text-success",
        },
      }}
      {...props}
    />
  );
}
