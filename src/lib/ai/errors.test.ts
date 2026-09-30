import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ThunderError, categorizeProviderStatus, toUserError } from "./errors.ts";

describe("error handling", () => {
  it("does not leak raw internals", () => {
    assert.equal(toUserError(new Error("ECONNRESET secret")), "ThunderGPT is temporarily unavailable. Please try again.");
  });

  it("maps rate limits as retryable", () => {
    const r = categorizeProviderStatus(429);
    assert.equal(r.retryable, true);
    assert.equal(r.category, "rate_limit");
  });

  it("maps 400 as non-retryable", () => {
    const r = categorizeProviderStatus(400);
    assert.equal(r.retryable, false);
  });

  it("preserves ThunderError messages", () => {
    const err = new ThunderError("Type a message or attach a file to send.", {
      status: 400,
      category: "validation",
    });
    assert.equal(toUserError(err), "Type a message or attach a file to send.");
  });
});
