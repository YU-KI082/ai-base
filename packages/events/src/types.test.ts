import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { InMemoryEventBus, EventTypes, createEvent, enqueueEvent } from "../src/index.js";

describe("event contracts", () => {
  it("exports stable pipeline event names", () => {
    assert.equal(EventTypes.IngestManualRequested, "ingest.manual.requested.v1");
    assert.equal(EventTypes.ContentApproved, "content.approved.v1");
    assert.equal(EventTypes.ContentPublished, "content.published.v1");
  });

  it("fan-out delivers to multiple subscribers", async () => {
    const bus = new InMemoryEventBus();
    const hits: string[] = [];
    await bus.subscribe(
      { group: "a", consumer: "1", topics: [EventTypes.ContentDraftGenerated] },
      async () => {
        hits.push("a");
      },
    );
    await bus.subscribe(
      { group: "b", consumer: "1", topics: [EventTypes.ContentDraftGenerated] },
      async () => {
        hits.push("b");
      },
    );
    await bus.publish(
      createEvent({
        type: EventTypes.ContentDraftGenerated,
        source: "test",
        dataschema: "test",
        correlationid: "c1",
        data: {
          draftId: "d1",
          workflowId: "w1",
          candidateId: "c1",
          slug: "x",
          locales: ["en", "ja"],
        },
      }),
    );
    assert.deepEqual(hits.sort(), ["a", "b"]);
  });
});
