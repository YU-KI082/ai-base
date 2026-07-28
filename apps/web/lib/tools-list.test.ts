import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { truncate } from "../components/tool-card";
import { withLocale, resolvePublicLocale } from "./site";

describe("tools list helpers", () => {
  it("resolves locale japanese-first", () => {
    assert.equal(resolvePublicLocale("ja"), "ja");
    assert.equal(resolvePublicLocale("en"), "en");
    assert.equal(resolvePublicLocale(undefined), "ja");
  });

  it("builds locale-aware tool URLs", () => {
    assert.equal(withLocale("/tools", "ja"), "/tools");
    assert.equal(withLocale("/tools", "en"), "/tools?locale=en");
    assert.equal(
      withLocale("/tools?category=text", "en"),
      "/tools?category=text&locale=en",
    );
  });

  it("truncates long descriptions", () => {
    assert.equal(truncate("short", 10), "short");
    assert.equal(truncate("abcdefghijklmnop", 8), "abcdefgh…");
  });
});
