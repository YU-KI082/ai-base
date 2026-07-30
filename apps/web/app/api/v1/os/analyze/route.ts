import {
  analyzeAccounts,
  buildAnalysisSections,
  loadBrandMemory,
} from "@ai-base/marketing-os";
import { repos } from "@ai-base/database";
import { withOsUser } from "../_lib";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const [items, improvements, brand, handles] = await Promise.all([
      repos.marketingOs.listAnalyses(ctx.workspaceId),
      repos.marketingOs.listImprovements(ctx.workspaceId, 10),
      loadBrandMemory(ctx.workspaceId),
      repos.snsHandles.list(ctx.workspaceId),
    ]);
    const latest = items[0] ?? null;
    const detail =
      latest && typeof latest.detail === "object" && latest.detail
        ? (latest.detail as Record<string, unknown>)
        : {};
    const sections =
      (detail.sections as ReturnType<typeof buildAnalysisSections> | undefined) ||
      buildAnalysisSections(
        brand,
        handles,
        improvements.map((i) => ({
          title: i.title,
          result: i.result,
          cause: i.cause,
          dateKey: i.dateKey,
        })),
      );
    return Response.json({
      items,
      latest: latest
        ? {
            id: latest.id,
            summary: latest.summary,
            findings: latest.findings,
            nextActions: latest.nextActions,
            createdAt: latest.createdAt,
            sections,
          }
        : null,
      sections,
      improvements: improvements.map((i) => ({
        id: i.id,
        dateKey: i.dateKey,
        title: i.title,
        cause: i.cause,
        action: i.action,
        result: i.result,
        platform: i.platform,
      })),
    });
  });
}

export async function POST(request: Request) {
  return withOsUser(request, async (ctx) => {
    const { insight, sections, row } = await analyzeAccounts(ctx.workspaceId);
    return Response.json({ insight, sections, analysis: row });
  });
}
