import { useEffect } from "react";
import { AppShell } from "@/components/app/shell";
import { ChatThread } from "@/components/chat/thread";
import { useChatSession } from "@/hooks/use-chat-session";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyProfile } from "@/lib/chat/server-fns";
import { isLogicalModelId } from "@/lib/ai/models";
import { Skeleton } from "@/components/ui/skeleton";

export function ChatApp({ conversationId }: { conversationId?: string }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="flex h-dvh">
        <div className="hidden w-[280px] border-r border-border p-4 md:block">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-4 h-10 w-full" />
          <Skeleton className="mt-6 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-24 w-72" />
        </div>
      </div>
    );
  }
  return <ChatAppReady conversationId={conversationId} signedIn={!!user} />;
}

function ChatAppReady({
  conversationId,
  signedIn,
}: {
  conversationId?: string;
  signedIn: boolean;
}) {
  const session = useChatSession({ conversationId, signedIn });
  useEffect(() => {
    if (!signedIn) return;
    void getMyProfile()
      .then((p) => {
        if (isLogicalModelId(p.preferredModel)) session.setModel(p.preferredModel);
        session.setWebSearch(p.defaultWebSearch);
      })
      .catch(() => undefined);
    // Load once per session, not on every send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);
  return (
    <AppShell
      conversations={session.conversations}
      activeId={conversationId}
      onRename={session.rename}
      onDelete={session.remove}
    >
      <ChatThread
        messages={session.messages}
        streaming={session.streaming}
        model={session.model}
        setModel={session.setModel}
        webSearch={session.webSearch}
        setWebSearch={session.setWebSearch}
        imageMode={session.imageMode}
        setImageMode={session.setImageMode}
        onSend={(text, files, extra) => void session.send(text, files, extra)}
        onStop={session.stop}
        onPrompt={(text) => void session.send(text, [])}
      />
    </AppShell>
  );
}
