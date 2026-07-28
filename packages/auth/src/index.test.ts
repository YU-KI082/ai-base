import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createCsrfToken,
  verifyCsrf,
  readCookie,
} from "./csrf.js";
import { MemoryRateLimiter } from "./rate-limit.js";
import { hasPermission } from "./rbac.js";
import {
  isAdminDevBypassEnabled,
  isProductionRuntime,
} from "./env.js";

describe("csrf", () => {
  it("accepts matching double-submit tokens", () => {
    const token = createCsrfToken();
    assert.equal(
      verifyCsrf({ cookieToken: token, headerToken: token }),
      true,
    );
  });

  it("rejects mismatched or missing tokens", () => {
    const token = createCsrfToken();
    assert.equal(
      verifyCsrf({ cookieToken: token, headerToken: createCsrfToken() }),
      false,
    );
    assert.equal(verifyCsrf({ cookieToken: token, headerToken: null }), false);
  });

  it("parses cookies", () => {
    const req = new Request("http://localhost/x", {
      headers: { cookie: "a=1; aibase_csrf=abc123; b=2" },
    });
    assert.equal(readCookie(req, "aibase_csrf"), "abc123");
  });
});

describe("rate limit", () => {
  it("blocks after max requests in window", () => {
    const limiter = new MemoryRateLimiter({ windowMs: 60_000, max: 2 });
    assert.equal(limiter.check("k").allowed, true);
    assert.equal(limiter.check("k").allowed, true);
    assert.equal(limiter.check("k").allowed, false);
  });
});

describe("rbac", () => {
  it("requires exact permission", () => {
    const user = {
      id: "1",
      email: "a@b.c",
      name: null,
      permissions: ["admin.access"],
    };
    assert.equal(hasPermission(user, "admin.access"), true);
    assert.equal(hasPermission(user, "drafts.approve"), false);
  });
});

describe("env gates", () => {
  it("never enables bypass when NODE_ENV=production", () => {
    const prevNode = process.env.NODE_ENV;
    const prevBypass = process.env.ADMIN_DEV_BYPASS;
    process.env.NODE_ENV = "production";
    process.env.ADMIN_DEV_BYPASS = "true";
    assert.equal(isProductionRuntime(), true);
    assert.equal(isAdminDevBypassEnabled(), false);
    process.env.NODE_ENV = prevNode;
    process.env.ADMIN_DEV_BYPASS = prevBypass;
  });
});
