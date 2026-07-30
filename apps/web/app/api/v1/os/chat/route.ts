import { ensureDailyBrief, chatWithEmployee } from "@ai-base/marketing-os";
import { repos } from "@ai-base/database";
import { withOsUser } from "../_lib";
import { z } from "zod";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const result = await ensureDailyBrief(ctx.workspaceId);
    return Response.json({
      brief: result.brief,
      threadId: result.thread.id,
      messages: result.messages,
      created: result.created,
    });
  });
}

const ChatSchema = z.object({
  message: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  return withOsUser(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "メッセージを入力してください" }, { status: 400 });
    }
    // Ensure brief exists so home feels continuous
    await ensureDailyBrief(ctx.workspaceId);
    const result = await chatWithEmployee(ctx.workspaceId, parsed.data.message);
    const messages = await repos.marketingOs.listMessages(result.thread.id);
    return Response.json({
      reply: result.reply,
      messages,
      threadId: result.thread.id,
    });
  });
}
