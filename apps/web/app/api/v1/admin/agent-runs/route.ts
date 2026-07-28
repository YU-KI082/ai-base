import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "agents.read", async () => {
    const { searchParams } = new URL(request.url);
    const runs = await repos.agentRuns.list({
      agentKey: searchParams.get("agentKey") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      take: Number(searchParams.get("take") ?? 50),
    });
    return jsonOk({ items: runs });
  });
}
