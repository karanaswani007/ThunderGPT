import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/chat-app";

export const Route = createFileRoute("/chat/$conversationId")({
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  return <ChatApp conversationId={conversationId} />;
}
