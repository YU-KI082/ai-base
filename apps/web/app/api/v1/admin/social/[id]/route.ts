import { z } from "zod";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";

const PatchSchema = z.object({
  status: z.enum(["draft", "ready", "published", "rejected"]),
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
    const item = await repos.socialPosts.updateStatus(id, body.status);
    return jsonOk({ item });
  });
}
