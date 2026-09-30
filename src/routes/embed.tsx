import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/chat-app";

export const Route = createFileRoute("/embed")({
  component: Embed,
});

function Embed() {
  return (
    <div className="h-dvh overflow-hidden">
      <ChatApp />
    </div>
  );
}
