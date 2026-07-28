import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { slugify, TOOL_INGEST_STEPS } from "../src/workflow.js";

describe("agents-sdk workflow", () => {
  it("keeps tool ingest step order stable", () => {
    assert.deepEqual(
      TOOL_INGEST_STEPS.map((s) => s.stepKey),
      [
        "scout",
        "reviewer",
        "writer",
        "designer",
        "translator",
        "seo",
        "approval",
        "publisher",
      ],
    );
  });

  it("slugifies tool names", () => {
    assert.equal(slugify("My Cool AI!"), "my-cool-ai");
  });
});
