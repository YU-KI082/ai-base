import type { DiscoveredTool, ScoutSourceProvider } from "./types.js";

/**
 * Product Hunt — uses public Atom/GraphQL when PRODUCTHUNT_TOKEN set.
 * Without token: curated seed discoveries (no scraping of private pages).
 */
export const productHuntSource: ScoutSourceProvider = {
  name: "product_hunt",

  isConfigured() {
    return true;
  },

  async discover(limit = 5) {
    const token = process.env.PRODUCTHUNT_TOKEN?.trim();
    if (token) {
      try {
        const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: `{ posts(first: ${Math.min(limit, 20)}, topic: "artificial-intelligence") { edges { node { id name tagline url website } } } }`,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as {
            data?: {
              posts?: {
                edges?: Array<{
                  node: {
                    id: string;
                    name: string;
                    tagline?: string;
                    url?: string;
                    website?: string;
                  };
                }>;
              };
            };
          };
          return (json.data?.posts?.edges ?? []).map((e) => ({
            name: e.node.name,
            homepageUrl: e.node.website || e.node.url || `https://www.producthunt.com`,
            sourceName: "product_hunt",
            sourceUrl: e.node.url,
            externalId: e.node.id,
            description: e.node.tagline,
            categoryHints: ["ai"],
          }));
        }
      } catch {
        // fall through to seeds
      }
    }
    return seedAiTools("product_hunt", limit);
  },
};

function seedAiTools(source: string, limit: number): DiscoveredTool[] {
  const seeds: DiscoveredTool[] = [
    {
      name: "Cursor",
      homepageUrl: "https://cursor.com",
      sourceName: source,
      description: "AI code editor",
      categoryHints: ["coding", "devtools"],
      externalId: `${source}:cursor`,
    },
    {
      name: "Perplexity",
      homepageUrl: "https://www.perplexity.ai",
      sourceName: source,
      description: "AI answer engine",
      categoryHints: ["search", "research"],
      externalId: `${source}:perplexity`,
    },
    {
      name: "Claude",
      homepageUrl: "https://claude.ai",
      sourceName: source,
      description: "Anthropic assistant",
      categoryHints: ["chat", "llm"],
      externalId: `${source}:claude`,
    },
    {
      name: "ChatGPT",
      homepageUrl: "https://chatgpt.com",
      sourceName: source,
      description: "OpenAI assistant",
      categoryHints: ["chat", "llm"],
      externalId: `${source}:chatgpt`,
    },
    {
      name: "Gemini",
      homepageUrl: "https://gemini.google.com",
      sourceName: source,
      description: "Google AI assistant",
      categoryHints: ["chat", "llm"],
      externalId: `${source}:gemini`,
    },
    {
      name: "Midjourney",
      homepageUrl: "https://www.midjourney.com",
      sourceName: source,
      description: "AI image generation",
      categoryHints: ["image", "creative"],
      externalId: `${source}:midjourney`,
    },
    {
      name: "Runway",
      homepageUrl: "https://runwayml.com",
      sourceName: source,
      description: "AI video generation",
      categoryHints: ["video", "creative"],
      externalId: `${source}:runway`,
    },
    {
      name: "ElevenLabs",
      homepageUrl: "https://elevenlabs.io",
      sourceName: source,
      description: "AI voice synthesis",
      categoryHints: ["audio", "voice"],
      externalId: `${source}:elevenlabs`,
    },
  ];
  // Rotate by day so daily runs feel fresh without duplicates flooding
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const rotated = [...seeds.slice(day % seeds.length), ...seeds.slice(0, day % seeds.length)];
  return rotated.slice(0, limit).map((s) => ({
    ...s,
    externalId: `${s.externalId}:${day}`,
  }));
}

export const huggingFaceSource: ScoutSourceProvider = {
  name: "huggingface",
  isConfigured() {
    return true;
  },
  async discover(limit = 5) {
    try {
      const res = await fetch(
        `https://huggingface.co/api/models?sort=trending&limit=${Math.min(limit, 20)}&filter=text-generation`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          id: string;
          modelId?: string;
          pipeline_tag?: string;
        }>;
        return rows.slice(0, limit).map((r) => {
          const id = r.modelId || r.id;
          return {
            name: id.split("/").pop() || id,
            homepageUrl: `https://huggingface.co/${id}`,
            sourceName: "huggingface",
            sourceUrl: `https://huggingface.co/${id}`,
            externalId: `hf:${id}`,
            description: `Hugging Face model (${r.pipeline_tag ?? "ml"})`,
            categoryHints: ["ml", "models"],
          } satisfies DiscoveredTool;
        });
      }
    } catch {
      // seed fallback
    }
    return seedAiTools("huggingface", limit);
  },
};

export const githubTrendingSource: ScoutSourceProvider = {
  name: "github_trending",
  isConfigured() {
    return true;
  },
  async discover(limit = 5) {
    const token = process.env.GITHUB_TOKEN?.trim();
    const q = encodeURIComponent("AI OR LLM OR GPT stars:>100");
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-base-research-agent",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=${Math.min(limit, 20)}`,
        { headers },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          items?: Array<{
            id: number;
            full_name: string;
            html_url: string;
            homepage?: string | null;
            description?: string | null;
          }>;
        };
        return (json.items ?? []).slice(0, limit).map((r) => ({
          name: r.full_name.split("/")[1] || r.full_name,
          homepageUrl: r.homepage || r.html_url,
          sourceName: "github_trending",
          sourceUrl: r.html_url,
          externalId: `gh:${r.id}`,
          description: r.description ?? undefined,
          categoryHints: ["opensource", "devtools"],
        }));
      }
    } catch {
      // seed
    }
    return seedAiTools("github_trending", limit);
  },
};

/** Official blogs / vendor news — RSS-friendly stubs + optional URLs */
export const vendorBlogSource: ScoutSourceProvider = {
  name: "vendor_blogs",
  isConfigured() {
    return true;
  },
  async discover(limit = 5) {
    const feeds = [
      { name: "OpenAI", url: "https://openai.com" },
      { name: "Anthropic", url: "https://www.anthropic.com" },
      { name: "Google AI", url: "https://ai.google" },
    ];
    return feeds.slice(0, limit).map((f, i) => ({
      name: `${f.name} AI Updates`,
      homepageUrl: f.url,
      sourceName: "vendor_blogs",
      sourceUrl: f.url,
      externalId: `vendor:${f.name}:${Math.floor(Date.now() / 86400000)}:${i}`,
      description: `${f.name} official AI updates`,
      categoryHints: ["news", "llm"],
    }));
  },
};

export const redditSource: ScoutSourceProvider = {
  name: "reddit",
  isConfigured() {
    return true;
  },
  async discover(limit = 5) {
    try {
      const res = await fetch(
        "https://www.reddit.com/r/MachineLearning/hot.json?limit=20",
        {
          headers: { "User-Agent": "ai-base-research/0.1" },
        },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data?: {
            children?: Array<{
              data: { id: string; title: string; url: string; permalink: string };
            }>;
          };
        };
        return (json.data?.children ?? [])
          .slice(0, limit)
          .map((c) => ({
            name: c.data.title.slice(0, 80),
            homepageUrl: c.data.url.startsWith("http")
              ? c.data.url
              : `https://reddit.com${c.data.permalink}`,
            sourceName: "reddit",
            sourceUrl: `https://reddit.com${c.data.permalink}`,
            externalId: `reddit:${c.data.id}`,
            description: c.data.title,
            categoryHints: ["community", "research"],
          }));
      }
    } catch {
      // seed
    }
    return seedAiTools("reddit", limit);
  },
};

export const ALL_SOURCES: ScoutSourceProvider[] = [
  productHuntSource,
  huggingFaceSource,
  githubTrendingSource,
  vendorBlogSource,
  redditSource,
];

export function getSources(names?: string[]) {
  if (!names?.length) return ALL_SOURCES;
  const set = new Set(names);
  return ALL_SOURCES.filter((s) => set.has(s.name));
}

export async function discoverFromSources(input?: {
  sources?: string[];
  limit?: number;
}): Promise<DiscoveredTool[]> {
  const limit = input?.limit ?? 8;
  const providers = getSources(input?.sources).filter((p) => p.isConfigured());
  const per = Math.max(1, Math.ceil(limit / Math.max(providers.length, 1)));
  const batches = await Promise.all(
    providers.map(async (p) => {
      try {
        return await p.discover(per);
      } catch {
        return [] as DiscoveredTool[];
      }
    }),
  );
  const seen = new Set<string>();
  const out: DiscoveredTool[] = [];
  for (const row of batches.flat()) {
    const key = row.homepageUrl.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}
