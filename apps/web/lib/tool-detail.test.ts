import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  asStringList,
  normalizeFaq,
  pickTranslation,
  primaryAffiliate,
} from "./tool-detail";

describe("tool detail helpers", () => {
  it("picks locale translation with fallback", () => {
    const rows = [
      { locale: "en", name: "EN" },
      { locale: "ja", name: "JA" },
    ];
    assert.equal(pickTranslation(rows, "ja")?.name, "JA");
    assert.equal(pickTranslation(rows, "fr")?.name, "EN");
  });

  it("selects highest priority healthy affiliate", () => {
    const links = [
      { isHealthy: true, priority: 1, id: "a" },
      { isHealthy: false, priority: 99, id: "b" },
      { isHealthy: true, priority: 10, id: "c" },
    ];
    assert.equal(primaryAffiliate(links)?.id, "c");
  });

  it("normalizes faq shapes", () => {
    assert.deepEqual(
      normalizeFaq([{ q: "Q?", a: "A" }, { question: "Q2", answer: "A2" }, {}]),
      [
        { question: "Q?", answer: "A" },
        { question: "Q2", answer: "A2" },
      ],
    );
  });

  it("coerces feature lists", () => {
    assert.deepEqual(asStringList(["a", 1, ""]), ["a", "1"]);
  });
});
