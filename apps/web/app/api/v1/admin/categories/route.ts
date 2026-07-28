import { z } from "zod";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";

const UpsertSchema = z.object({
  key: z.string().min(1).max(80),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  jaName: z.string().min(1).max(120),
  enName: z.string().min(1).max(120).optional(),
  jaDescription: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const items = await repos.categories.list();
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
    const item = await repos.categories.upsert(body);
    return jsonOk({ item }, { status: 201 });
  });
}
