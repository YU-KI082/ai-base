import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "agents.read", async () => {
    const agents = await repos.agents.list();
    return jsonOk({ items: agents });
  });
}
