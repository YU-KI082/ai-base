import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeError,
  canApplyPatches,
  fingerprintError,
} from "./policy.js";
import { proposeFix } from "./healers.js";
import { defaultSelfHealingSettings } from "./settings.js";

describe("self-healing", () => {
  it("defaults to emergency stop", () => {
    const s = defaultSelfHealingSettings();
    assert.equal(s.emergencyStop, true);
    assert.equal(s.maxAttemptsPerFingerprint, 3);
    assert.equal(s.allowProductionDirectApply, false);
  });

  it("classifies featured undefined as auto i18n heal", () => {
    const a = analyzeError({
      message: "Cannot read properties of undefined (reading 'featured')",
      location: "apps/web/app/(public)/tools/page.tsx",
    });
    assert.equal(a.requiresApproval, false);
    assert.equal(a.autoHealKind, "i18n_missing_key");
    assert.equal(a.propertyName, "featured");
  });

  it("blocks destructive DB and secrets", () => {
    assert.equal(
      analyzeError({ message: "Need to DROP TABLE users" }).requiresApproval,
      true,
    );
    assert.equal(
      analyzeError({ message: "Missing TOKEN_ENCRYPTION_KEY — please set secret" })
        .forbiddenKind,
      "secrets_env_change",
    );
  });

  it("stable fingerprints", () => {
    const a = fingerprintError({ message: "Error 12345 foo" });
    const b = fingerprintError({ message: "Error 99999 foo" });
    assert.equal(a, b);
  });

  it("forbids production direct apply", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const gate = canApplyPatches({
      emergencyStop: false,
      allowProductionDirectApply: false,
    });
    assert.equal(gate.ok, false);
    process.env.NODE_ENV = prev;
  });

  it("proposes featured fix without approval", () => {
    const analysis = analyzeError({
      message: "Cannot read properties of undefined (reading 'featured')",
    });
    const fix = proposeFix({
      message: "Cannot read properties of undefined (reading 'featured')",
      analysis,
      maxFiles: 5,
    });
    assert.equal(fix.autoAllowed, true);
  });
});
