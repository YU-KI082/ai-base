import { createAgentRegistry } from "@ai-base/marketplace";
import { jsonOk } from "@/app/api/v1/_lib/http";

/** Public catalog — free + community + published paid listings (metadata only). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const visibility = searchParams.get("visibility") ?? undefined;
  const registry = createAgentRegistry();
  const catalog = await registry.listCatalog({
    listingStatus: "published",
    visibility: visibility as never,
  });
  const publicItems = catalog.filter((p) =>
    ["free", "community", "paid"].includes(p.visibility),
  );
  return jsonOk({
    items: publicItems.map((p) => ({
      key: p.key,
      visibility: p.visibility,
      name: p.name,
      description: p.description,
      tags: p.tags,
      priceUsd: p.priceUsd,
      latestVersion: p.versions[0]?.version ?? null,
      permissions: p.permissions.map((x) => x.permission),
      dependencies: p.dependencies.map((d) => ({
        key: d.dependsOnKey,
        versionRange: d.versionRange,
        optional: d.optional,
      })),
    })),
  });
}
