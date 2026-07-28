import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { sealSecret, openSecret } from "./seal-secrets.js";

describe("seal secrets", () => {
  const prev = process.env.TOKEN_ENCRYPTION_KEY;
  before(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-token-encryption-key-32chars!!";
  });
  after(() => {
    process.env.TOKEN_ENCRYPTION_KEY = prev;
  });

  it("round-trips plaintext", () => {
    const sealed = sealSecret("access-token-value");
    assert.match(sealed, /^v1\./);
    assert.equal(openSecret(sealed), "access-token-value");
  });

  it("fails on tamper", () => {
    const sealed = sealSecret("x");
    assert.throws(() => openSecret(sealed.slice(0, -2) + "ab"));
  });
});
