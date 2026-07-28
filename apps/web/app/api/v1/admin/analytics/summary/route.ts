import { prisma } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "admin.access", async () => {
    const [publishedTools, pendingDrafts, failedRuns] = await Promise.all([
      prisma.aiTool.count({ where: { status: "published" } }),
      prisma.draft.count({ where: { status: "pending_approval" } }),
      prisma.agentRun.count({ where: { status: "failed" } }),
    ]);
    return jsonOk({
      publishedTools,
      pendingDrafts,
      failedRuns,
    });
  });
}
