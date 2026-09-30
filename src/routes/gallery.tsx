import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { deleteMyImage, listMyConversations, listMyImages } from "@/lib/chat/server-fns";
import { apiFetch } from "@/lib/client/api-fetch";
import { useChatSession } from "@/hooks/use-chat-session";

export const Route = createFileRoute("/gallery")({ component: GalleryPage });

function GalleryPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="min-h-dvh bg-background" />;
  if (!user) return <RedirectToSignIn to="/login" />;
  return <GalleryInner />;
}

function GalleryInner() {
  const session = useChatSession({ signedIn: true });
  const [items, setItems] = useState<Awaited<ReturnType<typeof listMyImages>>>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const refresh = async () => {
    const rows = await listMyImages();
    setItems(rows);
    const next: Record<string, string> = {};
    for (const row of rows) {
      const res = await apiFetch(`/api/images/${row.id}`);
      if (!res.ok) continue;
      const blob = await res.blob();
      next[row.id] = URL.createObjectURL(blob);
    }
    setUrls((prev) => {
      Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
      return next;
    });
  };

  useEffect(() => {
    void refresh();
    void listMyConversations();
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = items.find((i) => i.id === open);

  return (
    <AppShell
      conversations={session.conversations}
      onRename={session.rename}
      onDelete={session.remove}
    >
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Images you generated with ThunderGPT.
          </p>
        </div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No generated images yet.</p>
            <Button className="mt-4" asChild>
              <Link to="/chat">Create one in chat</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="overflow-hidden rounded-2xl border border-border bg-card text-left"
                onClick={() => setOpen(item.id)}
              >
                {urls[item.id] ? (
                  <img src={urls[item.id]} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square animate-pulse bg-muted" />
                )}
                <div className="truncate px-3 py-2 text-xs text-muted-foreground">{item.prompt}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      {current && urls[current.id] ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="relative max-h-[90dvh] w-full max-w-3xl overflow-hidden rounded-2xl bg-card">
            <img src={urls[current.id]} alt="" className="max-h-[70dvh] w-full object-contain" />
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="min-w-0 flex-1 text-sm">{current.prompt}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = urls[current.id];
                    a.download = `thundergpt-${current.id}.png`;
                    a.click();
                  }}
                >
                  <Download /> Download
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteMyImage({ data: { id: current.id } });
                    setOpen(null);
                    await refresh();
                  }}
                >
                  <Trash2 /> Delete
                </Button>
                <Button variant="ghost" onClick={() => setOpen(null)} aria-label="Close">
                  <X />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
