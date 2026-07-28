import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  return withAdmin(request, "settings.manage", async () => {
    const { key } = await context.params;
    try {
      await repos.categories.deleteByKey(key);
      return jsonOk({ ok: true });
    } catch {
      return jsonError("Not found or in use", 400);
    }
  });
}
