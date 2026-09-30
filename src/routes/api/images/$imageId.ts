import { createFileRoute } from "@tanstack/react-router";
import { getGeneratedImage } from "@/lib/db-rows";
import { userFromRequest } from "@/lib/server/request-user";

export const Route = createFileRoute("/api/images/$imageId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await userFromRequest(request);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const row = await getGeneratedImage(user.id, params.imageId);
        if (!row) return new Response("Not found", { status: 404 });
        const bytes = Uint8Array.from(atob(row.data_base64), (c) => c.charCodeAt(0));
        return new Response(bytes, {
          headers: {
            "Content-Type": row.mime_type,
            "Cache-Control": "private, max-age=3600",
            "Content-Disposition": `inline; filename="thundergpt-${row.id}.png"`,
          },
        });
      },
    },
  },
});
