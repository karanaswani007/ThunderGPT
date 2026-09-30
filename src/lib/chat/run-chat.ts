import { identityAnswer } from "@/lib/ai/identity";
import { logAi } from "@/lib/ai/logger";
import { getActiveProvider, systemPromptFor } from "@/lib/ai/provider";
import { selectLogicalModel } from "@/lib/ai/select-model";
import { generateTitle } from "@/lib/ai/title";
import { ThunderError, toUserError } from "@/lib/ai/errors";
import type { ChatAttachment, ChatMessage, LogicalModelId } from "@/lib/ai/types";
import {
  createConversation,
  deleteLastAssistant,
  deleteMessageAndAfter,
  getConversation,
  insertAttachment,
  insertGeneratedImage,
  insertMessage,
  listMessages,
  recordUsage,
  touchConversation,
} from "@/lib/db-rows";
import { extractFileText } from "@/lib/files/extract";
import { encodeSse, type ClientEvent } from "@/lib/sse";
import { newId } from "@/lib/utils";
import { validateAttachmentList } from "@/lib/validation/files";
import type { ChatRequest } from "@/lib/validation/chat";

function push(controller: ReadableStreamDefaultController<Uint8Array>, event: ClientEvent) {
  controller.enqueue(encodeSse(event));
}

async function hydrateAttachments(
  files: ChatRequest["attachments"],
): Promise<ChatAttachment[]> {
  if (!files?.length) return [];
  const validated = validateAttachmentList(files);
  if (!validated.ok) throw new ThunderError(validated.error, { status: 400, category: "validation" });
  const out: ChatAttachment[] = [];
  for (const file of validated.files) {
    const extracted = await extractFileText(file);
    out.push({
      id: newId(),
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      kind: file.kind,
      extractedText: extracted.extractedText,
      dataBase64: extracted.dataBase64,
    });
  }
  return out;
}

export async function runChatStream(opts: {
  userId: string | null;
  request: ChatRequest;
  abortSignal: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
  const { userId, request, abortSignal } = opts;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const started = Date.now();
      let modelUsed = "";
      let conversationId = request.conversationId ?? newId();
      const userMessageId = newId();
      const assistantMessageId = newId();
      try {
        const attachments = await hydrateAttachments(request.attachments);
        const documentChars = attachments.reduce(
          (n, a) => n + (a.extractedText?.length ?? 0),
          0,
        );
        const logical = selectLogicalModel({
          preferred: request.model as LogicalModelId,
          imageMode: request.imageMode,
          hasImages: attachments.some((a) => a.kind === "image"),
          hasDocuments: attachments.some((a) => a.kind !== "image"),
          documentChars,
          userText: request.message,
        });

        if (userId) {
          const existing = request.conversationId
            ? await getConversation(userId, request.conversationId)
            : null;
          if (existing) {
            conversationId = existing.id;
            if (request.editMessageId) {
              await deleteMessageAndAfter(userId, conversationId, request.editMessageId);
            } else if (request.regenerate) {
              await deleteLastAssistant(userId, conversationId);
            }
          } else {
            await createConversation({
              id: conversationId,
              userId,
              title: "New chat",
              model: request.model,
            });
          }
          push(controller, { type: "conversation", id: conversationId });
          if (!request.regenerate) {
            await insertMessage({
              id: userMessageId,
              conversationId,
              userId,
              role: "user",
              content: request.message,
              model: request.model,
              webSearch: request.webSearch,
            });
            for (const att of attachments) {
              await insertAttachment({
                id: att.id,
                messageId: userMessageId,
                userId,
                conversationId,
                filename: att.filename,
                mimeType: att.mimeType,
                sizeBytes: att.sizeBytes,
                kind: att.kind,
                extractedText: att.extractedText,
                dataBase64: att.dataBase64,
              });
            }
          }
        } else {
          push(controller, { type: "conversation", id: conversationId });
        }

        if (logical === "image" || request.imageMode) {
          const provider = getActiveProvider();
          modelUsed = provider.resolveModel("image");
          const result = await provider.generateImage({
            prompt: request.message,
            aspectRatio: request.aspectRatio,
            referenceImageBase64: attachments.find((attachment) => attachment.kind === "image")
              ?.dataBase64,
            referenceMimeType: attachments.find((attachment) => attachment.kind === "image")
              ?.mimeType,
            abortSignal,
          });
          const imageId = newId();
          if (userId) {
            await insertGeneratedImage({
              id: imageId,
              userId,
              prompt: request.message,
              model: result.model,
              aspectRatio: request.aspectRatio ?? "1:1",
              dataBase64: result.dataBase64,
              mimeType: result.mimeType,
              conversationId,
              messageId: assistantMessageId,
            });
            await insertMessage({
              id: assistantMessageId,
              conversationId,
              userId,
              role: "assistant",
              content: `Generated image for: ${request.message}`,
              model: result.model,
            });
            await insertAttachment({
              id: newId(),
              messageId: assistantMessageId,
              userId,
              conversationId,
              filename: "generated.png",
              mimeType: result.mimeType,
              sizeBytes: Math.floor((result.dataBase64.length * 3) / 4),
              kind: "generated",
              dataBase64: result.dataBase64,
            });
            await touchConversation(userId, conversationId);
            await recordUsage({
              id: newId(),
              userId,
              kind: "image",
              model: result.model,
              latencyMs: Date.now() - started,
              ok: true,
            });
          }
          push(controller, {
            type: "image",
            id: imageId,
            mimeType: result.mimeType,
            dataBase64: userId ? undefined : result.dataBase64,
          });
          push(controller, {
            type: "delta",
            text: `Here's the image I generated for **${request.message}**.`,
          });
          const title = await generateTitle(request.message);
          if (userId) await touchConversation(userId, conversationId, { title });
          push(controller, { type: "title", title });
          push(controller, {
            type: "done",
            messageId: assistantMessageId,
            model: result.model,
            conversationId,
          });
          controller.close();
          return;
        }

        const canned = identityAnswer(request.message);
        if (canned && attachments.length === 0) {
          push(controller, { type: "delta", text: canned });
          if (userId) {
            await insertMessage({
              id: assistantMessageId,
              conversationId,
              userId,
              role: "assistant",
              content: canned,
              model: "identity",
            });
            await touchConversation(userId, conversationId);
          }
          const title = await generateTitle(request.message);
          if (userId) await touchConversation(userId, conversationId, { title });
          push(controller, { type: "title", title });
          push(controller, {
            type: "done",
            messageId: assistantMessageId,
            model: "identity",
            conversationId,
          });
          controller.close();
          return;
        }

        const provider = getActiveProvider();
        const modelId = provider.resolveModel(logical);
        modelUsed = modelId;
        const history: ChatMessage[] = userId
          ? await listMessages(userId, conversationId)
          : [];
        const prior = history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .filter((m) => (request.regenerate ? true : m.id !== userMessageId))
          .slice(-24)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            attachments: m.attachments,
          }));
        if (!request.regenerate) {
          prior.push({
            role: "user",
            content: request.message,
            attachments,
          });
        }

        let full = "";
        for await (const ev of provider.streamText({
          modelId,
          system: systemPromptFor(provider),
          messages: prior,
          webSearch: request.webSearch,
          maxTokens: 4096,
          abortSignal,
        })) {
          if (ev.type === "delta") {
            full += ev.text;
            push(controller, ev);
          } else if (ev.type === "sources") {
            push(controller, ev);
          }
        }

        if (!full.trim()) {
          full = "ThunderGPT did not return a response. Please try again.";
          push(controller, { type: "delta", text: full });
        }

        if (userId) {
          await insertMessage({
            id: assistantMessageId,
            conversationId,
            userId,
            role: "assistant",
            content: full,
            model: modelId,
            webSearch: request.webSearch,
          });
          await touchConversation(userId, conversationId);
          await recordUsage({
            id: newId(),
            userId,
            kind: request.webSearch ? "search" : "chat",
            model: modelId,
            latencyMs: Date.now() - started,
            ok: true,
          });
          const isFirst = history.filter((m) => m.role === "user").length <= 1;
          if (isFirst) {
            const title = await generateTitle(request.message);
            await touchConversation(userId, conversationId, { title });
            push(controller, { type: "title", title });
          }
        } else {
          const title = await generateTitle(request.message);
          push(controller, { type: "title", title });
        }

        logAi({
          event: "chat.complete",
          provider: provider.id,
          model: modelId,
          latencyMs: Date.now() - started,
          ok: true,
        });
        push(controller, {
          type: "done",
          messageId: assistantMessageId,
          model: modelId,
          conversationId,
        });
        controller.close();
      } catch (err) {
        const message = abortSignal.aborted
          ? "Generation stopped."
          : toUserError(err);
        const category = err instanceof ThunderError ? err.category : "internal";
        logAi({
          event: "chat.fail",
          category,
          model: modelUsed,
          latencyMs: Date.now() - started,
          ok: false,
        });
        if (userId) {
          try {
            await recordUsage({
              id: newId(),
              userId,
              kind: "chat",
              model: modelUsed || undefined,
              latencyMs: Date.now() - started,
              ok: false,
              errorCategory: category,
            });
            await insertMessage({
              id: assistantMessageId,
              conversationId,
              userId,
              role: "assistant",
              content: "",
              model: modelUsed || null,
              error: message,
            });
          } catch {
            /* ignore persist errors */
          }
        }
        try {
          push(controller, { type: "error", message });
          controller.close();
        } catch {
          controller.error(err);
        }
      }
    },
  });
}
