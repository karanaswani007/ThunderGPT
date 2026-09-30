import { Buffer } from "node:buffer";
import type { AttachmentKind } from "@/lib/ai/types";
import type { FileValidationOk } from "@/lib/validation/files";

function decodeBase64(data: string): Uint8Array {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeText(data: string): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(decodeBase64(data));
}

async function extractPdf(data: string): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(decodeBase64(data));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.slice(0, 100_000);
}

async function extractDocx(data: string): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(decodeBase64(data)) });
  return (result.value ?? "").slice(0, 80_000);
}

export async function extractFileText(
  file: FileValidationOk,
): Promise<{ extractedText?: string; dataBase64?: string }> {
  const keepBinary = file.kind === "image" || file.kind === "pdf";
  try {
    if (file.kind === "pdf") {
      const extractedText = await extractPdf(file.dataBase64);
      return { extractedText, dataBase64: keepBinary ? file.dataBase64 : undefined };
    }
    if (file.kind === "document") {
      const extractedText = await extractDocx(file.dataBase64);
      return { extractedText };
    }
    if (file.kind === "text" || file.kind === "spreadsheet") {
      return { extractedText: decodeText(file.dataBase64).slice(0, 80_000) };
    }
    if (file.kind === "image") {
      return { dataBase64: file.dataBase64 };
    }
  } catch {
    if (keepBinary) return { dataBase64: file.dataBase64 };
    return {
      extractedText: `(Could not read ${file.filename}. The file was attached but text extraction failed.)`,
    };
  }
  return keepBinary ? { dataBase64: file.dataBase64 } : {};
}

export function attachmentKindLabel(kind: AttachmentKind): string {
  switch (kind) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "spreadsheet":
      return "CSV";
    case "document":
      return "Document";
    case "generated":
      return "Generated";
    default:
      return "File";
  }
}
