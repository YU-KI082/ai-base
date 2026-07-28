import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AgentConfigBodySchema,
  DraftDecisionBodySchema,
} from "./api-schemas";

describe("api body schemas", () => {
  it("accepts draft decision comments", () => {
    assert.deepEqual(DraftDecisionBodySchema.parse({ comment: "ok" }), {
      comment: "ok",
    });
  });

  it("rejects secret keys in agent config", () => {
    assert.throws(() =>
      AgentConfigBodySchema.parse({
        config: { openai_api_key: "sk-test" },
      }),
    );
  });
});
