import { createLlmProvider } from "@ai-base/llm";
import type { BrandMemory } from "./types.js";
import { aiEmployeeSystemPrompt } from "./persona.js";

/** True when a cloud LLM credential is available (not mock-only). */
export function hasRealLlmCredentials(): boolean {
  const provider = (process.env.LLM_PROVIDER ?? "openai").toLowerCase().trim();
  if (provider === "mock") return false;
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GROK_API_KEY?.trim() ||
      process.env.XAI_API_KEY?.trim(),
  );
}

export function getOsLlm() {
  return createLlmProvider();
}

function looksLikeMock(content: string): boolean {
  return /^Mock completion for:/i.test(content.trim());
}

export async function completeJson<T>(input: {
  brand: BrandMemory | null;
  userPrompt: string;
  improvementHistory?: string;
}): Promise<T | null> {
  if (!hasRealLlmCredentials()) return null;
  try {
    const llm = getOsLlm();
    const result = await llm.complete({
      messages: [
        {
          role: "system",
          content: aiEmployeeSystemPrompt(input.brand, input.improvementHistory),
        },
        {
          role: "user",
          content: `${input.userPrompt}\n\n必ず有効な JSON のみを返してください。`,
        },
      ],
      temperature: 0.6,
      responseFormat: "json",
    });
    const raw = result.content.trim();
    if (looksLikeMock(raw)) return null;
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText =
      start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    return JSON.parse(jsonText) as T;
  } catch {
    return null;
  }
}

export async function completeText(input: {
  brand: BrandMemory | null;
  userPrompt: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  improvementHistory?: string;
}): Promise<string | null> {
  if (!hasRealLlmCredentials()) return null;
  try {
    const llm = getOsLlm();
    const history = (input.history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const result = await llm.complete({
      messages: [
        {
          role: "system",
          content: aiEmployeeSystemPrompt(input.brand, input.improvementHistory),
        },
        ...history,
        { role: "user", content: input.userPrompt },
      ],
      temperature: 0.7,
    });
    const text = result.content.trim();
    if (!text || looksLikeMock(text)) return null;
    return text;
  } catch {
    return null;
  }
}
