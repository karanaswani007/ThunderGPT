import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChatRequest } from "./chat.ts";

describe("chat request validation", () => {
  it("accepts a normal message", () => {
    const r = parseChatRequest({ message: "Hello", model: "auto" });
    assert.equal(r.ok, true);
  });

  it("rejects unknown models", () => {
    const r = parseChatRequest({ message: "Hello", model: "gpt-99" });
    assert.equal(r.ok, false);
  });

  it("rejects empty payloads", () => {
    const r = parseChatRequest({ message: "   ", model: "fast" });
    assert.equal(r.ok, false);
  });

  it("requires a prompt in image mode", () => {
    const r = parseChatRequest({ message: "", model: "image", imageMode: true });
    assert.equal(r.ok, false);
  });
});
