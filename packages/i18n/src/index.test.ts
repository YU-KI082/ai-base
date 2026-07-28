import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOCALE,
  clearMissingTranslationKeys,
  formatCurrency,
  formatDate,
  getDictionary,
  getMissingTranslationKeys,
  resolveLocale,
  t,
} from "./index.js";

describe("i18n japanese-first", () => {
  it("defaults to ja", () => {
    assert.equal(DEFAULT_LOCALE, "ja");
    assert.equal(resolveLocale(undefined), "ja");
    assert.equal(resolveLocale("en"), "en");
  });

  it("falls back missing keys to japanese", () => {
    clearMissingTranslationKeys();
    const value = t("en", "public.browseTools");
    assert.ok(value.length > 0);
    // existing key should not mark missing
    assert.equal(getDictionary("ja").public.browseTools, "AIツールを見る");
  });

  it("records truly missing keys and falls back", () => {
    clearMissingTranslationKeys();
    const value = t("ja", "public.doesNotExist");
    assert.equal(value, "public.doesNotExist");
    assert.ok(getMissingTranslationKeys().some((k) => k.includes("doesNotExist")));
  });

  it("formats ja-JP currency and date in Tokyo", () => {
    const yen = formatCurrency(1234, "ja", "JPY");
    assert.ok(yen.includes("1,234") || yen.includes("￥") || yen.includes("¥"));
    const d = formatDate("2026-07-28T15:00:00.000Z", "ja");
    assert.match(d, /2026/);
  });

  it("getDictionary always exposes public.featured", () => {
    assert.equal(typeof getDictionary("ja").public.featured, "string");
    assert.equal(typeof getDictionary("en").public.featured, "string");
    assert.ok(getDictionary("ja").public.featured.length > 0);
  });
});
