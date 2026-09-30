export type ClientEvent =
  | { type: "conversation"; id: string }
  | { type: "delta"; text: string }
  | { type: "sources"; sources: Array<{ title: string; url: string }> }
  | { type: "title"; title: string }
  | { type: "image"; id: string; mimeType: string }
  | { type: "done"; messageId: string; model: string; conversationId: string }
  | { type: "error"; message: string };

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export function encodeSse(event: ClientEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}
