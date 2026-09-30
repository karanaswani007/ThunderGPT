function parseFrame(frame: string): Record<string, unknown> | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!data || data === "[DONE]") return null;
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function* parseSseJson(
  body: ReadableStream<Uint8Array>,
  abortSignal?: AbortSignal,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (!abortSignal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const payload = parseFrame(frame);
        if (payload) yield payload;
      }
    }
    buffer += decoder.decode();
    const finalPayload = parseFrame(buffer);
    if (finalPayload) yield finalPayload;
  } finally {
    reader.releaseLock();
  }
}