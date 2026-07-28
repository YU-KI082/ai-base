import { createAgentRegistry } from "@ai-base/marketplace";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "agents.read", async () => {
    const { searchParams } = new URL(request.url);
    const registry = createAgentRegistry();
    const catalog = await registry.listCatalog({
      visibility: (searchParams.get("visibility") as never) || undefined,
      listingStatus: searchParams.get("status") ?? undefined,
    });
    const installations = await registry.listInstallations();
    return jsonOk({ catalog, installations });
  });
}
