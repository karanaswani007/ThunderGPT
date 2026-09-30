import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/chat-app";

export const Route = createFileRoute("/chat/")({
  component: () => <ChatApp />,
});
