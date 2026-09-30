import { env } from "@/lib/env.server";
import { geminiModelMap } from "../model-config";
import { ThunderError, categorizeProviderStatus } from "../errors";
import type {
  AIProvider,
  ChatAttachment,
  GenerateImageInput,
  GenerateImageResult,
  GenerateTextInput,
  LogicalModelId,
  StreamEvent,
} from "../types";

const GEMINI_ROOT = "https://generativelanguage.googleapis.com/v1beta";

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

function key(): string {
  const k = env("GEMINI_API_KEY");
  if (!k) throw new ThunderError("Gemini is not configured.", { category: "config" });
  return k;
}

function toParts(
  content: string,
  attachments: ChatAttachment[] | undefined,
): GeminiPart[] {
  const parts: GeminiPart[] = [];
  if (content.trim()) parts.push({ text: content });
  for (const att of attachments ?? []) {
    if (att.extractedText) {
      parts.push({
        text: `\n\n[Attached ${att.filename}]\n${att.extractedText.slice(0, 80_000)}`,
      });
    }
    if (att.dataBase64 && (att.kind === "image" || att.kind === "pdf")) {
      parts.push({
        inline_data: { mime_type: att.mimeType, data: att.dataBase64 },
      });
    }
  }
  if (parts.length === 0) parts.push({ text: content || " " });
  return parts;
}

async function* parseSse(
  body: ReadableStream<Uint8Array>,
  abortSignal?: AbortSignal,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (abortSignal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("");
        if (!line || line === "[DONE]") continue;
        try {
          yield JSON.parse(line) as Record<string, unknown>;
        } catch {
          /* ignore malformed */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function extractText(payload: Record<string, unknown>): string {
  const candidates = payload.candidates as
    | Array<{ content?: { parts?: Array<{ text?: string }> } }>
    | undefined;
  const parts = candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

function extractSources(payload: Record<string, unknown>): StreamEvent | null {
  const gm = payload.candidates as
    | Array<{
        groundingMetadata?: {
          groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        };
      }>
    | undefined;
  const chunks = gm?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .map((c) => ({
      title: c.web?.title ?? "Source",
      url: c.web?.uri ?? "",
    }))
    .filter((s) => s.url);
  if (!sources.length) return null;
  return { type: "sources", sources };
}

export const geminiProvider: AIProvider = {
  id: "gemini",
  label: "Google Gemini",
  isAvailable() {
    return Boolean(env("GEMINI_API_KEY"));
  },
  resolveModel(logical: Exclude<LogicalModelId, "auto">) {
    return geminiModelMap()[logical];
  },
  async *streamText(input: GenerateTextInput): AsyncGenerator<StreamEvent> {
    const apiKey = key();
    const url = `${GEMINI_ROOT}/models/${encodeURIComponent(input.modelId)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    const contents = input.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: toParts(m.content, m.attachments),
    }));
    const body: Record<string, unknown> = {
      system_instruction: { parts: [{ text: input.system }] },
      contents,
      generationConfig: {
        maxOutputTokens: input.maxTokens ?? 4096,
        temperature: 0.7,
      },
    };
    if (input.webSearch) {
      body.tools = [{ google_search: {} }];
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: input.abortSignal,
    });
    if (!res.ok) {
      const info = categorizeProviderStatus(res.status);
      throw new ThunderError(info.message, info);
    }
    if (!res.body) throw new ThunderError("Empty response from Gemini.");
    let lastSources: StreamEvent | null = null;
    for await (const payload of parseSse(res.body, input.abortSignal)) {
      const text = extractText(payload);
      if (text) yield { type: "delta", text };
      const sources = extractSources(payload);
      if (sources) lastSources = sources;
    }
    if (lastSources) yield lastSources;
  },
  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    const apiKey = key();
    const model = geminiModelMap().image;
    const url = `${GEMINI_ROOT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const parts: GeminiPart[] = [{ text: input.prompt }];
    if (input.referenceImageBase64) {
      parts.unshift({
        inline_data: {
          mime_type: input.referenceMimeType ?? "image/png",
          data: input.referenceImageBase64,
        },
      });
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: input.aspectRatio
            ? { aspectRatio: input.aspectRatio }
            : undefined,
        },
      }),
      signal: input.abortSignal,
    });
    if (!res.ok) {
      const info = categorizeProviderStatus(res.status);
      throw new ThunderError(info.message, info);
    }
    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
        };
      }>;
    };
    const inline = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
      ?.inlineData;
    if (!inline?.data) {
      throw new ThunderError("ThunderGPT could not generate that image. Try another prompt.", {
        category: "image",
      });
    }
    return {
      mimeType: inline.mimeType ?? "image/png",
      dataBase64: inline.data,
      model,
    };
  },
};
