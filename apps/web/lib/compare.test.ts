import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { orderBySlug, parseCompareSlugs } from "./compare";

describe("compare helpers", () => {
  it("parses unique slugs up to max", () => {
    assert.deepEqual(parseCompareSlugs("a, b, a, c, d"), ["a", "b", "c"]);
    assert.deepEqual(parseCompareSlugs("  "), []);
  });

  it("orders tools by requested slug list", () => {
    const items = [{ slug: "b" }, { slug: "a" }];
    assert.deepEqual(orderBySlug(items, ["a", "b"]).map((t) => t.slug), [
      "a",
      "b",
    ]);
  });
});
