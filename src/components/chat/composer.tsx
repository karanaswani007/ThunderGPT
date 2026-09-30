import { useRef, useState } from "react";
import {
  Globe,
  Image as ImageIcon,
  Paperclip,
  Square,
  ArrowUp,
  X,
} from "lucide-react";
import { ModelSelector } from "./model-selector";
import type { LogicalModelId } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { MAX_ATTACHMENTS } from "@/lib/validation/files";

export type PendingFile = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
  previewUrl?: string;
};

export function Composer({
  model,
  onModel,
  webSearch,
  onWebSearch,
  imageMode,
  onImageMode,
  disabled,
  streaming,
  onStop,
  onSend,
  initialValue,
}: {
  model: LogicalModelId;
  onModel: (id: LogicalModelId) => void;
  webSearch: boolean;
  onWebSearch: (v: boolean) => void;
  imageMode: boolean;
  onImageMode: (v: boolean) => void;
  disabled?: boolean;
  streaming?: boolean;
  onStop: () => void;
  onSend: (text: string, files: PendingFile[]) => void;
  initialValue?: string;
}) {
  const [text, setText] = useState(initialValue ?? "");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, files);
    setText("");
    setFiles([]);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {files.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={`${f.filename}-${i}`}
              className="relative overflow-hidden rounded-xl border border-border bg-card"
            >
              {f.previewUrl ? (
                <img src={f.previewUrl} alt="" className="h-16 w-16 object-cover" />
              ) : (
                <div className="flex h-16 max-w-[160px] items-center px-3 text-xs">{f.filename}</div>
              )}
              <button
                type="button"
                aria-label={`Remove ${f.filename}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/80"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="rounded-2xl border border-border bg-card p-2 shadow-[0_8px_30px_color-mix(in_oklab,black_8%,transparent)]">
        <TextareaGrow
          refEl={areaRef}
          value={text}
          placeholder={
            imageMode
              ? "Describe the image to generate…"
              : "Message ThunderGPT"
          }
          onChange={setText}
          onSubmit={send}
          disabled={disabled}
        />
        <div className="flex items-center gap-1 pt-1">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,text/markdown,.md,.txt,.csv,.docx,.doc,.json"
            onChange={async (e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              const room = MAX_ATTACHMENTS - files.length;
              const next: PendingFile[] = [];
              for (const file of picked.slice(0, room)) {
                const dataBase64 = await readBase64(file);
                next.push({
                  filename: file.name,
                  mimeType: file.type || "application/octet-stream",
                  sizeBytes: file.size,
                  dataBase64,
                  previewUrl: file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : undefined,
                });
              }
              setFiles((prev) => [...prev, ...next]);
            }}
          />
          <Tool
            label="Attach file"
            active={false}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="size-4" />
          </Tool>
          <Tool
            label="Web search"
            active={webSearch}
            onClick={() => onWebSearch(!webSearch)}
          >
            <Globe className="size-4" />
          </Tool>
          <Tool
            label="Image generation"
            active={imageMode}
            onClick={() => onImageMode(!imageMode)}
          >
            <ImageIcon className="size-4" />
          </Tool>
          <div className="ml-auto flex items-center gap-2">
            <ModelSelector value={model} onChange={onModel} />
            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                className="grid size-10 place-items-center rounded-full bg-foreground text-background"
                aria-label="Stop generating"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={disabled || (!text.trim() && files.length === 0)}
                className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        ThunderGPT can make mistakes. Verify important information.
      </p>
    </div>
  );
}

function Tool({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-muted text-primary",
      )}
    >
      {children}
    </button>
  );
}

function TextareaGrow({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  refEl,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled?: boolean;
  refEl: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <textarea
      ref={refEl}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      onChange={(e) => {
        onChange(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
      className="max-h-[200px] min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
    />
  );
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
