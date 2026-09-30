import { useState } from "react";
import { Copy, Check, Pencil, RefreshCw, RotateCcw } from "lucide-react";
import type { ChatMessage } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { MarkdownBody } from "./markdown";
import { cn } from "@/lib/utils";
import { BoltMark } from "@/components/brand/logo";

export function MessageBubble({
  message,
  isLastAssistant,
  streaming,
  onRetry,
  onRegenerate,
  onEdit,
}: {
  message: ChatMessage;
  isLastAssistant?: boolean;
  streaming?: boolean;
  onRetry?: () => void;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <article
      className={cn("msg-enter group mx-auto w-full max-w-3xl px-4", isUser ? "pt-4" : "pt-2")}
    >
      <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
        {!isUser ? (
          <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
            <BoltMark className="h-5 w-4" />
          </div>
        ) : null}
        <div
          className={cn(
            "min-w-0 max-w-[min(100%,42rem)]",
            isUser
              ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground"
              : "rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3",
          )}
        >
          {message.attachments?.length ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.attachments.map((a) =>
                a.kind === "image" || a.kind === "generated" ? (
                  <img
                    key={a.id}
                    src={
                      a.dataBase64
                        ? `data:${a.mimeType};base64,${a.dataBase64}`
                        : a.kind === "generated"
                          ? `/api/images/${encodeURIComponent(a.id)}`
                          : undefined
                    }
                    alt={a.filename}
                    className="max-h-56 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <span
                    key={a.id}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-xs",
                      isUser
                        ? "border-primary-foreground/20 bg-primary-foreground/10"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {a.filename}
                  </span>
                ),
              )}
            </div>
          ) : null}
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          ) : message.error ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{message.error}</p>
              {onRetry ? (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RotateCcw /> Retry
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <MarkdownBody text={message.content || (streaming ? "" : "")} />
              {streaming ? <span className="caret-blink" aria-hidden /> : null}
            </>
          )}
        </div>
      </div>
      {!streaming && (message.content || isUser) ? (
        <div
          className={cn(
            "mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
            isUser ? "justify-end pr-0" : "justify-start pl-11",
          )}
        >
          <IconBtn label={copied ? "Copied" : "Copy"} onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </IconBtn>
          {isUser && onEdit ? (
            <IconBtn label="Edit" onClick={() => onEdit(message.content)}>
              <Pencil className="size-3.5" />
            </IconBtn>
          ) : null}
          {!isUser && isLastAssistant && onRegenerate ? (
            <IconBtn label="Regenerate" onClick={onRegenerate}>
              <RefreshCw className="size-3.5" />
            </IconBtn>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
