import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { faqPageJsonLd, softwareApplicationJsonLd } from "./seo";

describe("seo helpers", () => {
  it("builds SoftwareApplication json-ld", () => {
    const ld = softwareApplicationJsonLd({
      name: "ChatGPT",
      description: "Assistant",
      url: "https://example.com/tools/chatgpt",
    });
    assert.equal(ld["@type"], "SoftwareApplication");
    assert.equal(ld.name, "ChatGPT");
  });

  it("returns null FAQPage when empty", () => {
    assert.equal(faqPageJsonLd([]), null);
  });

  it("builds FAQPage json-ld", () => {
    const ld = faqPageJsonLd([{ question: "Q?", answer: "A." }]);
    assert.ok(ld);
    assert.equal(ld["@type"], "FAQPage");
    assert.equal((ld.mainEntity as unknown[]).length, 1);
  });
});
