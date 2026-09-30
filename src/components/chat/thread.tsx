import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { EmptyState } from "./empty-state";
import { MessageBubble } from "./message-bubble";
import { Composer, type PendingFile } from "./composer";
import type { LogicalModelId } from "@/lib/ai/types";

export function ChatThread({
  messages,
  streaming,
  model,
  setModel,
  webSearch,
  setWebSearch,
  imageMode,
  setImageMode,
  onSend,
  onStop,
  onPrompt,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  model: LogicalModelId;
  setModel: (id: LogicalModelId) => void;
  webSearch: boolean;
  setWebSearch: (v: boolean) => void;
  imageMode: boolean;
  setImageMode: (v: boolean) => void;
  onSend: (text: string, files: PendingFile[], extra?: { regenerate?: boolean; editMessageId?: string }) => void;
  onStop: () => void;
  onPrompt: (text: string) => void;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, streaming]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onPrompt={onPrompt} />
        ) : (
          <div className="py-4">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                streaming={streaming && m.id === lastAssistant?.id}
                isLastAssistant={m.id === lastAssistant?.id}
                onRetry={
                  m.error
                    ? () => lastUser && onSend(lastUser.content, [], { regenerate: true })
                    : undefined
                }
                onRegenerate={
                  lastUser
                    ? () => onSend(lastUser.content, [], { regenerate: true })
                    : undefined
                }
                onEdit={(content) => onSend(content, [], { editMessageId: m.id })}
              />
            ))}
            <div ref={bottom} />
          </div>
        )}
      </div>
      <Composer
        model={model}
        onModel={setModel}
        webSearch={webSearch}
        onWebSearch={setWebSearch}
        imageMode={imageMode}
        onImageMode={setImageMode}
        streaming={streaming}
        onStop={onStop}
        onSend={(text, files) => onSend(text, files)}
      />
    </div>
  );
}
