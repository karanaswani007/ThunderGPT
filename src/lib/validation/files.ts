import { kindsFromMime } from "../ai/select-model.ts";
import type { AttachmentKind } from "../ai/types.ts";

export const MAX_FILE_BYTES: Record<AttachmentKind, number> = {
  image: 8 * 1024 * 1024,
  pdf: 10 * 1024 * 1024,
  text: 2 * 1024 * 1024,
  spreadsheet: 4 * 1024 * 1024,
  document: 8 * 1024 * 1024,
  generated: 12 * 1024 * 1024,
};

export const MAX_ATTACHMENTS = 4;

const MAGIC: Array<{ bytes: number[]; mime: string; offset?: number }> = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], mime: "application/zip" },
];

const ALLOWED_EXT: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt", "md", "log"],
  "text/csv": ["csv"],
  "text/markdown": ["md", "markdown"],
  "application/json": ["json"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "application/msword": ["doc"],
};

export type IncomingFile = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
};

export type FileValidationOk = IncomingFile & {
  kind: AttachmentKind;
  sniffMime: string;
};

export function sniffMime(base64: string, fallback: string): string {
  try {
    const head = base64.slice(0, 48);
    const bin = atob(head);
    const bytes = Array.from(bin, (c) => c.charCodeAt(0));
    for (const m of MAGIC) {
      const off = m.offset ?? 0;
      if (m.bytes.every((b, i) => bytes[off + i] === b)) {
        if (m.mime === "image/webp" && !bin.includes("WEBP")) continue;
        if (m.mime === "application/zip") return fallback || m.mime;
        return m.mime;
      }
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export function validateIncomingFile(
  file: IncomingFile,
): { ok: true; file: FileValidationOk } | { ok: false; error: string } {
  if (!file.filename || file.filename.length > 180) {
    return { ok: false, error: "That filename is not allowed." };
  }
  if (file.filename.includes("..") || file.filename.includes("/") || file.filename.includes("\\")) {
    return { ok: false, error: "That filename is not allowed." };
  }
  if (!file.dataBase64 || file.dataBase64.length < 8) {
    return { ok: false, error: "The file appears to be empty." };
  }
  const sniff = sniffMime(file.dataBase64, file.mimeType);
  const kind = kindsFromMime(sniff);
  const ext = extOf(file.filename);
  const allowed = ALLOWED_EXT[sniff];
  const zipDoc =
    sniff === "application/zip" && (ext === "docx" || file.mimeType.includes("word"));
  const textOk =
    kind === "text" ||
    kind === "spreadsheet" ||
    sniff.startsWith("text/") ||
    sniff === "application/json";
  if (!zipDoc && allowed && ext && !allowed.includes(ext) && !textOk) {
    return { ok: false, error: `“${file.filename}” does not match its file type.` };
  }
  if (!zipDoc && !allowed && !textOk && kind !== "document") {
    return {
      ok: false,
      error: "Unsupported file. Use images, PDF, TXT, CSV, MD, or DOCX.",
    };
  }
  const resolvedKind: AttachmentKind = zipDoc ? "document" : kind;
  const max = MAX_FILE_BYTES[resolvedKind];
  if (file.sizeBytes > max) {
    return {
      ok: false,
      error: `“${file.filename}” is too large. Max ${Math.round(max / 1024 / 1024)} MB.`,
    };
  }
  const approxBytes = Math.floor((file.dataBase64.length * 3) / 4);
  if (approxBytes > max * 1.2) {
    return { ok: false, error: `“${file.filename}” is too large.` };
  }
  return {
    ok: true,
    file: {
      ...file,
      mimeType: zipDoc
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : sniff || file.mimeType,
      kind: resolvedKind,
      sniffMime: sniff,
    },
  };
}

export function validateAttachmentList(
  files: IncomingFile[],
): { ok: true; files: FileValidationOk[] } | { ok: false; error: string } {
  if (files.length > MAX_ATTACHMENTS) {
    return { ok: false, error: `You can attach up to ${MAX_ATTACHMENTS} files.` };
  }
  const out: FileValidationOk[] = [];
  for (const f of files) {
    const r = validateIncomingFile(f);
    if (!r.ok) return r;
    out.push(r.file);
  }
  return { ok: true, files: out };
}
