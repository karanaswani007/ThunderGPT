import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  deleteConversation,
  deleteGeneratedImage,
  getProfile,
  listConversations,
  listGeneratedImages,
  listMessages,
  touchConversation,
  updateProfile,
} from "@/lib/db-rows";
import { idSchema, renameSchema } from "@/lib/validation/chat";
import { z } from "zod";

export const listMyConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => listConversations(context.userId));

export const listMyMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => listMessages(context.userId, id));

export const renameMyConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => renameSchema.parse(input))
  .handler(async ({ context, data }) => {
    await touchConversation(context.userId, data.id, { title: data.title });
    return { ok: true as const };
  });

export const deleteMyConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => idSchema.parse(input))
  .handler(async ({ context, data }) => {
    await deleteConversation(context.userId, data.id);
    return { ok: true as const };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const p = await getProfile(context.userId);
    return {
      displayName: p.display_name,
      theme: p.theme,
      preferredModel: p.preferred_model,
      defaultWebSearch: p.default_web_search,
    };
  });

const profilePatch = z.object({
  displayName: z.string().trim().max(80).nullable().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  preferredModel: z.string().max(40).optional(),
  defaultWebSearch: z.boolean().optional(),
});

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => profilePatch.parse(input))
  .handler(async ({ context, data }) => {
    await updateProfile(context.userId, data);
    return { ok: true as const };
  });

export const listMyImages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => listGeneratedImages(context.userId));

export const deleteMyImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => idSchema.parse(input))
  .handler(async ({ context, data }) => {
    await deleteGeneratedImage(context.userId, data.id);
    return { ok: true as const };
  });
