import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "drafts.read", async () => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const drafts = await repos.drafts.list(status ?? undefined);
    return jsonOk({ items: drafts });
  });
}
