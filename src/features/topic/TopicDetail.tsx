import { Link, useParams } from "react-router-dom";
import { Crosshair } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export function TopicDetail() {
  const { topicId } = useParams();
  return (
    <EmptyState
      icon={Crosshair}
      title={topicId ? "No history for this topic yet" : "Pick a topic in the Skill Tree"}
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/skill-tree">Back to Skill Tree</Link>
        </Button>
      }
    >
      A topic page tracks its strength over time and recommends what to solve next: LeetCode
      problems to learn it, Codeforces problems to sharpen it.
    </EmptyState>
  );
}
