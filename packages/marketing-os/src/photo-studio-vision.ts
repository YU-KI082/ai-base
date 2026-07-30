import { z } from "zod";
import type { BrandMemory } from "./types.js";
import type {
  PhotoAnalysis,
  PhotoEnhanceRecipe,
  PhotoStudioPort,
  ShootAdvice,
} from "./photo-studio-types.js";
import { resolveBrandPhotoPreset } from "./photo-studio-engine.js";
import {
  OsAiUnavailableError,
  resolveImageEditProviderId,
  resolveVisionProviderId,
} from "./capabilities.js";
import { formatBrandForPrompt } from "./brand-memory.js";

const AnalysisSchema = z.object({
  overall: z.number(),
  scores: z.object({
    brightness: z.number(),
    composition: z.number(),
    color: z.number(),
    brandFit: z.number(),
    productVisibility: z.number(),
    background: z.number(),
    whitespace: z.number(),
    snsAppeal: z.number(),
  }),
  summary: z.string(),
  improvements: z.array(z.string()),
  shootAdvice: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .optional(),
});

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function visionChat(input: {
  imageDataUrl: string;
  system: string;
  user: string;
}): Promise<string> {
  const provider = resolveVisionProviderId();
  if (!provider) throw new OsAiUnavailableError("画像分析AIは準備中です。");

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY!.trim();
    const model =
      process.env.VISION_MODEL?.trim() ||
      process.env.LLM_MODEL?.trim() ||
      "gpt-4o-mini";
    const base = (
      process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          {
            role: "user",
            content: [
              { type: "text", text: input.user },
              { type: "image_url", image_url: { url: input.imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Vision API error ${res.status}: ${body.slice(0, 400)}`);
    }
    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return json.choices[0]?.message?.content ?? "";
  }

  // local-vision (Ollama OpenAI-compatible with VISION_MODEL)
  const apiKey = process.env.LOCAL_LLM_API_KEY?.trim() || "local";
  const model = process.env.VISION_MODEL!.trim();
  const base = (
    process.env.LOCAL_LLM_BASE_URL?.trim() || "http://127.0.0.1:11434/v1"
  ).replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: input.system },
        {
          role: "user",
          content: [
            { type: "text", text: `${input.user}\nJSONのみ返すこと。` },
            { type: "image_url", image_url: { url: input.imageDataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Local vision error ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return (json.choices[0]?.message?.content ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

export async function analyzePhotoWithVision(input: {
  imageDataUrl: string;
  brand: BrandMemory | null;
  width?: number | null;
  height?: number | null;
}): Promise<{ analysis: PhotoAnalysis; advice: ShootAdvice[]; provider: string }> {
  const provider = resolveVisionProviderId();
  if (!provider) throw new OsAiUnavailableError("画像分析AIは準備中です。");

  const brandBlock = input.brand
    ? formatBrandForPrompt(input.brand)
    : "ブランド未設定";
  const raw = await visionChat({
    imageDataUrl: input.imageDataUrl,
    system:
      "あなたはSNS向けの写真ディレクターです。画像を見て数値評価し、必ず有効なJSONのみ返します。",
    user: `この写真をSNS投稿向けに評価してください。
画像サイズ目安: ${input.width ?? "?"}x${input.height ?? "?"}

ブランド:
${brandBlock}

JSON:
{
  "overall": 0-100,
  "scores": {
    "brightness": 0-100,
    "composition": 0-100,
    "color": 0-100,
    "brandFit": 0-100,
    "productVisibility": 0-100,
    "background": 0-100,
    "whitespace": 0-100,
    "snsAppeal": 0-100
  },
  "summary": string,
  "improvements": string[],
  "shootAdvice": [{ "title": string, "detail": string }]
}
shootAdvice は次回撮影向けに3〜4件。`,
  });

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  const parsed = AnalysisSchema.parse(JSON.parse(jsonText));
  const scores = {
    brightness: clampScore(parsed.scores.brightness),
    composition: clampScore(parsed.scores.composition),
    color: clampScore(parsed.scores.color),
    brandFit: clampScore(parsed.scores.brandFit),
    productVisibility: clampScore(parsed.scores.productVisibility),
    background: clampScore(parsed.scores.background),
    whitespace: clampScore(parsed.scores.whitespace),
    snsAppeal: clampScore(parsed.scores.snsAppeal),
  };
  const analysis: PhotoAnalysis = {
    overall: clampScore(parsed.overall),
    scores,
    summary: parsed.summary,
    improvements: parsed.improvements.slice(0, 8),
  };
  const advice =
    parsed.shootAdvice?.slice(0, 4) ||
    analysis.improvements.slice(0, 3).map((t) => ({
      title: t.slice(0, 40),
      detail: "次回撮影で意識してください",
    }));

  return { analysis, advice, provider };
}

export async function enhancePhotoWithProvider(input: {
  imageDataUrl: string;
  brand: BrandMemory | null;
  analysis: PhotoAnalysis;
}): Promise<PhotoEnhanceRecipe> {
  const id = resolveImageEditProviderId();
  if (!id) {
    throw new OsAiUnavailableError(
      "画像のワンクリック改善（画素編集AI）は準備中です。分析と投稿文生成は利用できます。",
    );
  }
  // Reserved for OpenAI Images edits / dedicated editor wiring.
  void input;
  throw new OsAiUnavailableError("画像編集AIは準備中です。");
}

/** Active Photo Studio port — Vision when ready; otherwise callers must show 準備中. */
export const visionPhotoStudioPort: PhotoStudioPort = {
  id: "vision",
  async analyze(input) {
    const { analysis } = await analyzePhotoWithVision(input);
    return analysis;
  },
  async enhance(input) {
    return enhancePhotoWithProvider(input);
  },
};

export function getActivePhotoStudioPort(): PhotoStudioPort | null {
  if (!resolveVisionProviderId()) return null;
  return visionPhotoStudioPort;
}

export { resolveBrandPhotoPreset };
