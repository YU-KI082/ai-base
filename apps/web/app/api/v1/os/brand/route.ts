import { z } from "zod";
import {
  saveBrandMemory,
  loadBrandMemory,
  deleteBrandMemory,
} from "@ai-base/marketing-os";
import { repos } from "@ai-base/database";
import { withOsUser } from "../_lib";

const BrandSchema = z.object({
  brandName: z.string().min(1).max(120),
  industry: z.string().max(200).default(""),
  targetAudience: z.string().max(500).default(""),
  concept: z.string().max(1000).default(""),
  worldview: z.string().max(1000).default(""),
  colors: z.string().max(200).default(""),
  competitors: z.string().max(500).default(""),
  postTone: z.string().max(500).default(""),
  products: z.string().max(1000).default(""),
  goals: z.string().max(500).default(""),
});

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const brand = await loadBrandMemory(ctx.workspaceId);
    const handles = await repos.snsHandles.list(ctx.workspaceId);
    return Response.json({
      brand,
      handles,
      setupDone: ctx.setupDone,
      workspaceId: ctx.workspaceId,
    });
  });
}

export async function PUT(request: Request) {
  return withOsUser(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = BrandSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "ブランド情報を確認してください" }, { status: 400 });
    }
    const brand = await saveBrandMemory(ctx.workspaceId, parsed.data);
    return Response.json({ ok: true, brand });
  });
}

export async function DELETE(request: Request) {
  return withOsUser(request, async (ctx) => {
    await deleteBrandMemory(ctx.workspaceId);
    return Response.json({ ok: true, setupDone: false });
  });
}
