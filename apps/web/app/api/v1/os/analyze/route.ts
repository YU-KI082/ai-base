import { analyzeAccounts } from "@ai-base/marketing-os";
import { repos } from "@ai-base/database";
import { withOsUser } from "../_lib";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const items = await repos.marketingOs.listAnalyses(ctx.workspaceId);
    return Response.json({ items });
  });
}

export async function POST(request: Request) {
  return withOsUser(request, async (ctx) => {
    const { insight, row } = await analyzeAccounts(ctx.workspaceId);
    return Response.json({ insight, analysis: row });
  });
}
