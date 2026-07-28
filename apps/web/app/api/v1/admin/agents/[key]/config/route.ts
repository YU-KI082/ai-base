import { repos, prisma, type Prisma } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import {
  AgentConfigBodySchema,
  jsonError,
  jsonOk,
  readJsonSchema,
} from "@/app/api/v1/_lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  return withAdmin(request, "agents.manage", async (user) => {
    const { key } = await context.params;
    let body: { config: Record<string, unknown> };
    try {
      body = await readJsonSchema(request, AgentConfigBodySchema);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonError(message, 400);
    }

    const before = await repos.agents.findByKey(key);
    const agent = await repos.agents.updateConfig(
      key,
      body.config as Prisma.InputJsonValue,
    );

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "agent.config_updated",
        resource: "agent",
        resourceId: key,
        before: (before?.config as Prisma.InputJsonValue) ?? {},
        after: body.config as Prisma.InputJsonValue,
      },
    });

    return jsonOk({ agent });
  });
}
