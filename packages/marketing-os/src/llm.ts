import { createLlmProvider } from "@ai-base/llm";
import type { BrandMemory } from "./types.js";
import { aiEmployeeSystemPrompt } from "./persona.js";

export function getOsLlm() {
  return createLlmProvider();
}

export async function completeJson<T>(input: {
  brand: BrandMemory | null;
  userPrompt: string;
  fallback: T;
}): Promise<T> {
  const llm = getOsLlm();
  try {
    const result = await llm.complete({
      messages: [
        { role: "system", content: aiEmployeeSystemPrompt(input.brand) },
        {
          role: "user",
          content: `${input.userPrompt}\n\n必ず有効な JSON のみを返してください。`,
        },
      ],
      temperature: 0.6,
      responseFormat: "json",
    });
    const raw = result.content.trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText =
      start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    return JSON.parse(jsonText) as T;
  } catch {
    return input.fallback;
  }
}

export async function completeText(input: {
  brand: BrandMemory | null;
  userPrompt: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const llm = getOsLlm();
  const history = (input.history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const result = await llm.complete({
    messages: [
      { role: "system", content: aiEmployeeSystemPrompt(input.brand) },
      ...history,
      { role: "user", content: input.userPrompt },
    ],
    temperature: 0.7,
  });
  return result.content.trim();
}
