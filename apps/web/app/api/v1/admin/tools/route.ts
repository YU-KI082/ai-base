import { z } from "zod";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";

const UpsertSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(120),
  homepageUrl: z.string().url(),
  pricingModel: z.enum(["free", "freemium", "paid", "enterprise", "unknown"]),
  hasFreePlan: z.boolean(),
  hasApi: z.boolean(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  categoryKey: z.string().optional(),
  ja: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    features: z.array(z.string()).optional(),
    pros: z.array(z.string()).optional(),
    cons: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    useCases: z.array(z.string()).optional(),
    recommendedUsers: z.array(z.string()).optional(),
    languageSupport: z.array(z.string()).optional(),
    pricingNotes: z.string().optional(),
  }),
  en: z
    .object({
      name: z.string().min(1),
      description: z.string().min(1),
      features: z.array(z.string()).optional(),
      pros: z.array(z.string()).optional(),
      cons: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      useCases: z.array(z.string()).optional(),
      recommendedUsers: z.array(z.string()).optional(),
      languageSupport: z.array(z.string()).optional(),
      pricingNotes: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const items = await repos.tools.listAll(300);
    return jsonOk({ items });
  });
}

export async function POST(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    let body: z.infer<typeof UpsertSchema>;
    try {
      body = await readJsonSchema(request, UpsertSchema);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }
    const item = await repos.tools.upsertAdmin(body);
    return jsonOk({ item }, { status: body.id ? 200 : 201 });
  });
}
