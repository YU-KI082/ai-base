import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { truncate } from "../components/tool-card";
import { withLocale, resolvePublicLocale } from "./site";

describe("tools list helpers", () => {
  it("resolves locale", () => {
    assert.equal(resolvePublicLocale("ja"), "ja");
    assert.equal(resolvePublicLocale("en"), "en");
    assert.equal(resolvePublicLocale(undefined), "en");
  });

  it("builds locale-aware tool URLs", () => {
    assert.equal(withLocale("/tools", "en"), "/tools");
    assert.equal(withLocale("/tools", "ja"), "/tools?locale=ja");
    assert.equal(
      withLocale("/tools?category=text", "ja"),
      "/tools?category=text&locale=ja",
    );
  });

  it("truncates long descriptions", () => {
    assert.equal(truncate("short", 10), "short");
    assert.equal(truncate("abcdefghijklmnop", 8), "abcdefgh…");
  });
});
