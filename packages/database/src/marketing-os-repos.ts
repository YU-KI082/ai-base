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
    // Neon HTTP: create+include uses unsupported transactions.
    const created = await this.db.workspace.create({
      data: {
        ownerUserId: input.ownerUserId,
        name: input.name,
      },
    });
    const full = await this.findById(created.id);
    if (!full) {
      throw new Error("Workspace create failed");
    }
    return full;
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
    // Neon HTTP: create+include uses unsupported transactions.
    await this.db.dailyTaskSet.create({
      data: { workspaceId, dateKey },
    });
    return this.db.dailyTaskSet.findUniqueOrThrow({
      where: { workspaceId_dateKey: { workspaceId, dateKey } },
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
    // Neon HTTP: createMany uses unsupported transactions — insert one by one.
    for (const [i, it] of items.entries()) {
      await this.db.dailyTaskItem.create({
        data: {
          taskSetId,
          title: it.title,
          detail: it.detail ?? "",
          category: it.category ?? "general",
          priority: it.priority ?? i,
          deepLink: it.deepLink ?? null,
        },
      });
    }
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

  async findPreviousBrief(workspaceId: string, beforeDateKey: string) {
    return this.db.dailyBrief.findFirst({
      where: { workspaceId, dateKey: { lt: beforeDateKey } },
      orderBy: { dateKey: "desc" },
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

  async updateBrief(
    id: string,
    data: {
      content: string;
      messageId?: string;
      payload?: Prisma.InputJsonValue;
    },
  ) {
    return this.db.dailyBrief.update({
      where: { id },
      data: {
        content: data.content,
        messageId: data.messageId,
        payload: data.payload,
      },
    });
  }

  async updateMessage(id: string, content: string, metadata?: Prisma.InputJsonValue) {
    return this.db.osChatMessage.update({
      where: { id },
      data: {
        content,
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });
  }

  async listImprovements(workspaceId: string, take = 20) {
    return this.db.osImprovementLog.findMany({
      where: { workspaceId },
      orderBy: [{ dateKey: "desc" }, { createdAt: "desc" }],
      take,
    });
  }

  async createImprovement(input: {
    workspaceId: string;
    dateKey: string;
    title: string;
    cause?: string;
    action?: string;
    result?: string;
    platform?: string | null;
    source?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.osImprovementLog.create({
      data: {
        workspaceId: input.workspaceId,
        dateKey: input.dateKey,
        title: input.title,
        cause: input.cause ?? "",
        action: input.action ?? "",
        result: input.result ?? "",
        platform: input.platform ?? null,
        source: input.source ?? "manual",
        metadata: input.metadata ?? {},
      },
    });
  }

  async getTaskItem(itemId: string) {
    return this.db.dailyTaskItem.findUnique({
      where: { id: itemId },
      include: { taskSet: true },
    });
  }

  async previousScore(workspaceId: string) {
    const rows = await this.db.aiScoreSnapshot.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    return { latest: rows[0] ?? null, previous: rows[1] ?? null };
  }

  async createPhotoSession(input: {
    workspaceId: string;
    originalUrl: string;
    mimeType?: string;
    width?: number | null;
    height?: number | null;
    fileName?: string | null;
    platformTarget?: string;
    analysis?: Prisma.InputJsonValue;
    brandPreset?: Prisma.InputJsonValue;
    shootAdvice?: Prisma.InputJsonValue;
    status?: string;
    provider?: string;
  }) {
    return this.db.osPhotoSession.create({
      data: {
        workspaceId: input.workspaceId,
        originalUrl: input.originalUrl,
        mimeType: input.mimeType ?? "image/jpeg",
        width: input.width ?? null,
        height: input.height ?? null,
        fileName: input.fileName ?? null,
        platformTarget: input.platformTarget ?? "instagram",
        analysis: input.analysis ?? {},
        brandPreset: input.brandPreset ?? {},
        shootAdvice: input.shootAdvice ?? [],
        status: input.status ?? "uploaded",
        provider: input.provider ?? "heuristic",
      },
    });
  }

  async getPhotoSession(id: string) {
    return this.db.osPhotoSession.findUnique({ where: { id } });
  }

  async listPhotoSessions(workspaceId: string, take = 20) {
    return this.db.osPhotoSession.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        status: true,
        platformTarget: true,
        fileName: true,
        createdAt: true,
        analysis: true,
        originalUrl: true,
      },
    });
  }

  async updatePhotoSession(
    id: string,
    data: {
      status?: string;
      enhancedUrl?: string | null;
      analysis?: Prisma.InputJsonValue;
      enhanceRecipe?: Prisma.InputJsonValue;
      shootAdvice?: Prisma.InputJsonValue;
      brandPreset?: Prisma.InputJsonValue;
      postVariants?: Prisma.InputJsonValue;
      predictions?: Prisma.InputJsonValue;
      platformTarget?: string;
      provider?: string;
    },
  ) {
    return this.db.osPhotoSession.update({
      where: { id },
      data,
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
