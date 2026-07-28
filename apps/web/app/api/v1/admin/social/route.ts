import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    const items = await repos.socialPosts.list(status ?? undefined);
    return jsonOk({ items });
  });
}
