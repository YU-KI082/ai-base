import { generateAiScore } from "@ai-base/marketing-os";
import { repos } from "@ai-base/database";
import { withOsUser } from "../_lib";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const latest = await repos.marketingOs.latestScore(ctx.workspaceId);
    return Response.json({ latest });
  });
}

export async function POST(request: Request) {
  return withOsUser(request, async (ctx) => {
    const result = await generateAiScore(ctx.workspaceId);
    return Response.json(result);
  });
}
