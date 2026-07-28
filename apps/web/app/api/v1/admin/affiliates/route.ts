import { z } from "zod";
import { prisma, repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";

const CreateSchema = z.object({
  toolId: z.string().min(1),
  label: z.string().min(1).max(200),
  url: z.string().url(),
  network: z.string().max(100).optional(),
  commission: z.string().max(100).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isHealthy: z.boolean().optional(),
});

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const toolId = new URL(request.url).searchParams.get("toolId") ?? undefined;
    const items = await repos.affiliates.list(toolId);
    return jsonOk({ items });
  });
}

export async function POST(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    let body: z.infer<typeof CreateSchema>;
    try {
      body = await readJsonSchema(request, CreateSchema);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }
    const tool = await prisma.aiTool.findUnique({ where: { id: body.toolId } });
    if (!tool) return jsonError("Tool not found", 404);
    const created = await repos.affiliates.create(body);
    return jsonOk({ item: created }, { status: 201 });
  });
}
