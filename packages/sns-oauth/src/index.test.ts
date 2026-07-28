import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONNECTION_STATUS_LABEL_JA,
  connectionStatusLabel,
  isOAuthProvider,
  oauthProviderForPlatform,
} from "./types.js";

describe("sns-oauth types", () => {
  it("maps platforms to oauth providers", () => {
    assert.equal(oauthProviderForPlatform("instagram"), "instagram");
    assert.equal(oauthProviderForPlatform("tiktok"), "tiktok");
    assert.equal(oauthProviderForPlatform("x"), null);
  });

  it("labels statuses in japanese", () => {
    assert.equal(connectionStatusLabel("connected", "ja"), "連携済み");
    assert.equal(connectionStatusLabel("auto_refreshing", "ja"), "自動更新中");
    assert.equal(connectionStatusLabel("reauth_required", "ja"), "再認証必要");
    assert.equal(CONNECTION_STATUS_LABEL_JA.disconnected, "未連携");
  });

  it("validates provider keys", () => {
    assert.equal(isOAuthProvider("instagram"), true);
    assert.equal(isOAuthProvider("facebook"), false);
  });
});
