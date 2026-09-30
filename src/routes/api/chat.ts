import { createFileRoute } from "@tanstack/react-router";
import { runChatStream } from "@/lib/chat/run-chat";
import { clientKey, LIMITS, rateLimit } from "@/lib/rate-limit";
import { userFromRequest } from "@/lib/server/request-user";
import { sseResponse } from "@/lib/sse";
import { parseChatRequest } from "@/lib/validation/chat";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json(
            { error: "That request is not valid. Please try again." },
            { status: 400 },
          );
        }
        const parsed = parseChatRequest(json);
        if (!parsed.ok) {
          return Response.json({ error: parsed.error }, { status: 400 });
        }
        const user = await userFromRequest(request);
        const limit = parsed.data.imageMode
          ? user
            ? LIMITS.authImage
            : LIMITS.guestImage
          : user
            ? LIMITS.authChat
            : LIMITS.guestChat;
        const rl = rateLimit(
          `${parsed.data.imageMode ? "img" : "chat"}:${clientKey(user?.id ?? null, request)}`,
          limit,
        );
        if (!rl.ok) {
          return Response.json(
            {
              error: `You're sending messages a little too quickly. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`,
            },
            { status: 429 },
          );
        }
        const stream = await runChatStream({
          userId: user?.id ?? null,
          request: parsed.data,
          abortSignal: request.signal,
        });
        return sseResponse(stream);
      },
    },
  },
});

