import { z } from "zod";
import { prisma, repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";

const CreateSchema = z.object({
  toolId: z.string().min(1),
  /** ASP / network name (e.g. a8, moshimo, valuecommerce) */
  network: z.string().min(1).max(100),
  /** Affiliate / tracking URL (preferred on frontend) */
  url: z.string().url(),
  /** Official homepage URL (stored as lower-priority direct link) */
  officialUrl: z.string().url().optional(),
  label: z.string().min(1).max(200).optional(),
  commission: z.string().max(100).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isHealthy: z.boolean().optional(),
});

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const toolId = new URL(request.url).searchParams.get("toolId") ?? undefined;
    const items = await repos.affiliates.list(toolId);
    return jsonOk({ items });
  });
}

export async function POST(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    let body: z.infer<typeof CreateSchema>;
    try {
      body = await readJsonSchema(request, CreateSchema);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }
    const tool = await prisma.aiTool.findUnique({ where: { id: body.toolId } });
    if (!tool) return jsonError("Tool not found", 404);

    const created = await repos.affiliates.create({
      toolId: body.toolId,
      label: body.label ?? `${body.network} affiliate`,
      url: body.url,
      network: body.network,
      commission: body.commission,
      priority: body.priority ?? 100,
      isHealthy: body.isHealthy ?? true,
    });

    const officialUrl = body.officialUrl ?? tool.homepageUrl;
    if (officialUrl && officialUrl !== body.url) {
      const existingDirect = await prisma.affiliateLink.findFirst({
        where: { toolId: body.toolId, network: "direct" },
      });
      if (existingDirect) {
        await repos.affiliates.update(existingDirect.id, {
          url: officialUrl,
          label: "公式サイト",
          isHealthy: true,
          priority: 10,
        });
      } else {
        await repos.affiliates.create({
          toolId: body.toolId,
          label: "公式サイト",
          url: officialUrl,
          network: "direct",
          priority: 10,
          isHealthy: true,
        });
      }
      if (body.officialUrl && body.officialUrl !== tool.homepageUrl) {
        await prisma.aiTool.update({
          where: { id: tool.id },
          data: { homepageUrl: body.officialUrl },
        });
      }
    }

    return jsonOk({ item: created }, { status: 201 });
  });
}
