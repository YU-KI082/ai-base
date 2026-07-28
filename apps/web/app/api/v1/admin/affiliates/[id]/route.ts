import { z } from "zod";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";

const PatchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  network: z.string().max(100).nullable().optional(),
  commission: z.string().max(100).nullable().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isHealthy: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdmin(request, "settings.manage", async () => {
    const { id } = await context.params;
    let body: z.infer<typeof PatchSchema>;
    try {
      body = await readJsonSchema(request, PatchSchema);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }
    const existing = await repos.affiliates.findById(id);
    if (!existing) return jsonError("Not found", 404);
    const item = await repos.affiliates.update(id, body);
    return jsonOk({ item });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdmin(_request, "settings.manage", async () => {
    const { id } = await context.params;
    const existing = await repos.affiliates.findById(id);
    if (!existing) return jsonError("Not found", 404);
    await repos.affiliates.remove(id);
    return jsonOk({ ok: true });
  });
}
