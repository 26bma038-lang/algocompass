import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export function Quests() {
  return (
    <EmptyState icon={ScrollText} title="No quests yet">
      Daily and weekly quests target your weakest topics and earn XP toward your level. They start
      once your solve history has synced.
    </EmptyState>
  );
}
