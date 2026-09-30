import { z } from "zod";
import { isLogicalModelId } from "../ai/models.ts";

export const attachmentSchema = z.object({
  filename: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(12 * 1024 * 1024),
  dataBase64: z.string().min(8).max(18_000_000),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().min(1).max(80).optional(),
  message: z.string().max(32_000),
  model: z.string().refine((v) => isLogicalModelId(v), "Unknown model"),
  webSearch: z.boolean().optional(),
  imageMode: z.boolean().optional(),
  aspectRatio: z.string().max(16).optional(),
  regenerate: z.boolean().optional(),
  editMessageId: z.string().min(1).max(80).optional(),
  attachments: z.array(attachmentSchema).max(4).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export function parseChatRequest(input: unknown): {
  ok: true;
  data: ChatRequest;
} | { ok: false; error: string } {
  const parsed = chatRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That request is not valid. Please try again." };
  }
  const data = parsed.data;
  if (!data.message.trim() && !(data.attachments && data.attachments.length)) {
    return { ok: false, error: "Type a message or attach a file to send." };
  }
  if (data.imageMode && !data.message.trim()) {
    return { ok: false, error: "Describe the image you want ThunderGPT to create." };
  }
  return { ok: true, data };
}

export const renameSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(80),
});

export const idSchema = z.object({
  id: z.string().min(1).max(80),
});
