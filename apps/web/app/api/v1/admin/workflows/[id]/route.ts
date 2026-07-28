import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdmin(request, "workflows.read", async () => {
    const { id } = await context.params;
    const workflow = await repos.workflows.findById(id);
    if (!workflow) return jsonError("Not found", 404);
    return jsonOk({ workflow });
  });
}
