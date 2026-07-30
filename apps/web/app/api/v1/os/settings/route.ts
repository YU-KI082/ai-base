import { repos } from "@ai-base/database";
import type { Prisma } from "@ai-base/database";
import {
  parseWorkspaceSettings,
  PLAN_LABELS,
  WorkspaceSettingsSchema,
} from "@ai-base/marketing-os";
import { withOsUser } from "../_lib";
import { z } from "zod";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const ws = await repos.workspaces.findById(ctx.workspaceId);
    if (!ws) {
      return Response.json({ error: "ワークスペースが見つかりません" }, { status: 404 });
    }
    const settings = parseWorkspaceSettings(ws.settings);
    const plan = ws.plan || "free";
    return Response.json({
      plan,
      planLabel: PLAN_LABELS[plan] || plan,
      settings,
      name: ws.name,
      setupDone: ws.setupDone,
    });
  });
}

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  settings: WorkspaceSettingsSchema.optional(),
});

export async function PATCH(request: Request) {
  return withOsUser(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "設定内容を確認してください" }, { status: 400 });
    }

    const ws = await repos.workspaces.findById(ctx.workspaceId);
    if (!ws) {
      return Response.json({ error: "ワークスペースが見つかりません" }, { status: 404 });
    }

    const nextSettings = parsed.data.settings
      ? {
          ...parseWorkspaceSettings(ws.settings),
          ...parsed.data.settings,
          notifications: {
            ...parseWorkspaceSettings(ws.settings).notifications,
            ...parsed.data.settings.notifications,
          },
        }
      : undefined;

    const updated = await repos.workspaces.updateSettings(ctx.workspaceId, {
      name: parsed.data.name,
      settings: nextSettings as Prisma.InputJsonValue | undefined,
    });

    const settings = parseWorkspaceSettings(updated.settings);
    const plan = updated.plan || "free";
    return Response.json({
      plan,
      planLabel: PLAN_LABELS[plan] || plan,
      settings,
      name: updated.name,
      setupDone: updated.setupDone,
    });
  });
}
