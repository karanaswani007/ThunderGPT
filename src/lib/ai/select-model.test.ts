import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectLogicalModel } from "./select-model.ts";

describe("selectLogicalModel", () => {
  it("honors an explicit preference", () => {
    assert.equal(
      selectLogicalModel({ preferred: "vision", userText: "hello" }),
      "vision",
    );
  });

  it("picks vision when images are attached", () => {
    assert.equal(
      selectLogicalModel({ preferred: "auto", hasImages: true, userText: "what is this?" }),
      "vision",
    );
  });

  it("picks image mode from the toggle or prompt", () => {
    assert.equal(selectLogicalModel({ preferred: "auto", imageMode: true }), "image");
    assert.equal(
      selectLogicalModel({ preferred: "auto", userText: "generate an image of a canyon" }),
      "image",
    );
  });

  it("picks reasoning for code and long documents", () => {
    assert.equal(
      selectLogicalModel({ preferred: "auto", userText: "debug this typescript function" }),
      "reasoning",
    );
    assert.equal(
      selectLogicalModel({ preferred: "auto", documentChars: 20_000, userText: "summarize" }),
      "reasoning",
    );
  });

  it("defaults everyday chat to fast", () => {
    assert.equal(selectLogicalModel({ preferred: "auto", userText: "hello there" }), "fast");
  });
});
