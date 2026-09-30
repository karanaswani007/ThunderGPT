import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Wordmark } from "@/components/brand/logo";
import type { ConversationRow } from "@/lib/db-rows";

export function AppShell({
  conversations,
  activeId,
  onRename,
  onDelete,
  children,
}: {
  conversations: ConversationRow[];
  activeId?: string;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="hidden w-[280px] shrink-0 md:block">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onRename={onRename}
          onDelete={onDelete}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-3 md:hidden">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-md hover:bg-muted"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <Wordmark compact />
        </header>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent>
            <Sidebar
              conversations={conversations}
              activeId={activeId}
              onRename={onRename}
              onDelete={onDelete}
              onClose={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
