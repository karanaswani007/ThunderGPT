import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateIncomingFile, validateAttachmentList } from "./files.ts";

function pngBase64() {
  // 1x1 PNG
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
}

describe("file validation", () => {
  it("accepts a real PNG", () => {
    const r = validateIncomingFile({
      filename: "bolt.png",
      mimeType: "image/png",
      sizeBytes: 80,
      dataBase64: pngBase64(),
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.file.kind, "image");
  });

  it("rejects path traversal names", () => {
    const r = validateIncomingFile({
      filename: "../secret.png",
      mimeType: "image/png",
      sizeBytes: 80,
      dataBase64: pngBase64(),
    });
    assert.equal(r.ok, false);
  });

  it("rejects more than four attachments", () => {
    const file = {
      filename: "a.png",
      mimeType: "image/png",
      sizeBytes: 80,
      dataBase64: pngBase64(),
    };
    const r = validateAttachmentList([file, file, file, file, file]);
    assert.equal(r.ok, false);
  });

  it("rejects empty payloads", () => {
    const r = validateIncomingFile({
      filename: "a.txt",
      mimeType: "text/plain",
      sizeBytes: 1,
      dataBase64: "aa",
    });
    assert.equal(r.ok, false);
  });
});
