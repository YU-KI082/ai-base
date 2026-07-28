import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MemoryCacheStore, cachedJson } from "./index.js";

describe("cache", () => {
  it("stores and returns values with TTL semantics", async () => {
    const store = new MemoryCacheStore();
    await store.set("a", "1", 60);
    assert.equal(await store.get("a"), "1");
    await store.del("a");
    assert.equal(await store.get("a"), null);
  });

  it("cachedJson loads once per miss", async () => {
    const store = new MemoryCacheStore();
    let loads = 0;
    const a = await cachedJson(
      "k",
      60,
      async () => {
        loads += 1;
        return { ok: true };
      },
      store,
    );
    const b = await cachedJson(
      "k",
      60,
      async () => {
        loads += 1;
        return { ok: false };
      },
      store,
    );
    assert.deepEqual(a, { ok: true });
    assert.deepEqual(b, { ok: true });
    assert.equal(loads, 1);
  });
});
