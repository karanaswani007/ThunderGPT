import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Image as ImageIcon,
  LogOut,
  Plus,
  Search,
  Settings,
  Trash2,
  Pencil,
  PanelLeft,
} from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { formatRelativeTime } from "@/lib/utils";
import type { ConversationRow } from "@/lib/db-rows";

export function Sidebar({
  conversations,
  activeId,
  onRename,
  onDelete,
  onClose,
}: {
  conversations: ConversationRow[];
  activeId?: string;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose?: () => void;
}) {
  const [q, setQ] = useState("");
  const [rename, setRename] = useState<{ id: string; title: string } | null>(null);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(s));
  }, [conversations, q]);
  const user = useCurrentUser();
  const { isPending } = useCurrentUserState();
  const navigate = useNavigate();

  return (
    <aside className="bolt-rail flex h-full min-h-0 w-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <Link to="/" onClick={onClose} className="min-w-0">
          <Wordmark compact />
        </Link>
        {onClose ? (
          <button
            type="button"
            className="grid size-9 place-items-center rounded-md hover:bg-muted md:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <PanelLeft className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="px-3">
        <Button
          className="w-full justify-start rounded-xl"
          onClick={() => {
            onClose?.();
            void navigate({ to: "/chat" });
          }}
        >
          <Plus /> New chat
        </Button>
      </div>
      <div className="relative px-3 pt-3">
        <Search className="pointer-events-none absolute left-6 top-1/2 size-3.5 -translate-y-0.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search chats"
          className="h-10 rounded-xl pl-9"
          aria-label="Search chats"
        />
      </div>
      <nav className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            {q ? "No chats match that search." : "No conversations yet."}
          </p>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className={`group mb-0.5 flex items-center rounded-xl ${
                activeId === c.id ? "bg-muted" : "hover:bg-muted/70"
              }`}
            >
              <Link
                to="/chat/$conversationId"
                params={{ conversationId: c.id }}
                onClick={onClose}
                className="min-w-0 flex-1 px-3 py-2.5"
              >
                <div className="truncate text-sm">{c.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatRelativeTime(c.updatedAt)}
                </div>
              </Link>
              <button
                type="button"
                className="size-8 shrink-0 rounded-md text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100"
                aria-label="Rename"
                onClick={() => setRename({ id: c.id, title: c.title })}
              >
                <Pencil className="mx-auto size-3.5" />
              </button>
              <button
                type="button"
                className="mr-1 size-8 shrink-0 rounded-md text-muted-foreground opacity-0 hover:bg-background hover:text-destructive group-hover:opacity-100"
                aria-label="Delete"
                onClick={() => void onDelete(c.id)}
              >
                <Trash2 className="mx-auto size-3.5" />
              </button>
            </div>
          ))
        )}
      </nav>
      <div className="border-t border-border p-3">
        <Link
          to="/gallery"
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted"
        >
          <ImageIcon className="size-4" /> Gallery
        </Link>
        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted"
        >
          <Settings className="size-4" /> Settings
        </Link>
        <div className="mt-2 rounded-xl bg-muted/60 px-3 py-2">
          {isPending ? (
            <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
          ) : (
            <>
              <SignedIn>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {user?.displayName ?? user?.primaryEmail ?? "Account"}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {user?.primaryEmail}
                    </div>
                  </div>
                  {!hasGateSessionMarker() ? (
                    <button
                      type="button"
                      aria-label="Sign out"
                      className="grid size-8 place-items-center rounded-md hover:bg-background"
                      onClick={() => void signOut()}
                    >
                      <LogOut className="size-4" />
                    </button>
                  ) : null}
                </div>
              </SignedIn>
              <SignedOut>
                <Link
                  to="/login"
                  search={{ redirect: "/chat" }}
                  onClick={onClose}
                  className="block text-sm font-medium text-primary"
                >
                  Sign in to save chats
                </Link>
              </SignedOut>
            </>
          )}
        </div>
      </div>
      <Dialog
        open={!!rename}
        onOpenChange={(o) => {
          if (!o) setRename(null);
        }}
      >
        <DialogContent title="Rename chat">
          <Input
            value={rename?.title ?? ""}
            onChange={(e) =>
              setRename((r) => (r ? { ...r, title: e.target.value } : r))
            }
            maxLength={80}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRename(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!rename) return;
                await onRename(rename.id, rename.title.trim() || "New chat");
                setRename(null);
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
