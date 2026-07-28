/** Canonical tool_ingest pipeline steps — additive only. */
export const TOOL_INGEST_STEPS = [
  { agentKey: "scout", stepKey: "scout" },
  { agentKey: "reviewer", stepKey: "reviewer" },
  { agentKey: "writer", stepKey: "writer" },
  { agentKey: "designer", stepKey: "designer" },
  { agentKey: "translator", stepKey: "translator" },
  { agentKey: "seo", stepKey: "seo" },
  /** Human gate — not an agent plugin; approval happens in Admin UI. */
  { agentKey: "human", stepKey: "approval" },
  { agentKey: "publisher", stepKey: "publisher" },
] as const;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "ai-tool";
}
