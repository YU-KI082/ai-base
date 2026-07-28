import {
  createAgentRegistry,
  type MarketplaceAgentManifest,
} from "@ai-base/marketplace";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

/**
 * External / future developer install path:
 * POST a MarketplaceAgentManifest to register + install a plugin package.
 */
export async function POST(request: Request) {
  return withAdmin(request, "agents.manage", async () => {
    const body = await readJson<{
      manifest: MarketplaceAgentManifest;
      install?: boolean;
    }>(request);
    if (!body.manifest?.key || !body.manifest?.version) {
      return jsonError("manifest.key and manifest.version are required");
    }
    const registry = createAgentRegistry();
    const deps = await registry.checkDependencies(body.manifest);
    if (!deps.ok) {
      return jsonError(`Dependency check failed: ${JSON.stringify(deps)}`);
    }
    const result = await registry.registerPlugin(body.manifest, {
      install: body.install !== false,
      visibility: body.manifest.marketplace?.visibility,
      listingStatus: body.manifest.marketplace?.listingStatus ?? "published",
    });
    return jsonOk({ ok: true, result });
  });
}
