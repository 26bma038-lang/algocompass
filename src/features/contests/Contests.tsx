import { Swords } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export function Contests() {
  return (
    <EmptyState icon={Swords} title="No contests loaded">
      Upcoming Codeforces rounds will be listed here first, with LeetCode weekly and biweekly contests
      below them. You can set a reminder for any of them.
    </EmptyState>
  );
}
