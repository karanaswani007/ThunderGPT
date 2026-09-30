import { env } from "@/lib/env.server";
import { xaiModelMap } from "../model-config";
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

const XAI_ROOT = "https://api.x.ai/v1";

function key(): string {
  const k = env("XAI_API_KEY");
  if (!k) throw new ThunderError("xAI is not configured.", { category: "config" });
  return k;
}

type OpenAIPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function toUserContent(
  content: string,
  attachments: ChatAttachment[] | undefined,
): string | OpenAIPart[] {
  const parts: OpenAIPart[] = [];
  let text = content;
  for (const att of attachments ?? []) {
    if (att.extractedText) {
      text += `\n\n[Attached ${att.filename}]\n${att.extractedText.slice(0, 80_000)}`;
    }
    if (att.dataBase64 && att.kind === "image") {
      parts.push({
        type: "image_url",
        image_url: { url: `data:${att.mimeType};base64,${att.dataBase64}` },
      });
    }
  }
  if (parts.length === 0) return text;
  return [{ type: "text", text }, ...parts];
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
      const chunks = buffer.split("\n");
      buffer = chunks.pop() ?? "";
      for (const raw of chunks) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          yield JSON.parse(data) as Record<string, unknown>;
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const xaiProvider: AIProvider = {
  id: "xai",
  label: "xAI Grok",
  isAvailable() {
    return Boolean(env("XAI_API_KEY"));
  },
  resolveModel(logical: Exclude<LogicalModelId, "auto">) {
    return xaiModelMap()[logical];
  },
  async *streamText(input: GenerateTextInput): AsyncGenerator<StreamEvent> {
    const apiKey = key();
    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: input.system },
    ];
    for (const m of input.messages) {
      messages.push({
        role: m.role,
        content: toUserContent(m.content, m.attachments),
      });
    }
    const body: Record<string, unknown> = {
      model: input.modelId,
      messages,
      stream: true,
      max_tokens: input.maxTokens ?? 4096,
      temperature: 0.7,
    };
    if (input.webSearch) {
      body.search_parameters = {
        mode: "on",
        return_citations: true,
      };
    }
    const res = await fetch(`${XAI_ROOT}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: input.abortSignal,
    });
    if (!res.ok) {
      const info = categorizeProviderStatus(res.status);
      throw new ThunderError(info.message, info);
    }
    if (!res.body) throw new ThunderError("Empty response from xAI.");
    const seen = new Set<string>();
    for await (const payload of parseSse(res.body, input.abortSignal)) {
      const choices = payload.choices as
        | Array<{ delta?: { content?: string } }>
        | undefined;
      const text = choices?.[0]?.delta?.content;
      if (text) yield { type: "delta", text };
      const citations = payload.citations as string[] | undefined;
      if (citations?.length) {
        const sources = citations
          .filter((url) => !seen.has(url))
          .map((url) => {
            seen.add(url);
            try {
              return { title: new URL(url).hostname, url };
            } catch {
              return { title: url, url };
            }
          });
        if (sources.length) yield { type: "sources", sources };
      }
    }
  },
  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    const apiKey = key();
    const model = xaiModelMap().image;
    if (input.referenceImageBase64) {
      const form = new FormData();
      form.set("model", model);
      form.set("prompt", input.prompt);
      const bin = Uint8Array.from(atob(input.referenceImageBase64), (c) =>
        c.charCodeAt(0),
      );
      form.set(
        "image",
        new Blob([bin], { type: input.referenceMimeType ?? "image/png" }),
        "reference.png",
      );
      const res = await fetch(`${XAI_ROOT}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: input.abortSignal,
      });
      if (!res.ok) {
        const info = categorizeProviderStatus(res.status);
        throw new ThunderError(info.message, info);
      }
      const json = (await res.json()) as {
        data?: Array<{ b64_json?: string; url?: string }>;
      };
      return await materializeImage(json.data?.[0], model);
    }
    const res = await fetch(`${XAI_ROOT}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        n: 1,
        response_format: "b64_json",
      }),
      signal: input.abortSignal,
    });
    if (!res.ok) {
      const info = categorizeProviderStatus(res.status);
      throw new ThunderError(info.message, info);
    }
    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    return await materializeImage(json.data?.[0], model);
  },
};

async function materializeImage(
  item: { b64_json?: string; url?: string } | undefined,
  model: string,
): Promise<GenerateImageResult> {
  if (item?.b64_json) {
    return { mimeType: "image/png", dataBase64: item.b64_json, model };
  }
  if (item?.url) {
    const img = await fetch(item.url);
    if (!img.ok) {
      throw new ThunderError("ThunderGPT could not download the generated image.", {
        category: "image",
      });
    }
    const buf = new Uint8Array(await img.arrayBuffer());
    let binary = "";
    for (const b of buf) binary += String.fromCharCode(b);
    return { mimeType: "image/png", dataBase64: btoa(binary), model };
  }
  throw new ThunderError("ThunderGPT could not generate that image. Try another prompt.", {
    category: "image",
  });
}
