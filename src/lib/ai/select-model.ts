import type { AttachmentKind, LogicalModelId } from "./types";

export type TaskHints = {
  preferred: LogicalModelId;
  imageMode?: boolean;
  hasImages?: boolean;
  hasDocuments?: boolean;
  documentChars?: number;
  userText?: string;
};

const REASONING_RE =
  /\b(prove|derive|debug|refactor|algorithm|complexity|step by step|reason|architecture|optimize|typescript|python|sql|regex|proof|theorem|analyse|analyze)\b/i;

const CODE_RE =
  /\b(code|function|component|bug|stack trace|implement|api|typescript|javascript|python|rust|sql)\b/i;

const IMAGE_GEN_RE =
  /\b(generate an image|create an image|draw|render an image|make a picture|image of)\b/i;

export function selectLogicalModel(hints: TaskHints): Exclude<LogicalModelId, "auto"> {
  if (hints.preferred !== "auto") return hints.preferred;
  if (hints.imageMode || IMAGE_GEN_RE.test(hints.userText ?? "")) return "image";
  if (hints.hasImages) return "vision";
  const text = hints.userText ?? "";
  const longDoc = (hints.documentChars ?? 0) > 12_000;
  if (longDoc) return "reasoning";
  if (REASONING_RE.test(text) || CODE_RE.test(text)) return "reasoning";
  if (hints.hasDocuments) return "general";
  if (text.length > 1_200) return "general";
  return "fast";
}

export function kindsFromMime(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/csv" || mime.endsWith("csv")) return "spreadsheet";
  if (
    mime.includes("word") ||
    mime.includes("officedocument.wordprocessingml") ||
    mime.endsWith("document")
  ) {
    return "document";
  }
  return "text";
}
