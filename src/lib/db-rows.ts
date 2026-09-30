import { getSql } from "@/lib/db";
import { toIso } from "@/lib/utils";
import type { ChatAttachment, ChatMessage } from "@/lib/ai/types";

export type ConversationRow = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageRow = ChatMessage;

export async function listConversations(userId: string): Promise<ConversationRow[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    title: string;
    model: string;
    created_at: unknown;
    updated_at: unknown;
  }>`
    select id, title, model, created_at, updated_at
    from conversations
    where user_id = ${userId}
    order by updated_at desc
    limit 200
  `;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    model: r.model,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  }));
}

export async function getConversation(userId: string, id: string) {
  const sql = await getSql();
  const rows = await sql<{ id: string; title: string; model: string }>`
    select id, title, model from conversations
    where id = ${id} and user_id = ${userId}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function createConversation(input: {
  id: string;
  userId: string;
  title: string;
  model: string;
}) {
  const sql = await getSql();
  await sql`
    insert into conversations (id, user_id, title, model)
    values (${input.id}, ${input.userId}, ${input.title}, ${input.model})
  `;
}

export async function touchConversation(
  userId: string,
  id: string,
  patch: { title?: string; model?: string } = {},
) {
  const sql = await getSql();
  if (patch.title && patch.model) {
    await sql`
      update conversations
      set title = ${patch.title}, model = ${patch.model}, updated_at = now()
      where id = ${id} and user_id = ${userId}
    `;
    return;
  }
  if (patch.title) {
    await sql`
      update conversations
      set title = ${patch.title}, updated_at = now()
      where id = ${id} and user_id = ${userId}
    `;
    return;
  }
  if (patch.model) {
    await sql`
      update conversations
      set model = ${patch.model}, updated_at = now()
      where id = ${id} and user_id = ${userId}
    `;
    return;
  }
  await sql`
    update conversations set updated_at = now()
    where id = ${id} and user_id = ${userId}
  `;
}

export async function deleteConversation(userId: string, id: string) {
  const sql = await getSql();
  await sql`delete from conversations where id = ${id} and user_id = ${userId}`;
}

export async function insertMessage(input: {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  webSearch?: boolean;
  error?: string | null;
}) {
  const sql = await getSql();
  await sql`
    insert into messages (id, conversation_id, user_id, role, content, model, web_search, error)
    values (
      ${input.id},
      ${input.conversationId},
      ${input.userId},
      ${input.role},
      ${input.content},
      ${input.model ?? null},
      ${input.webSearch ?? false},
      ${input.error ?? null}
    )
  `;
}

export async function insertAttachment(input: {
  id: string;
  messageId: string;
  userId: string;
  conversationId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  extractedText?: string;
  dataBase64?: string;
}) {
  const sql = await getSql();
  await sql`
    insert into attachments (
      id, message_id, user_id, conversation_id, filename, mime_type, size_bytes, kind, extracted_text, data_base64
    ) values (
      ${input.id},
      ${input.messageId},
      ${input.userId},
      ${input.conversationId},
      ${input.filename},
      ${input.mimeType},
      ${input.sizeBytes},
      ${input.kind},
      ${input.extractedText ?? null},
      ${input.dataBase64 ?? null}
    )
  `;
}

export async function listMessages(userId: string, conversationId: string): Promise<MessageRow[]> {
  const sql = await getSql();
  const conv = await getConversation(userId, conversationId);
  if (!conv) return [];
  const rows = await sql<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    model: string | null;
    web_search: boolean;
    error: string | null;
    created_at: unknown;
  }>`
    select id, role, content, model, web_search, error, created_at
    from messages
    where conversation_id = ${conversationId} and user_id = ${userId}
    order by created_at asc
  `;
  const atts = await sql<{
    id: string;
    message_id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    kind: ChatAttachment["kind"];
    extracted_text: string | null;
    data_base64: string | null;
  }>`
    select id, message_id, filename, mime_type, size_bytes, kind, extracted_text, data_base64
    from attachments
    where conversation_id = ${conversationId} and user_id = ${userId}
  `;
  const byMsg = new Map<string, ChatAttachment[]>();
  for (const a of atts) {
    const list = byMsg.get(a.message_id) ?? [];
    list.push({
      id: a.id,
      filename: a.filename,
      mimeType: a.mime_type,
      sizeBytes: a.size_bytes,
      kind: a.kind,
      extractedText: a.extracted_text ?? undefined,
      dataBase64: a.kind === "image" || a.kind === "generated" ? a.data_base64 ?? undefined : undefined,
    });
    byMsg.set(a.message_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    model: r.model,
    webSearch: r.web_search,
    error: r.error,
    createdAt: toIso(r.created_at),
    attachments: byMsg.get(r.id),
  }));
}

export async function deleteMessageAndAfter(
  userId: string,
  conversationId: string,
  messageId: string,
) {
  const sql = await getSql();
  const target = await sql<{ created_at: unknown }>`
    select created_at from messages
    where id = ${messageId} and conversation_id = ${conversationId} and user_id = ${userId}
    limit 1
  `;
  const created = target[0]?.created_at;
  if (!created) return;
  await sql`
    delete from messages
    where conversation_id = ${conversationId}
      and user_id = ${userId}
      and created_at >= ${created as string}
  `;
}

export async function deleteLastAssistant(userId: string, conversationId: string) {
  const sql = await getSql();
  const last = await sql<{ id: string }>`
    select id from messages
    where conversation_id = ${conversationId} and user_id = ${userId} and role = 'assistant'
    order by created_at desc
    limit 1
  `;
  const id = last[0]?.id;
  if (!id) return;
  await sql`delete from messages where id = ${id} and user_id = ${userId}`;
}

export async function ensureProfile(userId: string) {
  const sql = await getSql();
  await sql`
    insert into profiles (user_id) values (${userId})
    on conflict (user_id) do nothing
  `;
}

export async function getProfile(userId: string) {
  const sql = await getSql();
  await ensureProfile(userId);
  const rows = await sql<{
    display_name: string | null;
    theme: "light" | "dark" | "system";
    preferred_model: string;
    default_web_search: boolean;
  }>`
    select display_name, theme, preferred_model, default_web_search
    from profiles where user_id = ${userId} limit 1
  `;
  return (
    rows[0] ?? {
      display_name: null,
      theme: "system" as const,
      preferred_model: "auto",
      default_web_search: false,
    }
  );
}

export async function updateProfile(
  userId: string,
  patch: {
    displayName?: string | null;
    theme?: "light" | "dark" | "system";
    preferredModel?: string;
    defaultWebSearch?: boolean;
  },
) {
  const sql = await getSql();
  await ensureProfile(userId);
  const current = await getProfile(userId);
  const displayName = patch.displayName === undefined ? current.display_name : patch.displayName;
  const theme = patch.theme ?? current.theme;
  const preferredModel = patch.preferredModel ?? current.preferred_model;
  const defaultWebSearch = patch.defaultWebSearch ?? current.default_web_search;
  await sql`
    update profiles
    set display_name = ${displayName},
        theme = ${theme},
        preferred_model = ${preferredModel},
        default_web_search = ${defaultWebSearch},
        updated_at = now()
    where user_id = ${userId}
  `;
}

export async function recordUsage(input: {
  id: string;
  userId: string;
  kind: string;
  model?: string;
  latencyMs?: number;
  ok: boolean;
  errorCategory?: string;
}) {
  const sql = await getSql();
  await sql`
    insert into usage_events (id, user_id, kind, model, latency_ms, ok, error_category)
    values (
      ${input.id},
      ${input.userId},
      ${input.kind},
      ${input.model ?? null},
      ${input.latencyMs ?? null},
      ${input.ok},
      ${input.errorCategory ?? null}
    )
  `;
}

export async function listGeneratedImages(userId: string) {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    prompt: string;
    enhanced_prompt: string | null;
    model: string;
    aspect_ratio: string;
    mime_type: string;
    conversation_id: string | null;
    created_at: unknown;
  }>`
    select id, prompt, enhanced_prompt, model, aspect_ratio, mime_type, conversation_id, created_at
    from generated_images
    where user_id = ${userId}
    order by created_at desc
    limit 100
  `;
  return rows.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    enhancedPrompt: r.enhanced_prompt,
    model: r.model,
    aspectRatio: r.aspect_ratio,
    mimeType: r.mime_type,
    conversationId: r.conversation_id,
    createdAt: toIso(r.created_at),
  }));
}

export async function getGeneratedImage(userId: string, id: string) {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    prompt: string;
    data_base64: string;
    mime_type: string;
  }>`
    select id, prompt, data_base64, mime_type
    from generated_images
    where id = ${id} and user_id = ${userId}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function insertGeneratedImage(input: {
  id: string;
  userId: string;
  prompt: string;
  enhancedPrompt?: string;
  model: string;
  aspectRatio: string;
  dataBase64: string;
  mimeType: string;
  conversationId?: string;
  messageId?: string;
}) {
  const sql = await getSql();
  await sql`
    insert into generated_images (
      id, user_id, prompt, enhanced_prompt, model, aspect_ratio, data_base64, mime_type, conversation_id, message_id
    ) values (
      ${input.id},
      ${input.userId},
      ${input.prompt},
      ${input.enhancedPrompt ?? null},
      ${input.model},
      ${input.aspectRatio},
      ${input.dataBase64},
      ${input.mimeType},
      ${input.conversationId ?? null},
      ${input.messageId ?? null}
    )
  `;
}

export async function deleteGeneratedImage(userId: string, id: string) {
  const sql = await getSql();
  await sql`delete from generated_images where id = ${id} and user_id = ${userId}`;
}
