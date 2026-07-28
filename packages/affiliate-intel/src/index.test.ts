import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computePerformance,
  deriveOverallStatus,
  hasAffiliateLabel,
  proposeAspInvestigations,
  STATUS_LABEL_JA,
} from "./index.js";

describe("affiliate-intel", () => {
  it("proposes five ASP investigation targets", () => {
    const proposals = proposeAspInvestigations();
    assert.equal(proposals.length, 5);
    assert.deepEqual(
      proposals.map((p) => p.aspKey),
      ["official", "a8", "moshimo", "accesstrade", "valuecommerce"],
    );
    assert.ok(proposals.every((p) => p.status === "uninvestigated"));
  });

  it("derives overall status preferring partnered", () => {
    assert.equal(
      deriveOverallStatus(["uninvestigated", "partnered", "applying"]),
      "partnered",
    );
    assert.equal(
      deriveOverallStatus(["unavailable", "unavailable"]),
      "unavailable",
    );
  });

  it("computes CVR and EPC without inventing when clicks=0", () => {
    assert.deepEqual(computePerformance({ clicks: 0, conversions: 0, revenue: 0 }), {
      clicks: 0,
      conversions: 0,
      sales: 0,
      rewardAmount: 0,
      cvr: null,
      epc: null,
    });
    const m = computePerformance({ clicks: 100, conversions: 4, revenue: 40 });
    assert.equal(m.cvr, 0.04);
    assert.equal(m.epc, 0.4);
  });

  it("labels unknown affiliate as 未確認", () => {
    assert.equal(hasAffiliateLabel(null), "未確認");
    assert.equal(STATUS_LABEL_JA.investigating, "調査中");
  });
});
