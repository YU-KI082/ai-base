import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdmin(request, "settings.manage", async () => {
    const { id } = await context.params;
    try {
      await repos.tools.deleteById(id);
      return jsonOk({ ok: true });
    } catch {
      return jsonError("Not found", 404);
    }
  });
}
