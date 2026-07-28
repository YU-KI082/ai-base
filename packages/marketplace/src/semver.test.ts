import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { satisfiesVersion, parseSemVer } from "./semver.js";
import { localeText, toDisplayName } from "./manifest.js";

describe("marketplace semver", () => {
  it("parses versions", () => {
    assert.deepEqual(parseSemVer("1.2.3"), {
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  it("satisfies ranges", () => {
    assert.equal(satisfiesVersion("1.2.3", "*"), true);
    assert.equal(satisfiesVersion("1.2.3", "^1.0.0"), true);
    assert.equal(satisfiesVersion("2.0.0", "^1.0.0"), false);
    assert.equal(satisfiesVersion("1.2.5", "~1.2.0"), true);
    assert.equal(satisfiesVersion("1.3.0", "~1.2.0"), false);
    assert.equal(satisfiesVersion("1.2.3", ">=1.2.0"), true);
    assert.equal(satisfiesVersion("1.2.3", "1.2.3"), true);
  });
});

describe("manifest helpers", () => {
  it("resolves locale text and display names", () => {
    assert.equal(localeText({ en: "Scout", ja: "スカウト" }, "ja"), "スカウト");
    const display = toDisplayName({
      key: "scout",
      version: "0.1.0",
      name: { en: "Scout", ja: "スカウト" },
      subscribe: [],
      publish: [],
      capabilities: [],
    });
    assert.equal(display.en, "Scout");
    assert.equal(display.ja, "スカウト");
  });
});
