import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSseJson } from "./sse.ts";

function stream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>) {
  const events = [];
  for await (const event of parseSseJson(body)) events.push(event);
  return events;
}

test("parses LF-delimited JSON events", async () => {
  assert.deepEqual(await collect(stream(['data: {"text":"hello"}\n\n'])), [
    { text: "hello" },
  ]);
});

test("parses CRLF events when the delimiter spans chunks", async () => {
  assert.deepEqual(
    await collect(stream(['data: {"text":"hello"}\r', "\n\r", "\n"])),
    [{ text: "hello" }],
  );
});

test("parses a final event without a trailing blank line", async () => {
  assert.deepEqual(await collect(stream(['data: {"text":"hello"}'])), [
    { text: "hello" },
  ]);
});