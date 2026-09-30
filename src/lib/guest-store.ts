import type { ChatMessage } from "@/lib/ai/types";
import type { ConversationRow } from "@/lib/db-rows";

const KEY = "thundergpt.guest.v1";

export type GuestState = {
  conversations: ConversationRow[];
  messages: Record<string, ChatMessage[]>;
};

function empty(): GuestState {
  return { conversations: [], messages: {} };
}

export function loadGuest(): GuestState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as GuestState;
    if (!parsed.conversations || !parsed.messages) return empty();
    return parsed;
  } catch {
    return empty();
  }
}

export function saveGuest(state: GuestState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function upsertGuestConversation(
  state: GuestState,
  conv: ConversationRow,
  messages: ChatMessage[],
): GuestState {
  const others = state.conversations.filter((c) => c.id !== conv.id);
  const next = {
    conversations: [conv, ...others].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    messages: { ...state.messages, [conv.id]: messages },
  };
  saveGuest(next);
  return next;
}

export function deleteGuestConversation(state: GuestState, id: string): GuestState {
  const next = {
    conversations: state.conversations.filter((c) => c.id !== id),
    messages: { ...state.messages },
  };
  delete next.messages[id];
  saveGuest(next);
  return next;
}

export function renameGuestConversation(
  state: GuestState,
  id: string,
  title: string,
): GuestState {
  const next = {
    ...state,
    conversations: state.conversations.map((c) =>
      c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c,
    ),
  };
  saveGuest(next);
  return next;
}
