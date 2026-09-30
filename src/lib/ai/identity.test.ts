import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSystemPrompt, identityAnswer } from "./identity.ts";

describe("product identity", () => {
  it("answers who developed ThunderGPT", () => {
    const a = identityAnswer("Who developed you?");
    assert.ok(a);
    assert.match(a, /HK SoftTech/);
    assert.doesNotMatch(a, /Google created ThunderGPT/);
  });

  it("does not hijack unrelated questions", () => {
    assert.equal(identityAnswer("What is 2+2?"), null);
    assert.equal(identityAnswer("Write a rust function"), null);
  });

  it("keeps ownership and engine distinct in the system prompt", () => {
    const prompt = buildSystemPrompt({
      engineLabel: "Google Gemini",
      engineVendor: "Google",
    });
    assert.match(prompt, /HK SoftTech/);
    assert.match(prompt, /Google Gemini/);
    assert.match(prompt, /Do not claim that HK SoftTech created Google/);
  });
});
