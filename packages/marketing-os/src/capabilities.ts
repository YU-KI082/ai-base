/**
 * OS capability registry — single source of truth for what is actually wired.
 * UI must show「準備中」when a capability is not ready (no dummies).
 */

import { listConnectors } from "./connectors.js";

export class OsAiUnavailableError extends Error {
  readonly code = "AI_UNAVAILABLE" as const;
  readonly status = 503;

  constructor(message = "AI機能は準備中です。接続設定が完了すると利用できます。") {
    super(message);
    this.name = "OsAiUnavailableError";
  }
}

export type CapabilityState = {
  ready: boolean;
  provider: string | null;
  reason?: string;
};

export type OsCapabilities = {
  textLlm: CapabilityState;
  vision: CapabilityState;
  imageEdit: CapabilityState;
  /** Live SNS follower/save metrics from connected APIs */
  snsMetrics: CapabilityState;
  mediaStorage: CapabilityState & { backend: "database" | "blob" };
  /** Per-platform connector capabilities (V2: oauth/publish/insights false) */
  connectors: Array<{
    platform: string;
    oauth: boolean;
    publish: boolean;
    insights: boolean;
    status: "coming_soon" | "ready";
  }>;
};

function hasOpenAi() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
function hasAnthropic() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
function hasGemini() {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim(),
  );
}
function hasGrok() {
  return Boolean(
    process.env.GROK_API_KEY?.trim() || process.env.XAI_API_KEY?.trim(),
  );
}
function hasLocalLlm() {
  if (process.env.VERCEL === "1") return false;
  return Boolean(
    process.env.LOCAL_LLM_BASE_URL?.trim() ||
      process.env.OLLAMA_BASE_URL?.trim(),
  );
}
function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Preferred text LLM provider for OS (never mock). */
export function resolveTextLlmProviderId(): string | null {
  const requested = (process.env.LLM_PROVIDER ?? "").toLowerCase().trim();
  if (requested && requested !== "mock") {
    if (requested === "openai" && hasOpenAi()) return "openai";
    if ((requested === "anthropic" || requested === "claude") && hasAnthropic())
      return "anthropic";
    if (requested === "gemini" && hasGemini()) return "gemini";
    if (requested === "grok" && hasGrok()) return "grok";
    if (requested === "local" && hasLocalLlm()) return "local";
  }
  if (hasOpenAi()) return "openai";
  if (hasAnthropic()) return "anthropic";
  if (hasGemini()) return "gemini";
  if (hasGrok()) return "grok";
  if (hasLocalLlm()) return "local";
  return null;
}

export function resolveVisionProviderId(): string | null {
  if (hasOpenAi()) return "openai";
  if (hasLocalLlm() && process.env.VISION_MODEL?.trim()) return "local-vision";
  return null;
}

export function resolveImageEditProviderId(): string | null {
  if (hasOpenAi() && process.env.IMAGE_EDIT_ENABLED === "true") return "openai-images";
  return null;
}

export function getOsCapabilities(): OsCapabilities {
  const textId = resolveTextLlmProviderId();
  const visionId = resolveVisionProviderId();
  const editId = resolveImageEditProviderId();
  const blob = hasBlob();

  return {
    textLlm: textId
      ? { ready: true, provider: textId }
      : {
          ready: false,
          provider: null,
          reason: "テキストAIのAPIキーが未設定です",
        },
    vision: visionId
      ? { ready: true, provider: visionId }
      : {
          ready: false,
          provider: null,
          reason: "画像分析AI（Vision）が未接続です",
        },
    imageEdit: editId
      ? { ready: true, provider: editId }
      : {
          ready: false,
          provider: null,
          reason: "画像編集AIは準備中です",
        },
    snsMetrics: {
      ready: false,
      provider: null,
      reason: "SNSインサイトAPI連携は準備中です",
    },
    mediaStorage: blob
      ? { ready: true, provider: "vercel-blob", backend: "blob" }
      : { ready: true, provider: "database", backend: "database" },
    connectors: listConnectors().map((c) => ({
      platform: c.platform,
      oauth: c.capabilities.oauth,
      publish: c.capabilities.publish,
      insights: c.capabilities.insights,
      status:
        c.capabilities.oauth || c.capabilities.publish || c.capabilities.insights
          ? "ready"
          : "coming_soon",
    })),
  };
}

export function assertTextLlmReady(): string {
  const id = resolveTextLlmProviderId();
  if (!id) throw new OsAiUnavailableError();
  return id;
}
