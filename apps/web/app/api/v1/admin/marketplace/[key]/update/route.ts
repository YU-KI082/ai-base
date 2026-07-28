import { createAgentRegistry } from "@ai-base/marketplace";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  return withAdmin(request, "agents.manage", async () => {
    const { key } = await context.params;
    const body = (await readJson<{ version?: string }>(request).catch(() => ({
      version: undefined,
    }))) as { version?: string };
    const registry = createAgentRegistry();
    try {
      const result = await registry.updateAgent(key, body.version);
      return jsonOk({ ok: true, result });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error));
    }
  });
}
