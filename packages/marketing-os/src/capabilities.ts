/**
 * OS capability registry — single source of truth for what is actually wired.
 * UI must show「準備中」when a capability is not ready (no dummies).
 *
 * Text LLM providers are selected via LLM_PROVIDER + matching API key.
 * Free-tier verification prefers Gemini / Groq when LLM_PROVIDER is unset.
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
function hasGroq() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
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

type TextProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "grok"
  | "local";

function providerHasCredentials(id: string): boolean {
  switch (id) {
    case "openai":
      return hasOpenAi();
    case "anthropic":
    case "claude":
      return hasAnthropic();
    case "gemini":
      return hasGemini();
    case "groq":
      return hasGroq();
    case "grok":
      return hasGrok();
    case "local":
      return hasLocalLlm();
    default:
      return false;
  }
}

/**
 * Preferred text LLM provider for OS (never mock).
 * Order when LLM_PROVIDER unset: gemini → groq → openai → anthropic → grok → local
 * (free-tier friendly first).
 */
export function resolveTextLlmProviderId(): TextProviderId | null {
  const requested = (process.env.LLM_PROVIDER ?? "").toLowerCase().trim();
  if (requested && requested !== "mock") {
    const id = requested === "claude" ? "anthropic" : requested;
    if (providerHasCredentials(id)) return id as TextProviderId;
    // Explicit provider requested but missing key — do not silently fall through
    // to a different vendor (avoids accidental OpenAI billing).
    return null;
  }

  if (hasGemini()) return "gemini";
  if (hasGroq()) return "groq";
  if (hasOpenAi()) return "openai";
  if (hasAnthropic()) return "anthropic";
  if (hasGrok()) return "grok";
  if (hasLocalLlm()) return "local";
  return null;
}

/** Vision: Gemini free tier first; OpenAI only when explicitly selected or as last resort. */
export function resolveVisionProviderId(): string | null {
  const requested = (process.env.VISION_PROVIDER ?? process.env.LLM_PROVIDER ?? "")
    .toLowerCase()
    .trim();

  // Explicit provider — do not silently fall back to OpenAI.
  if (requested === "gemini") return hasGemini() ? "gemini" : null;
  if (requested === "openai") return hasOpenAi() ? "openai" : null;
  if (requested === "groq") return null; // Groq text-only for V2
  if (requested === "local") {
    return hasLocalLlm() && process.env.VISION_MODEL?.trim()
      ? "local-vision"
      : null;
  }

  if (hasGemini()) return "gemini";
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
          reason:
            "テキストAIのAPIキーが未設定です（GEMINI_API_KEY または GROQ_API_KEY を推奨）",
        },
    vision: visionId
      ? { ready: true, provider: visionId }
      : {
          ready: false,
          provider: null,
          reason: "画像分析AI（Vision）が未接続です（GEMINI_API_KEY 推奨）",
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
