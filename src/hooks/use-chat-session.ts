import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ChatMessage, LogicalModelId } from "@/lib/ai/types";
import type { ConversationRow } from "@/lib/db-rows";
import { apiFetch } from "@/lib/client/api-fetch";
import {
  deleteMyConversation,
  listMyConversations,
  listMyMessages,
  renameMyConversation,
} from "@/lib/chat/server-fns";
import {
  deleteGuestConversation,
  loadGuest,
  renameGuestConversation,
  saveGuest,
  upsertGuestConversation,
} from "@/lib/guest-store";
import { newId } from "@/lib/utils";
import type { PendingFile } from "@/components/chat/composer";
import type { ClientEvent } from "@/lib/sse";
import { toast } from "sonner";

export function useChatSession(opts: {
  conversationId?: string;
  signedIn: boolean;
}) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState<LogicalModelId>("auto");
  const [webSearch, setWebSearch] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refreshList = useCallback(async () => {
    if (opts.signedIn) {
      try {
        const rows = await listMyConversations();
        setConversations(rows);
      } catch {
        setConversations([]);
      }
      return;
    }
    setConversations(loadGuest().conversations);
  }, [opts.signedIn]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!opts.conversationId) {
        setMessages([]);
        return;
      }
      if (opts.signedIn) {
        try {
          const rows = await listMyMessages({ data: opts.conversationId });
          if (!cancelled) setMessages(rows);
        } catch {
          if (!cancelled) setMessages([]);
        }
        return;
      }
      const guest = loadGuest();
      if (!cancelled) setMessages(guest.messages[opts.conversationId] ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [opts.conversationId, opts.signedIn]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (
      text: string,
      files: PendingFile[],
      extra: { regenerate?: boolean; editMessageId?: string } = {},
    ) => {
      const convId = opts.conversationId;
      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        attachments: files.map((f) => ({
          id: newId(),
          filename: f.filename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          kind: f.mimeType.startsWith("image/") ? "image" : "document",
          dataBase64: f.dataBase64,
        })),
      };
      const assistantId = newId();
      setMessages((prev) => {
        let next = prev;
        if (extra.editMessageId) {
          const idx = next.findIndex((m) => m.id === extra.editMessageId);
          next = idx >= 0 ? next.slice(0, idx) : next;
        } else if (extra.regenerate) {
          const lastA = [...next].reverse().findIndex((m) => m.role === "assistant");
          if (lastA >= 0) next = next.slice(0, next.length - 1 - lastA);
        }
        if (!extra.regenerate) next = [...next, userMsg];
        return [
          ...next,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            createdAt: new Date().toISOString(),
          },
        ];
      });
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await apiFetch("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            conversationId: convId,
            message: text,
            model,
            webSearch,
            imageMode,
            regenerate: extra.regenerate,
            editMessageId: extra.editMessageId,
            attachments: files.map((f) => ({
              filename: f.filename,
              mimeType: f.mimeType,
              sizeBytes: f.sizeBytes,
              dataBase64: f.dataBase64,
            })),
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "ThunderGPT is temporarily unavailable. Please try again.");
        }
        const reader = res.body?.getReader();
        if (!reader) throw new Error("ThunderGPT is temporarily unavailable. Please try again.");
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedConv = convId;
        let assembled = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.replace(/^data:\s*/, "").trim();
            if (!line) continue;
            let ev: ClientEvent;
            try {
              ev = JSON.parse(line) as ClientEvent;
            } catch {
              continue;
            }
            if (ev.type === "conversation") {
              streamedConv = ev.id;
              if (!convId) {
                void navigate({ to: "/chat/$conversationId", params: { conversationId: ev.id } });
              }
            } else if (ev.type === "delta") {
              assembled += ev.text;
              const chunk = ev.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + chunk } : m,
                ),
              );
            } else if (ev.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, error: ev.message } : m,
                ),
              );
            } else if (ev.type === "title" && streamedConv) {
              setConversations((prev) => {
                const exists = prev.some((c) => c.id === streamedConv);
                const row: ConversationRow = {
                  id: streamedConv!,
                  title: ev.title,
                  model,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                return exists
                  ? prev.map((c) => (c.id === streamedConv ? { ...c, title: ev.title } : c))
                  : [row, ...prev];
              });
            } else if (ev.type === "done") {
              streamedConv = ev.conversationId;
            }
          }
        }
        if (!opts.signedIn && streamedConv) {
          const now = new Date().toISOString();
          const guest = loadGuest();
          const current = (guest.messages[streamedConv] ?? []).filter(
            (m) => m.role !== "assistant" || m.content,
          );
          const finalMessages: ChatMessage[] = extra.regenerate
            ? [...messages.filter((m) => m.role !== "assistant").slice(0, -0), userMsg]
            : [...(guest.messages[streamedConv] ?? []), userMsg];
          const assistant: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: assembled,
            createdAt: now,
          };
          const conv: ConversationRow = {
            id: streamedConv,
            title:
              guest.conversations.find((c) => c.id === streamedConv)?.title ??
              text.slice(0, 48) ??
              "New chat",
            model,
            createdAt: now,
            updatedAt: now,
          };
          const nextMsgs = [...(guest.messages[streamedConv] ?? current), userMsg, assistant].filter(
            (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
          );
          const saved = upsertGuestConversation(guest, conv, nextMsgs.length ? nextMsgs : [userMsg, assistant]);
          setConversations(saved.conversations);
          void finalMessages;
        } else {
          void refreshList();
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && !m.content
                ? { ...m, error: "Generation stopped." }
                : m,
            ),
          );
        } else {
          const message =
            err instanceof Error
              ? err.message
              : "ThunderGPT is temporarily unavailable. Please try again.";
          toast.error(message);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, error: message } : m)),
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [imageMode, messages, model, navigate, opts.conversationId, opts.signedIn, refreshList, webSearch],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      if (opts.signedIn) {
        await renameMyConversation({ data: { id, title } });
        await refreshList();
        return;
      }
      const next = renameGuestConversation(loadGuest(), id, title);
      setConversations(next.conversations);
    },
    [opts.signedIn, refreshList],
  );

  const remove = useCallback(
    async (id: string) => {
      if (opts.signedIn) {
        await deleteMyConversation({ data: { id } });
        await refreshList();
      } else {
        const next = deleteGuestConversation(loadGuest(), id);
        setConversations(next.conversations);
        saveGuest(next);
      }
      if (opts.conversationId === id) {
        void navigate({ to: "/chat" });
      }
    },
    [navigate, opts.conversationId, opts.signedIn, refreshList],
  );

  return {
    conversations,
    messages,
    streaming,
    model,
    setModel,
    webSearch,
    setWebSearch,
    imageMode,
    setImageMode,
    send,
    stop,
    rename,
    remove,
    refreshList,
  };
}
