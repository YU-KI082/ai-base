import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  return withAdmin(request, "agents.manage", async () => {
    const { key } = await context.params;
    const body = await readJson<{ enabled: boolean }>(request);
    const agent = await repos.agents.setEnabled(key, Boolean(body.enabled));
    return jsonOk({ agent });
  });
}
