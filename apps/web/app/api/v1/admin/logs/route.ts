import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "logs.read", async () => {
    const logs = await repos.logs.list(100);
    return jsonOk({ items: logs });
  });
}
