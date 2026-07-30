import { generateCreative, OS_PLATFORMS } from "@ai-base/marketing-os";
import { repos } from "@ai-base/database";
import { withOsUser } from "../_lib";
import { z } from "zod";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const items = await repos.marketingOs.listCreatives(ctx.workspaceId);
    return Response.json({ items });
  });
}

const BodySchema = z.object({
  platform: z.enum(OS_PLATFORMS).default("instagram"),
});

export async function POST(request: Request) {
  return withOsUser(request, async (ctx) => {
    const body = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    const platform = parsed.success ? parsed.data.platform : "instagram";
    const creative = await generateCreative(ctx.workspaceId, platform);
    return Response.json({ creative });
  });
}
