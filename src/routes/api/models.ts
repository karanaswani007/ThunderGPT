import { createFileRoute } from "@tanstack/react-router";
import { MODEL_CATALOG } from "@/lib/ai/models";
import { getActiveProvider, listProviders } from "@/lib/ai/provider";
import { ThunderError } from "@/lib/ai/errors";

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: () => {
        let provider: { id: string; label: string } | null = null;
        try {
          const active = getActiveProvider();
          provider = { id: active.id, label: active.label };
        } catch (err) {
          if (!(err instanceof ThunderError)) throw err;
        }
        return Response.json({
          models: MODEL_CATALOG,
          providers: listProviders(),
          active: provider,
        });
      },
    },
  },
});
