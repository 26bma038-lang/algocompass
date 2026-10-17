import { Navigate, useParams } from "react-router-dom";
import { TOPIC_BY_ID } from "@/engine/topics";

/**
 * Deep link (/topics/:topicId): Topic Detail is a side panel, so this opens the Topics map (Progress),
 * where the topic sits in context, and the tree opens the panel.
 */
export function TopicDetail() {
  const { topicId } = useParams();
  const known = topicId !== undefined && TOPIC_BY_ID.has(topicId);
  return <Navigate to="/progress/topics" replace state={known ? { openTopic: topicId } : null} />;
}
