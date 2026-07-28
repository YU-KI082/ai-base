import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFingerprint } from "../src/repositories.js";

describe("fingerprint", () => {
  it("is stable for equivalent URLs", () => {
    const a = createFingerprint({
      homepageUrl: "https://Example.com/app/",
      sourceName: "manual",
      externalId: "1",
    });
    const b = createFingerprint({
      homepageUrl: "https://example.com/app",
      sourceName: "manual",
      externalId: "1",
    });
    assert.equal(a, b);
  });
});
