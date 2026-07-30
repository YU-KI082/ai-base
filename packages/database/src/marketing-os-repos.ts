import { prisma, type Prisma } from "./client.js";
import type { User } from "@prisma/client";

export class WorkspaceRepository {
  private get db() {
    return prisma;
  }

  async findByOwner(ownerUserId: string) {
    return this.db.workspace.findFirst({
      where: { ownerUserId },
      include: { brand: true, handles: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(id: string) {
    return this.db.workspace.findUnique({
      where: { id },
      include: { brand: true, handles: true },
    });
  }

  async create(input: { ownerUserId: string; name: string }) {
    return this.db.workspace.create({
      data: {
        ownerUserId: input.ownerUserId,
        name: input.name,
      },
      include: { brand: true, handles: true },
    });
  }

  async markSetupDone(id: string, done = true) {
    return this.db.workspace.update({
      where: { id },
      data: { setupDone: done },
    });
  }
}

export class BrandProfileRepository {
  private get db() {
    return prisma;
  }

  async upsert(
    workspaceId: string,
    data: {
      brandName: string;
      industry?: string;
      targetAudience?: string;
      concept?: string;
      worldview?: string;
      colors?: string;
      competitors?: string;
      postTone?: string;
      products?: string;
      goals?: string;
      memoryExtra?: Prisma.InputJsonValue;
    },
  ) {
    // Neon HTTP adapter does not support Prisma upsert transactions.
    const existing = await this.db.brandProfile.findUnique({
      where: { workspaceId },
    });
    const createData = {
      workspaceId,
      brandName: data.brandName,
      industry: data.industry ?? "",
      targetAudience: data.targetAudience ?? "",
      concept: data.concept ?? "",
      worldview: data.worldview ?? "",
      colors: data.colors ?? "",
      competitors: data.competitors ?? "",
      postTone: data.postTone ?? "",
      products: data.products ?? "",
      goals: data.goals ?? "",
      memoryExtra: data.memoryExtra ?? {},
    };
    if (!existing) {
      return this.db.brandProfile.create({ data: createData });
    }
    return this.db.brandProfile.update({
      where: { workspaceId },
      data: {
        brandName: data.brandName,
        industry: data.industry,
        targetAudience: data.targetAudience,
        concept: data.concept,
        worldview: data.worldview,
        colors: data.colors,
        competitors: data.competitors,
        postTone: data.postTone,
        products: data.products,
        goals: data.goals,
        memoryExtra: data.memoryExtra,
      },
    });
  }

  async get(workspaceId: string) {
    return this.db.brandProfile.findUnique({ where: { workspaceId } });
  }
}

export class SnsHandleRepository {
  private get db() {
    return prisma;
  }

  async list(workspaceId: string) {
    return this.db.snsAccountHandle.findMany({
      where: { workspaceId },
      orderBy: { platform: "asc" },
    });
  }

  async upsertMany(
    workspaceId: string,
    handles: Array<{ platform: string; username: string }>,
  ) {
    const results = [];
    for (const h of handles) {
      const username = h.username.trim().replace(/^@/, "");
      if (!username) {
        await this.db.snsAccountHandle.deleteMany({
          where: { workspaceId, platform: h.platform },
        });
        continue;
      }
      const existing = await this.db.snsAccountHandle.findUnique({
        where: {
          workspaceId_platform: { workspaceId, platform: h.platform },
        },
      });
      if (!existing) {
        results.push(
          await this.db.snsAccountHandle.create({
            data: { workspaceId, platform: h.platform, username },
          }),
        );
      } else {
        results.push(
          await this.db.snsAccountHandle.update({
            where: {
              workspaceId_platform: { workspaceId, platform: h.platform },
            },
            data: { username },
          }),
        );
      }
    }
    return results;
  }
}

export class MarketingOsRepository {
  private get db() {
    return prisma;
  }

  async createAnalysis(input: {
    workspaceId: string;
    platform?: string | null;
    summary: string;
    findings: Prisma.InputJsonValue;
    nextActions: Prisma.InputJsonValue;
    detail?: Prisma.InputJsonValue;
  }) {
    return this.db.accountAnalysis.create({
      data: {
        workspaceId: input.workspaceId,
        platform: input.platform ?? null,
        summary: input.summary,
        findings: input.findings,
        nextActions: input.nextActions,
        detail: input.detail ?? {},
      },
    });
  }

  async listAnalyses(workspaceId: string, take = 20) {
    return this.db.accountAnalysis.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async createScore(input: {
    workspaceId: string;
    overall: number;
    platforms: Prisma.InputJsonValue;
    reasons: Prisma.InputJsonValue;
    nextActions: Prisma.InputJsonValue;
  }) {
    return this.db.aiScoreSnapshot.create({
      data: input,
    });
  }

  async latestScore(workspaceId: string) {
    return this.db.aiScoreSnapshot.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOrCreateTaskSet(workspaceId: string, dateKey: string) {
    const existing = await this.db.dailyTaskSet.findUnique({
      where: { workspaceId_dateKey: { workspaceId, dateKey } },
      include: { items: { orderBy: { priority: "asc" } } },
    });
    if (existing) return existing;
    return this.db.dailyTaskSet.create({
      data: { workspaceId, dateKey },
      include: { items: { orderBy: { priority: "asc" } } },
    });
  }

  async replaceTaskItems(
    taskSetId: string,
    items: Array<{
      title: string;
      detail?: string;
      category?: string;
      priority?: number;
      deepLink?: string | null;
    }>,
  ) {
    await this.db.dailyTaskItem.deleteMany({ where: { taskSetId } });
    if (items.length === 0) return [];
    await this.db.dailyTaskItem.createMany({
      data: items.map((it, i) => ({
        taskSetId,
        title: it.title,
        detail: it.detail ?? "",
        category: it.category ?? "general",
        priority: it.priority ?? i,
        deepLink: it.deepLink ?? null,
      })),
    });
    return this.db.dailyTaskItem.findMany({
      where: { taskSetId },
      orderBy: { priority: "asc" },
    });
  }

  async setTaskDone(itemId: string, done: boolean) {
    return this.db.dailyTaskItem.update({
      where: { id: itemId },
      data: { doneAt: done ? new Date() : null },
    });
  }

  async createCreative(input: {
    workspaceId: string;
    platform?: string;
    caption: string;
    hashtags: string[];
    reelScript: string;
    imagePrompt: string;
    imageUrl?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.generatedCreative.create({
      data: {
        workspaceId: input.workspaceId,
        platform: input.platform ?? "instagram",
        caption: input.caption,
        hashtags: input.hashtags,
        reelScript: input.reelScript,
        imagePrompt: input.imagePrompt,
        imageUrl: input.imageUrl ?? null,
        metadata: input.metadata ?? {},
      },
    });
  }

  async listCreatives(workspaceId: string, take = 30) {
    return this.db.generatedCreative.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async getOrCreateMainThread(workspaceId: string) {
    const existing = await this.db.osChatThread.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;
    return this.db.osChatThread.create({
      data: { workspaceId, title: "AI社員" },
    });
  }

  async addMessage(input: {
    threadId: string;
    role: string;
    content: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    await this.db.osChatThread.update({
      where: { id: input.threadId },
      data: { updatedAt: new Date() },
    });
    return this.db.osChatMessage.create({
      data: {
        threadId: input.threadId,
        role: input.role,
        content: input.content,
        metadata: input.metadata ?? {},
      },
    });
  }

  async listMessages(threadId: string, take = 80) {
    return this.db.osChatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take,
    });
  }

  async findBrief(workspaceId: string, dateKey: string) {
    return this.db.dailyBrief.findUnique({
      where: { workspaceId_dateKey: { workspaceId, dateKey } },
    });
  }

  async createBrief(input: {
    workspaceId: string;
    dateKey: string;
    threadId: string;
    messageId: string;
    content: string;
    payload?: Prisma.InputJsonValue;
  }) {
    return this.db.dailyBrief.create({
      data: {
        workspaceId: input.workspaceId,
        dateKey: input.dateKey,
        threadId: input.threadId,
        messageId: input.messageId,
        content: input.content,
        payload: input.payload ?? {},
      },
    });
  }
}

export class CustomerUserRepository {
  private get db() {
    return prisma;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async createCustomer(input: {
    email: string;
    name?: string;
    passwordHash: string;
    locale?: "ja" | "en";
  }): Promise<User> {
    return this.db.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name ?? null,
        passwordHash: input.passwordHash,
        kind: "customer",
        locale: input.locale ?? "ja",
        status: "active",
      },
    });
  }
}
