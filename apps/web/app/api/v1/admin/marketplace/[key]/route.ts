import { createAgentRegistry } from "@ai-base/marketplace";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  return withAdmin(request, "agents.read", async () => {
    const { key } = await context.params;
    const registry = createAgentRegistry();
    const pkg = await registry.getPackage(key);
    if (!pkg) return jsonError("Not found", 404);
    return jsonOk({ package: pkg });
  });
}
