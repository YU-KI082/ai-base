import { createHash } from "node:crypto";
import type {
  ContentStatus,
  Locale,
  PricingModel,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { prisma } from "./client.js";

export type Db = PrismaClient;

export function createFingerprint(input: {
  homepageUrl: string;
  externalId?: string | null;
  sourceName: string;
}): string {
  const normalized = [
    input.sourceName.trim().toLowerCase(),
    (input.externalId ?? "").trim().toLowerCase(),
    input.homepageUrl.trim().toLowerCase().replace(/\/$/, ""),
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex");
}

export class OutboxRepository {
  constructor(private readonly db: Db = prisma) {}

  async enqueue(
    event: {
      id: string;
      topic: string;
      payload: Prisma.InputJsonValue;
      headers?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.db;
    return client.eventsOutbox.create({
      data: {
        id: event.id,
        topic: event.topic,
        payload: event.payload,
        headers: event.headers ?? {},
      },
    });
  }

  async markPublished(id: string) {
    return this.db.eventsOutbox.update({
      where: { id },
      data: { publishedAt: new Date(), lastError: null },
    });
  }

  async markFailed(id: string, error: string) {
    return this.db.eventsOutbox.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: error.slice(0, 2000),
      },
    });
  }

  /**
   * Unpublished rows eligible for relay (attempts below max).
   * Exhausted rows stay unpublished with lastError for DLQ inspection.
   */
  async listUnpublished(limit = 100, maxAttempts = 25) {
    return this.db.eventsOutbox.findMany({
      where: {
        publishedAt: null,
        attempts: { lt: maxAttempts },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async listDeadLetters(limit = 100, maxAttempts = 25) {
    return this.db.eventsOutbox.findMany({
      where: {
        publishedAt: null,
        attempts: { gte: maxAttempts },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }
}

export class EventConsumptionRepository {
  constructor(private readonly db: Db = prisma) {}

  async tryClaim(consumerGroup: string, eventId: string): Promise<boolean> {
    try {
      await this.db.eventConsumption.create({
        data: { consumerGroup, eventId },
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Release claim so Redis pending messages can retry after handler failure. */
  async releaseClaim(consumerGroup: string, eventId: string): Promise<void> {
    await this.db.eventConsumption.deleteMany({
      where: { consumerGroup, eventId },
    });
  }
}

export class AgentRepository {
  constructor(private readonly db: Db = prisma) {}

  async upsertRegistry(input: {
    key: string;
    name: string;
    version: string;
    capabilities: string[];
    subscribe: string[];
    publish: string[];
    config?: Prisma.InputJsonValue;
  }) {
    return this.db.agent.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        name: input.name,
        version: input.version,
        capabilities: input.capabilities,
        subscribe: input.subscribe,
        publish: input.publish,
        config: input.config ?? {},
        status: "active",
        lastHeartbeatAt: new Date(),
      },
      update: {
        name: input.name,
        version: input.version,
        capabilities: input.capabilities,
        subscribe: input.subscribe,
        publish: input.publish,
        ...(input.config ? { config: input.config } : {}),
        lastHeartbeatAt: new Date(),
      },
    });
  }

  async heartbeat(key: string) {
    return this.db.agent.update({
      where: { key },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  async list() {
    return this.db.agent.findMany({ orderBy: { key: "asc" } });
  }

  async setEnabled(key: string, enabled: boolean) {
    return this.db.agent.update({
      where: { key },
      data: { status: enabled ? "active" : "disabled" },
    });
  }

  async updateConfig(key: string, config: Prisma.InputJsonValue) {
    return this.db.agent.update({
      where: { key },
      data: { config },
    });
  }

  async findByKey(key: string) {
    return this.db.agent.findUnique({
      where: { key },
      include: {
        packageVersion: true,
        installation: true,
      },
    });
  }

  async linkPackageVersion(key: string, packageVersionId: string) {
    return this.db.agent.update({
      where: { key },
      data: { packageVersionId },
    });
  }
}

export class AgentRunRepository {
  constructor(private readonly db: Db = prisma) {}

  async start(input: {
    agentKey: string;
    agentId?: string;
    correlationId: string;
    causationId?: string;
    eventId?: string;
    workflowId?: string;
    input?: Prisma.InputJsonValue;
  }) {
    return this.db.agentRun.create({
      data: {
        agentKey: input.agentKey,
        agentId: input.agentId,
        correlationId: input.correlationId,
        causationId: input.causationId,
        eventId: input.eventId,
        workflowId: input.workflowId,
        input: input.input,
        status: "running",
        startedAt: new Date(),
      },
    });
  }

  async complete(
    id: string,
    output?: Prisma.InputJsonValue,
    usage?: { costUsd?: number; tokensIn?: number; tokensOut?: number },
  ) {
    return this.db.agentRun.update({
      where: { id },
      data: {
        status: "completed",
        output,
        costUsd: usage?.costUsd,
        tokensIn: usage?.tokensIn,
        tokensOut: usage?.tokensOut,
        finishedAt: new Date(),
      },
    });
  }

  async fail(id: string, error: string) {
    return this.db.agentRun.update({
      where: { id },
      data: {
        status: "failed",
        error: error.slice(0, 4000),
        finishedAt: new Date(),
      },
    });
  }

  async list(filters?: { agentKey?: string; status?: string; take?: number }) {
    return this.db.agentRun.findMany({
      where: {
        ...(filters?.agentKey ? { agentKey: filters.agentKey } : {}),
        ...(filters?.status
          ? { status: filters.status as never }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filters?.take ?? 50,
    });
  }
}

export class WorkflowRepository {
  constructor(private readonly db: Db = prisma) {}

  async create(input: {
    type: string;
    entityType: string;
    entityId?: string;
    correlationId: string;
    localeTargets?: Locale[];
    metadata?: Prisma.InputJsonValue;
    steps: Array<{ agentKey: string; stepKey: string }>;
  }) {
    return this.db.workflow.create({
      data: {
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        correlationId: input.correlationId,
        localeTargets: input.localeTargets ?? ["en", "ja"],
        metadata: input.metadata ?? {},
        workflowSteps: {
          create: input.steps.map((step) => ({
            agentKey: step.agentKey,
            stepKey: step.stepKey,
          })),
        },
      },
      include: { workflowSteps: true },
    });
  }

  async findByCorrelation(correlationId: string) {
    return this.db.workflow.findUnique({
      where: { correlationId },
      include: { workflowSteps: true, drafts: true },
    });
  }

  async findById(id: string) {
    return this.db.workflow.findUnique({
      where: { id },
      include: { workflowSteps: true, drafts: true, agentRuns: true },
    });
  }

  async list(take = 50) {
    return this.db.workflow.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: { workflowSteps: true },
    });
  }

  async setState(
    id: string,
    state:
      | "started"
      | "reviewing"
      | "writing"
      | "designing"
      | "translating"
      | "seo"
      | "pending_approval"
      | "approved"
      | "rejected"
      | "publishing"
      | "published"
      | "failed",
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.db;
    return client.workflow.update({
      where: { id },
      data: { state },
    });
  }

  async markStep(
    workflowId: string,
    stepKey: string,
    status: "pending" | "running" | "completed" | "failed" | "skipped",
    lastError?: string,
  ) {
    return this.db.workflowStep.update({
      where: { workflowId_stepKey: { workflowId, stepKey } },
      data: {
        status,
        attempt: { increment: status === "running" ? 1 : 0 },
        lastError,
        ...(status === "running" ? { startedAt: new Date() } : {}),
        ...(status === "completed" || status === "failed"
          ? { finishedAt: new Date() }
          : {}),
      },
    });
  }
}

export class DraftRepository {
  constructor(private readonly db: Db = prisma) {}

  async upsertBuilding(input: {
    id?: string;
    kind: "tool_page" | "comparison" | "news" | "article";
    payload: Prisma.InputJsonValue;
    toolId?: string;
    workflowId?: string;
    locale?: Locale | null;
  }) {
    if (input.id) {
      return this.db.draft.update({
        where: { id: input.id },
        data: {
          payload: input.payload,
          status: "building",
          toolId: input.toolId,
          workflowId: input.workflowId,
          locale: input.locale ?? null,
        },
      });
    }
    return this.db.draft.create({
      data: {
        kind: input.kind,
        payload: input.payload,
        status: "building",
        toolId: input.toolId,
        workflowId: input.workflowId,
        locale: input.locale ?? null,
      },
    });
  }

  async mergePayload(id: string, patch: Record<string, unknown>) {
    // Bound parameters ($1/$2) — not string interpolation. Unsafe API used only
    // because Prisma tagged templates cannot cast json parameters to jsonb cleanly.
    await this.db.$executeRawUnsafe(
      `UPDATE drafts
       SET payload = COALESCE(payload, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      JSON.stringify(patch),
      id,
    );
    return this.db.draft.findUniqueOrThrow({ where: { id } });
  }

  async setStatus(
    id: string,
    status: "building" | "pending_approval" | "approved" | "rejected" | "published",
  ) {
    return this.db.draft.update({ where: { id }, data: { status } });
  }

  async findById(id: string) {
    return this.db.draft.findUnique({
      where: { id },
      include: { approvals: true, tool: true, workflow: true },
    });
  }

  async list(status?: string) {
    return this.db.draft.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { updatedAt: "desc" },
      include: { workflow: true, tool: true },
      take: 100,
    });
  }

  async findByWorkflow(workflowId: string) {
    return this.db.draft.findFirst({
      where: { workflowId },
      orderBy: { version: "desc" },
    });
  }
}

export class ApprovalRepository {
  constructor(private readonly db: Db = prisma) {}

  async decide(
    input: {
      draftId: string;
      decision: "approved" | "rejected";
      reviewerId?: string;
      comment?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient | Db) => {
      const approval = await client.approval.create({
        data: {
          draftId: input.draftId,
          decision: input.decision,
          reviewerId: input.reviewerId,
          comment: input.comment,
        },
      });
      await client.draft.update({
        where: { id: input.draftId },
        data: {
          status: input.decision === "approved" ? "approved" : "rejected",
        },
      });
      return approval;
    };
    if (tx) return run(tx);
    return this.db.$transaction((inner) => run(inner));
  }
}

export class CandidateRepository {
  constructor(private readonly db: Db = prisma) {}

  async createIfNew(input: {
    name: string;
    homepageUrl: string;
    sourceName: string;
    sourceUrl?: string;
    externalId?: string;
    description?: string;
    raw?: Prisma.InputJsonValue;
    workflowId?: string;
  }) {
    const fingerprint = createFingerprint({
      homepageUrl: input.homepageUrl,
      externalId: input.externalId,
      sourceName: input.sourceName,
    });
    const existing = await this.db.toolCandidate.findUnique({
      where: { fingerprint },
    });
    if (existing) return { candidate: existing, created: false };
    const candidate = await this.db.toolCandidate.create({
      data: {
        name: input.name,
        homepageUrl: input.homepageUrl,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        externalId: input.externalId,
        description: input.description,
        raw: input.raw ?? {},
        fingerprint,
        workflowId: input.workflowId,
      },
    });
    return { candidate, created: true };
  }

  async findById(id: string) {
    return this.db.toolCandidate.findUnique({ where: { id } });
  }

  async setStatus(id: string, status: string, workflowId?: string) {
    return this.db.toolCandidate.update({
      where: { id },
      data: { status, ...(workflowId ? { workflowId } : {}) },
    });
  }
}

export class ToolRepository {
  constructor(private readonly db: Db = prisma) {}

  async findBySlug(slug: string) {
    return this.db.aiTool.findUnique({
      where: { slug },
      include: {
        translations: true,
        media: true,
        categories: { include: { category: { include: { translations: true } } } },
        affiliateLinks: true,
      },
    });
  }

  async findById(id: string) {
    return this.db.aiTool.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        homepageUrl: true,
        affiliateLinks: {
          where: { isHealthy: true },
          orderBy: { priority: "desc" },
          take: 3,
        },
      },
    });
  }

  async findPublished(
    locale?: Locale,
    options?: {
      take?: number;
      skip?: number;
      categoryKey?: string;
      q?: string;
    },
  ) {
    const take = Math.min(Math.max(options?.take ?? 50, 1), 200);
    const skip = Math.max(options?.skip ?? 0, 0);
    const q = options?.q?.trim();
    return this.db.aiTool.findMany({
      where: {
        status: "published",
        ...(options?.categoryKey
          ? {
              categories: {
                some: { category: { key: options.categoryKey } },
              },
            }
          : {}),
        ...(q
          ? {
              translations: {
                some: {
                  ...(locale ? { locale } : {}),
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            }
          : {}),
      },
      include: {
        translations: locale ? { where: { locale } } : true,
        categories: {
          include: { category: { include: { translations: true } } },
        },
        affiliateLinks: { where: { isHealthy: true }, orderBy: { priority: "desc" } },
      },
      orderBy: { publishedAt: "desc" },
      take,
      skip,
    });
  }

  async findPublishedBySlugs(slugs: string[], locale?: Locale) {
    if (slugs.length === 0) return [];
    return this.db.aiTool.findMany({
      where: { status: "published", slug: { in: slugs } },
      include: {
        translations: locale ? { where: { locale } } : true,
        categories: {
          include: { category: { include: { translations: true } } },
        },
        affiliateLinks: {
          where: { isHealthy: true },
          orderBy: { priority: "desc" },
        },
      },
    });
  }

  async listPublishedSlugs() {
    return this.db.aiTool.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });
  }

  async findSimilar(input: {
    slug: string;
    categoryKeys: string[];
    locale?: Locale;
    take?: number;
  }) {
    const take = Math.min(Math.max(input.take ?? 8, 1), 24);
    return this.db.aiTool.findMany({
      where: {
        status: "published",
        slug: { not: input.slug },
        ...(input.categoryKeys.length
          ? {
              categories: {
                some: { category: { key: { in: input.categoryKeys } } },
              },
            }
          : {}),
      },
      include: {
        translations: input.locale ? { where: { locale: input.locale } } : true,
        affiliateLinks: {
          where: { isHealthy: true },
          orderBy: { priority: "desc" },
        },
      },
      orderBy: { publishedAt: "desc" },
      take,
    });
  }

  async listAll(take = 200) {
    return this.db.aiTool.findMany({
      include: {
        translations: true,
        categories: { include: { category: true } },
        affiliateLinks: { orderBy: { priority: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }

  async upsertAdmin(input: {
    id?: string;
    slug: string;
    homepageUrl: string;
    pricingModel: PricingModel;
    hasFreePlan: boolean;
    hasApi: boolean;
    status?: string;
    categoryKey?: string;
    ja: {
      name: string;
      description: string;
      features?: string[];
      pros?: string[];
      cons?: string[];
      tags?: string[];
      useCases?: string[];
      recommendedUsers?: string[];
      languageSupport?: string[];
      pricingNotes?: string;
    };
    en?: {
      name: string;
      description: string;
      features?: string[];
      pros?: string[];
      cons?: string[];
      tags?: string[];
      useCases?: string[];
      recommendedUsers?: string[];
      languageSupport?: string[];
      pricingNotes?: string;
    };
  }) {
    const status = (input.status as ContentStatus | undefined) ?? "published";
    const tool = input.id
      ? await this.db.aiTool.update({
          where: { id: input.id },
          data: {
            slug: input.slug,
            homepageUrl: input.homepageUrl,
            pricingModel: input.pricingModel,
            hasFreePlan: input.hasFreePlan,
            hasApi: input.hasApi,
            status,
            publishedAt: status === "published" ? new Date() : null,
          },
        })
      : await this.db.aiTool.create({
          data: {
            slug: input.slug,
            homepageUrl: input.homepageUrl,
            pricingModel: input.pricingModel,
            hasFreePlan: input.hasFreePlan,
            hasApi: input.hasApi,
            status,
            publishedAt: status === "published" ? new Date() : null,
            sourceName: "admin",
          },
        });

    for (const locale of ["ja", "en"] as const) {
      const tr = locale === "ja" ? input.ja : input.en ?? input.ja;
      await this.db.aiToolTranslation.upsert({
        where: { toolId_locale: { toolId: tool.id, locale } },
        create: {
          toolId: tool.id,
          locale,
          name: tr.name,
          description: tr.description,
          features: tr.features ?? [],
          pros: tr.pros ?? [],
          cons: tr.cons ?? [],
          tags: tr.tags ?? [],
          useCases: tr.useCases ?? [],
          recommendedUsers: tr.recommendedUsers ?? [],
          languageSupport: tr.languageSupport ?? [],
          pricingNotes: tr.pricingNotes,
          seoTitle: `${tr.name} | AI BASE`,
          seoDescription: tr.description.slice(0, 155),
        },
        update: {
          name: tr.name,
          description: tr.description,
          features: tr.features ?? [],
          pros: tr.pros ?? [],
          cons: tr.cons ?? [],
          tags: tr.tags ?? [],
          useCases: tr.useCases ?? [],
          recommendedUsers: tr.recommendedUsers ?? [],
          languageSupport: tr.languageSupport ?? [],
          pricingNotes: tr.pricingNotes,
          seoTitle: `${tr.name} | AI BASE`,
          seoDescription: tr.description.slice(0, 155),
        },
      });
    }

    if (input.categoryKey) {
      const category = await this.db.category.findUnique({
        where: { key: input.categoryKey },
      });
      if (category) {
        await this.db.aiToolCategory.upsert({
          where: {
            toolId_categoryId: { toolId: tool.id, categoryId: category.id },
          },
          create: { toolId: tool.id, categoryId: category.id },
          update: {},
        });
      }
    }

    return tool;
  }

  async deleteById(id: string) {
    return this.db.aiTool.delete({ where: { id } });
  }

  async findDuplicate(homepageUrl: string, externalId?: string | null) {
    return this.db.aiTool.findFirst({
      where: {
        OR: [
          { homepageUrl },
          ...(externalId ? [{ externalId }] : []),
        ],
      },
    });
  }

  async publishFromDraft(input: {
    slug: string;
    homepageUrl: string;
    logoUrl?: string;
    pricingModel?: "free" | "freemium" | "paid" | "enterprise" | "unknown";
    hasFreePlan?: boolean;
    hasApi?: boolean;
    commercialUse?: boolean | null;
    sourceUrl?: string;
    sourceName?: string;
    externalId?: string;
    categoryKeys?: string[];
    translations: Array<{
      locale: Locale;
      name: string;
      description: string;
      features?: unknown;
      pros?: unknown;
      cons?: unknown;
      languageSupport?: unknown;
      seoTitle?: string;
      seoDescription?: string;
      faq?: unknown;
      schemaJson?: unknown;
    }>;
    media?: Array<{ type: "screenshot" | "video" | "logo" | "ogp" | "thumbnail"; url: string; alt?: string }>;
  }) {
    return this.db.$transaction(async (tx) => {
      const tool = await tx.aiTool.upsert({
        where: { slug: input.slug },
        create: {
          slug: input.slug,
          homepageUrl: input.homepageUrl,
          logoUrl: input.logoUrl,
          pricingModel: input.pricingModel ?? "unknown",
          hasFreePlan: input.hasFreePlan ?? false,
          hasApi: input.hasApi ?? false,
          commercialUse: input.commercialUse ?? null,
          sourceUrl: input.sourceUrl,
          sourceName: input.sourceName,
          externalId: input.externalId,
          status: "published",
          publishedAt: new Date(),
        },
        update: {
          homepageUrl: input.homepageUrl,
          logoUrl: input.logoUrl,
          pricingModel: input.pricingModel ?? "unknown",
          hasFreePlan: input.hasFreePlan ?? false,
          hasApi: input.hasApi ?? false,
          commercialUse: input.commercialUse ?? null,
          sourceUrl: input.sourceUrl,
          sourceName: input.sourceName,
          externalId: input.externalId,
          status: "published",
          publishedAt: new Date(),
        },
      });

      for (const t of input.translations) {
        await tx.aiToolTranslation.upsert({
          where: { toolId_locale: { toolId: tool.id, locale: t.locale } },
          create: {
            toolId: tool.id,
            locale: t.locale,
            name: t.name,
            description: t.description,
            features: (t.features as Prisma.InputJsonValue) ?? [],
            pros: (t.pros as Prisma.InputJsonValue) ?? [],
            cons: (t.cons as Prisma.InputJsonValue) ?? [],
            languageSupport: (t.languageSupport as Prisma.InputJsonValue) ?? [],
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            faq: (t.faq as Prisma.InputJsonValue) ?? [],
            schemaJson: (t.schemaJson as Prisma.InputJsonValue) ?? undefined,
          },
          update: {
            name: t.name,
            description: t.description,
            features: (t.features as Prisma.InputJsonValue) ?? [],
            pros: (t.pros as Prisma.InputJsonValue) ?? [],
            cons: (t.cons as Prisma.InputJsonValue) ?? [],
            languageSupport: (t.languageSupport as Prisma.InputJsonValue) ?? [],
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            faq: (t.faq as Prisma.InputJsonValue) ?? [],
            schemaJson: (t.schemaJson as Prisma.InputJsonValue) ?? undefined,
          },
        });
      }

      if (input.media?.length) {
        await tx.aiToolMedia.deleteMany({ where: { toolId: tool.id } });
        await tx.aiToolMedia.createMany({
          data: input.media.map((m, i) => ({
            toolId: tool.id,
            type: m.type,
            url: m.url,
            alt: m.alt,
            sortOrder: i,
          })),
        });
      }

      if (input.categoryKeys?.length) {
        const categories = await tx.category.findMany({
          where: { key: { in: input.categoryKeys } },
        });
        await tx.aiToolCategory.deleteMany({ where: { toolId: tool.id } });
        if (categories.length) {
          await tx.aiToolCategory.createMany({
            data: categories.map((c) => ({ toolId: tool.id, categoryId: c.id })),
          });
        }
      }

      return tool;
    });
  }
}

export class LogRepository {
  constructor(private readonly db: Db = prisma) {}

  async write(input: {
    level: string;
    source: string;
    message: string;
    context?: Prisma.InputJsonValue;
    correlationId?: string;
  }) {
    return this.db.logEntry.create({
      data: {
        level: input.level,
        source: input.source,
        message: input.message,
        context: input.context ?? {},
        correlationId: input.correlationId,
      },
    });
  }

  async list(take = 100) {
    return this.db.logEntry.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}

export class CategoryRepository {
  constructor(private readonly db: Db = prisma) {}

  async list(locale?: Locale) {
    return this.db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        translations: locale ? { where: { locale } } : true,
      },
    });
  }

  async findByKey(key: string, locale?: Locale) {
    return this.db.category.findUnique({
      where: { key },
      include: {
        translations: locale ? { where: { locale } } : true,
      },
    });
  }

  async upsert(input: {
    key: string;
    sortOrder?: number;
    jaName: string;
    enName?: string;
    jaDescription?: string;
  }) {
    const category = await this.db.category.upsert({
      where: { key: input.key },
      create: { key: input.key, sortOrder: input.sortOrder ?? 100 },
      update: { sortOrder: input.sortOrder ?? undefined },
    });
    for (const locale of ["ja", "en"] as const) {
      const name = locale === "ja" ? input.jaName : input.enName ?? input.jaName;
      await this.db.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: category.id, locale } },
        create: {
          categoryId: category.id,
          locale,
          name,
          slug: input.key,
          description: locale === "ja" ? input.jaDescription : undefined,
        },
        update: {
          name,
          description: locale === "ja" ? input.jaDescription : undefined,
        },
      });
    }
    return category;
  }

  async deleteByKey(key: string) {
    return this.db.category.delete({ where: { key } });
  }
}

export class ArticleRepository {
  constructor(private readonly db: Db = prisma) {}

  async findBySlug(slug: string) {
    return this.db.article.findUnique({
      where: { slug },
      include: { translations: true },
    });
  }

  async listPublished(locale?: Locale, take = 50) {
    return this.db.article.findMany({
      where: { status: "published" },
      include: {
        translations: locale ? { where: { locale } } : true,
      },
      orderBy: { publishedAt: "desc" },
      take,
    });
  }

  async listAll(take = 100) {
    return this.db.article.findMany({
      include: { translations: true },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }

  async listPublishedSlugs() {
    return this.db.article.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });
  }

  async upsert(input: {
    id?: string;
    slug: string;
    kind: string;
    status?: string;
    ja: { title: string; summary: string; body: string };
    en?: { title: string; summary: string; body: string };
  }) {
    const status = (input.status as ContentStatus | undefined) ?? "published";
    const article = input.id
      ? await this.db.article.update({
          where: { id: input.id },
          data: {
            slug: input.slug,
            kind: input.kind,
            status,
            publishedAt: status === "published" ? new Date() : null,
          },
        })
      : await this.db.article.create({
          data: {
            slug: input.slug,
            kind: input.kind,
            status,
            publishedAt: status === "published" ? new Date() : null,
          },
        });

    for (const locale of ["ja", "en"] as const) {
      const tr = locale === "ja" ? input.ja : input.en ?? input.ja;
      await this.db.articleTranslation.upsert({
        where: { articleId_locale: { articleId: article.id, locale } },
        create: {
          articleId: article.id,
          locale,
          title: tr.title,
          summary: tr.summary,
          body: tr.body,
          seoTitle: `${tr.title} | AI BASE`,
          seoDescription: tr.summary.slice(0, 155),
        },
        update: {
          title: tr.title,
          summary: tr.summary,
          body: tr.body,
          seoTitle: `${tr.title} | AI BASE`,
          seoDescription: tr.summary.slice(0, 155),
        },
      });
    }
    return article;
  }

  async deleteById(id: string) {
    return this.db.article.delete({ where: { id } });
  }
}

export class AffiliateRepository {
  constructor(private readonly db: Db = prisma) {}

  async list(toolId?: string) {
    return this.db.affiliateLink.findMany({
      where: toolId ? { toolId } : undefined,
      include: { tool: { select: { id: true, slug: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  async findById(id: string) {
    return this.db.affiliateLink.findUnique({
      where: { id },
      include: { tool: true },
    });
  }

  async create(input: {
    toolId: string;
    label: string;
    url: string;
    network?: string;
    commission?: string;
    priority?: number;
    isHealthy?: boolean;
  }) {
    return this.db.affiliateLink.create({
      data: {
        toolId: input.toolId,
        label: input.label,
        url: input.url,
        network: input.network,
        commission: input.commission,
        priority: input.priority ?? 0,
        isHealthy: input.isHealthy ?? true,
      },
    });
  }

  async update(
    id: string,
    data: {
      label?: string;
      url?: string;
      network?: string | null;
      commission?: string | null;
      priority?: number;
      isHealthy?: boolean;
    },
  ) {
    return this.db.affiliateLink.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.db.affiliateLink.delete({ where: { id } });
  }
}

export class AffiliateIntelRepository {
  constructor(private readonly db: Db = prisma) {}

  async ensureForTool(input: {
    toolId: string;
    homepageUrl?: string | null;
    leads: Array<{
      aspKey: string;
      aspLabel: string;
      status?: string;
      notes?: string;
      proposedBy?: string;
    }>;
  }) {
    const existing = await this.db.affiliateIntelligence.findUnique({
      where: { toolId: input.toolId },
      include: { leads: true },
    });
    if (existing) return existing;

    return this.db.affiliateIntelligence.create({
      data: {
        toolId: input.toolId,
        status: "uninvestigated",
        hasAffiliate: null,
        homepageUrl: input.homepageUrl ?? null,
        notes: "アフィリエイト未確認 — AIが調査対象ASPを提案",
        leads: {
          create: input.leads.map((l) => ({
            toolId: input.toolId,
            aspKey: l.aspKey,
            aspLabel: l.aspLabel,
            status: l.status ?? "uninvestigated",
            notes: l.notes,
            proposedBy: l.proposedBy ?? "agent",
          })),
        },
      },
      include: { leads: true },
    });
  }

  async listIntelligence() {
    return this.db.affiliateIntelligence.findMany({
      include: {
        tool: {
          include: {
            translations: { where: { locale: "en" }, take: 1 },
            affiliateLinks: { orderBy: { priority: "desc" } },
          },
        },
        leads: { orderBy: { aspKey: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async updateIntelligence(
    id: string,
    data: Prisma.AffiliateIntelligenceUpdateInput,
  ) {
    return this.db.affiliateIntelligence.update({ where: { id }, data });
  }

  async updateLead(id: string, data: Prisma.AffiliateAspLeadUpdateInput) {
    return this.db.affiliateAspLead.update({ where: { id }, data });
  }

  async findLead(id: string) {
    return this.db.affiliateAspLead.findUnique({ where: { id } });
  }

  async createConversion(input: {
    toolId: string;
    amountUsd: number;
    occurredAt: Date;
    affiliateLinkId?: string | null;
    aspKey?: string | null;
    source?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.affiliateConversion.create({
      data: {
        toolId: input.toolId,
        amountUsd: input.amountUsd,
        occurredAt: input.occurredAt,
        affiliateLinkId: input.affiliateLinkId ?? null,
        aspKey: input.aspKey ?? null,
        source: input.source ?? "manual",
        metadata: input.metadata ?? {},
      },
    });
  }

  async listConversions(toolId?: string) {
    return this.db.affiliateConversion.findMany({
      where: toolId ? { toolId } : undefined,
      orderBy: { occurredAt: "desc" },
      take: 500,
    });
  }

  async countClicks(toolId?: string) {
    const events = await this.db.analyticsEvent.findMany({
      where: { name: "affiliate.click" },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    if (!toolId) return events.length;
    return events.filter((e) => {
      const props = e.properties as { toolId?: string } | null;
      return props?.toolId === toolId;
    }).length;
  }

  async performanceByTool() {
    const [intel, conversions, clickEvents] = await Promise.all([
      this.listIntelligence(),
      this.listConversions(),
      this.db.analyticsEvent.findMany({
        where: { name: "affiliate.click" },
        take: 5000,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const clicksByTool = new Map<string, number>();
    for (const ev of clickEvents) {
      const props = ev.properties as { toolId?: string } | null;
      const id = props?.toolId;
      if (!id) continue;
      clicksByTool.set(id, (clicksByTool.get(id) ?? 0) + 1);
    }

    const convByTool = new Map<string, { count: number; revenue: number }>();
    for (const c of conversions) {
      const cur = convByTool.get(c.toolId) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(c.amountUsd);
      convByTool.set(c.toolId, cur);
    }

    return intel.map((row) => {
      const clicks = clicksByTool.get(row.toolId) ?? 0;
      const conv = convByTool.get(row.toolId) ?? { count: 0, revenue: 0 };
      return {
        intelligence: row,
        clicks,
        conversions: conv.count,
        revenue: conv.revenue,
      };
    });
  }
}

export class ComparisonRepository {
  constructor(private readonly db: Db = prisma) {}

  async findPublished(locale?: Locale) {
    return this.db.comparison.findMany({
      where: { status: "published" },
      include: {
        translations: locale ? { where: { locale } } : true,
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            tool: {
              include: {
                translations: locale ? { where: { locale } } : true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findBySlug(slug: string, locale?: Locale) {
    return this.db.comparison.findUnique({
      where: { slug },
      include: {
        translations: locale ? { where: { locale } } : true,
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            tool: {
              include: {
                translations: locale ? { where: { locale } } : true,
                affiliateLinks: {
                  where: { isHealthy: true },
                  orderBy: { priority: "desc" },
                },
              },
            },
          },
        },
      },
    });
  }

  async upsertPublished(input: {
    slug: string;
    toolIds: string[];
    translations: Array<{
      locale: Locale;
      title: string;
      summary: string;
      recommendation?: string;
    }>;
  }) {
    return this.db.$transaction(async (tx) => {
      const comparison = await tx.comparison.upsert({
        where: { slug: input.slug },
        create: { slug: input.slug, status: "published" },
        update: { status: "published" },
      });
      for (const t of input.translations) {
        await tx.comparisonTranslation.upsert({
          where: {
            comparisonId_locale: {
              comparisonId: comparison.id,
              locale: t.locale,
            },
          },
          create: {
            comparisonId: comparison.id,
            locale: t.locale,
            title: t.title,
            summary: t.summary,
            recommendation: t.recommendation,
          },
          update: {
            title: t.title,
            summary: t.summary,
            recommendation: t.recommendation,
          },
        });
      }
      await tx.comparisonItem.deleteMany({ where: { comparisonId: comparison.id } });
      await tx.comparisonItem.createMany({
        data: input.toolIds.map((toolId, i) => ({
          comparisonId: comparison.id,
          toolId,
          side: i === 0 ? "left" : i === 1 ? "right" : `item-${i}`,
          sortOrder: i,
        })),
      });
      return comparison;
    });
  }
}

export class SocialPostRepository {
  constructor(private readonly db: Db = prisma) {}

  async list(status?: string) {
    return this.db.socialPost.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        metrics: { orderBy: { capturedAt: "desc" }, take: 6 },
        scores: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  async findById(id: string) {
    return this.db.socialPost.findUnique({
      where: { id },
      include: {
        metrics: { orderBy: { capturedAt: "desc" } },
        scores: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async listPublishedForFeedback(windowHours: number) {
    const minAgeMs = windowHours * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - minAgeMs);
    return this.db.socialPost.findMany({
      where: {
        status: "published",
        publishedAt: { lte: cutoff },
      },
      include: {
        metrics: true,
      },
      take: 50,
      orderBy: { publishedAt: "desc" },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.db.socialPost.update({
      where: { id },
      data: {
        status,
        ...(status === "published" ? { publishedAt: new Date() } : {}),
      },
    });
  }

  async createDraft(data: Prisma.SocialPostCreateInput) {
    return this.db.socialPost.create({ data });
  }

  async applyScore(
    id: string,
    input: {
      scoreTotal: number;
      scoreBreakdown: Prisma.InputJsonValue;
      riskFlags: string[];
      status?: string;
    },
  ) {
    return this.db.socialPost.update({
      where: { id },
      data: {
        scoreTotal: input.scoreTotal,
        scoreBreakdown: input.scoreBreakdown,
        riskFlags: input.riskFlags,
        ...(input.status ? { status: input.status } : {}),
      },
    });
  }

  async markExternalPublished(
    id: string,
    input: { externalPostId: string; publishedAt?: Date },
  ) {
    return this.db.socialPost.update({
      where: { id },
      data: {
        status: "published",
        externalPostId: input.externalPostId,
        publishedAt: input.publishedAt ?? new Date(),
        lastPublishError: null,
      },
    });
  }

  async markPublishOutcome(
    id: string,
    input: {
      status: string;
      lastPublishError?: string | null;
      externalPostId?: string | null;
    },
  ) {
    return this.db.socialPost.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.lastPublishError !== undefined
          ? { lastPublishError: input.lastPublishError }
          : {}),
        ...(input.externalPostId !== undefined
          ? { externalPostId: input.externalPostId }
          : {}),
      },
    });
  }

  async saveAutoDecision(
    id: string,
    input: { contentHash: string; autoDecision: Prisma.InputJsonValue },
  ) {
    return this.db.socialPost.update({
      where: { id },
      data: {
        contentHash: input.contentHash,
        autoDecision: input.autoDecision,
      },
    });
  }

  async listDraftsForAutoOps(take = 30) {
    return this.db.socialPost.findMany({
      where: {
        status: { in: ["draft", "pending_approval", "ready", "retry", "scheduled"] },
        platform: { in: ["instagram", "tiktok", "x", "threads", "note"] },
      },
      orderBy: [{ scoreTotal: "desc" }, { createdAt: "asc" }],
      take,
    });
  }

  async listTikTokPublishedForLearning(take = 40) {
    return this.db.socialPost.findMany({
      where: { platform: "tiktok", status: "published" },
      include: {
        metrics: { orderBy: { capturedAt: "desc" }, take: 3 },
      },
      orderBy: { publishedAt: "desc" },
      take,
    });
  }

  async countPublishedSince(since: Date) {
    return this.db.socialPost.count({
      where: {
        status: "published",
        publishedAt: { gte: since },
      },
    });
  }

  async lastPublishedAt(platform: string) {
    const row = await this.db.socialPost.findFirst({
      where: { platform, status: "published", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { publishedAt: true },
    });
    return row?.publishedAt ?? null;
  }

  async listRecentContents(take = 40) {
    return this.db.socialPost.findMany({
      where: { status: { in: ["published", "ready", "draft"] } },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, content: true, contentHash: true },
    });
  }

  async incrementPublishAttempts(id: string) {
    return this.db.socialPost.update({
      where: { id },
      data: { publishAttempts: { increment: 1 } },
    });
  }

  async updateMedia(id: string, mediaUrl: string | null) {
    return this.db.socialPost.update({
      where: { id },
      data: { mediaUrl },
    });
  }

  async setScheduledAt(id: string, scheduledAt: Date | null) {
    return this.db.socialPost.update({
      where: { id },
      data: { scheduledAt, ...(scheduledAt ? { status: "scheduled" } : {}) },
    });
  }

  async findByExternalPostId(externalPostId: string) {
    return this.db.socialPost.findFirst({ where: { externalPostId } });
  }
}

export class SettingsRepository {
  constructor(private readonly db: Db = prisma) {}

  async getJson(key: string): Promise<unknown | null> {
    const row = await this.db.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async upsertJson(key: string, value: Prisma.InputJsonValue) {
    return this.db.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

export class OpsAlertRepository {
  constructor(private readonly db: Db = prisma) {}

  async create(input: {
    severity?: string;
    kind: string;
    title: string;
    message: string;
    provider?: string;
    socialPostId?: string;
    toolId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.opsAlert.create({
      data: {
        severity: input.severity ?? "critical",
        kind: input.kind,
        title: input.title,
        message: input.message,
        provider: input.provider,
        socialPostId: input.socialPostId,
        toolId: input.toolId,
        metadata: input.metadata ?? {},
      },
    });
  }

  async listOpen(take = 20) {
    return this.db.opsAlert.findMany({
      where: { acknowledgedAt: null },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async acknowledge(id: string) {
    return this.db.opsAlert.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }
}

export class SelfHealingRepository {
  constructor(private readonly db: Db = prisma) {}

  async createIncident(input: {
    fingerprint: string;
    title: string;
    message: string;
    kind: string;
    severity?: string;
    location?: string;
    cause?: string;
    requiresApproval?: boolean;
    maxAttempts?: number;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.selfHealingIncident.create({
      data: {
        fingerprint: input.fingerprint,
        title: input.title,
        message: input.message,
        kind: input.kind,
        severity: input.severity ?? "medium",
        location: input.location,
        cause: input.cause,
        requiresApproval: input.requiresApproval ?? false,
        maxAttempts: input.maxAttempts ?? 3,
        metadata: input.metadata ?? {},
        status: "detected",
      },
    });
  }

  async getById(id: string) {
    return this.db.selfHealingIncident.findUnique({
      where: { id },
      include: { attempts: { orderBy: { attemptNumber: "asc" } } },
    });
  }

  async findOpenByFingerprint(fingerprint: string) {
    return this.db.selfHealingIncident.findFirst({
      where: {
        fingerprint,
        status: { notIn: ["healed", "failed", "stopped"] },
        acknowledgedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: { attempts: { orderBy: { attemptNumber: "asc" } } },
    });
  }

  async updateIncident(
    id: string,
    data: {
      status?: string;
      cause?: string;
      attemptCount?: number;
      requiresApproval?: boolean;
      proposedFix?: Prisma.InputJsonValue;
      changedFiles?: string[];
      testResults?: Prisma.InputJsonValue;
      rollbackResult?: Prisma.InputJsonValue;
      diffBefore?: Prisma.InputJsonValue;
      healedAt?: Date | null;
      acknowledgedAt?: Date | null;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return this.db.selfHealingIncident.update({ where: { id }, data });
  }

  async addAttempt(input: {
    incidentId: string;
    attemptNumber: number;
    action: string;
    success: boolean;
    changedFiles?: string[];
    diff?: Prisma.InputJsonValue;
    testResults?: Prisma.InputJsonValue;
    errorMessage?: string;
  }) {
    return this.db.selfHealingAttempt.create({
      data: {
        incidentId: input.incidentId,
        attemptNumber: input.attemptNumber,
        action: input.action,
        success: input.success,
        changedFiles: input.changedFiles ?? [],
        diff: input.diff,
        testResults: input.testResults,
        errorMessage: input.errorMessage,
      },
    });
  }

  async listOpen(take = 50) {
    return this.db.selfHealingIncident.findMany({
      where: { status: { notIn: ["healed"] }, acknowledgedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      include: { attempts: { orderBy: { attemptNumber: "asc" } } },
    });
  }

  async listHistory(take = 30) {
    return this.db.selfHealingIncident.findMany({
      orderBy: { updatedAt: "desc" },
      take,
      include: { attempts: { orderBy: { attemptNumber: "asc" } } },
    });
  }

  async acknowledge(id: string) {
    return this.db.selfHealingIncident.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }
}

export class OpsMetricsRepository {
  constructor(private readonly db: Db = prisma) {}

  async salesSummary() {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayConv, monthConv, monthRows] = await Promise.all([
      this.db.affiliateConversion.aggregate({
        where: { occurredAt: { gte: startToday } },
        _sum: { amountUsd: true },
        _count: true,
      }),
      this.db.affiliateConversion.aggregate({
        where: { occurredAt: { gte: startMonth } },
        _sum: { amountUsd: true },
        _count: true,
      }),
      this.db.affiliateConversion.groupBy({
        by: ["toolId"],
        where: { occurredAt: { gte: startMonth } },
        _sum: { amountUsd: true },
        _count: true,
      }),
    ]);

    const allRecent = [...monthRows].sort(
      (a, b) => Number(b._sum.amountUsd ?? 0) - Number(a._sum.amountUsd ?? 0),
    );

    const topToolId = allRecent[0]?.toolId ?? null;
    let topToolName: string | null = null;
    if (topToolId) {
      const tool = await this.db.aiTool.findUnique({
        where: { id: topToolId },
        include: { translations: { where: { locale: "ja" }, take: 1 } },
      });
      topToolName = tool?.translations[0]?.name ?? tool?.slug ?? topToolId;
    }

    const topPost = await this.db.socialPost.findFirst({
      where: {
        status: "published",
        metrics: { some: { OR: [{ revenue: { gt: 0 } }, { conversions: { gt: 0 } }] } },
      },
      include: {
        metrics: { orderBy: { capturedAt: "desc" }, take: 1 },
      },
      orderBy: { publishedAt: "desc" },
    });

    // Prefer post with highest revenue in metrics
    const postsWithRev = await this.db.snsPostMetrics.findMany({
      where: { revenue: { not: null } },
      orderBy: { revenue: "desc" },
      take: 1,
      include: { socialPost: true },
    });

    const monthRevenue = Number(monthConv._sum.amountUsd ?? 0);
    // Profit placeholder: revenue * 0.7 until cost model exists
    const monthProfit = monthRevenue * 0.7;

    return {
      todaySales: Number(todayConv._sum.amountUsd ?? 0),
      monthSales: monthRevenue,
      monthProfit,
      conversionsMonth: monthConv._count,
      conversionsToday: todayConv._count,
      topToolId,
      topToolName,
      topPost: postsWithRev[0]
        ? {
            id: postsWithRev[0].socialPostId,
            platform: postsWithRev[0].socialPost.platform,
            revenue: Number(postsWithRev[0].revenue ?? 0),
            content: postsWithRev[0].socialPost.content.slice(0, 120),
          }
        : topPost
          ? {
              id: topPost.id,
              platform: topPost.platform,
              revenue: Number(topPost.metrics[0]?.revenue ?? 0),
              content: topPost.content.slice(0, 120),
            }
          : null,
    };
  }
}

export class SnsOAuthConnectionRepository {
  constructor(private readonly db: Db = prisma) {}

  async list() {
    return this.db.snsOAuthConnection.findMany({
      orderBy: { provider: "asc" },
    });
  }

  async findByProvider(provider: string) {
    return this.db.snsOAuthConnection.findUnique({ where: { provider } });
  }

  async upsertConnection(
    provider: string,
    data: Prisma.SnsOAuthConnectionUncheckedUpdateInput & {
      accessTokenCipher?: string | null;
      refreshTokenCipher?: string | null;
    },
  ) {
    return this.db.snsOAuthConnection.upsert({
      where: { provider },
      create: {
        provider,
        status: String(data.status ?? "connected"),
        externalAccountId: (data.externalAccountId as string | null) ?? null,
        accountLabel: (data.accountLabel as string | null) ?? null,
        scopes: (data.scopes as string[]) ?? [],
        accessTokenCipher: data.accessTokenCipher ?? null,
        refreshTokenCipher: data.refreshTokenCipher ?? null,
        accessTokenExpiresAt: (data.accessTokenExpiresAt as Date | null) ?? null,
        refreshTokenExpiresAt: (data.refreshTokenExpiresAt as Date | null) ?? null,
        lastRefreshedAt: (data.lastRefreshedAt as Date | null) ?? null,
        lastValidatedAt: (data.lastValidatedAt as Date | null) ?? null,
        lastError: (data.lastError as string | null) ?? null,
        reauthRequiredAt: (data.reauthRequiredAt as Date | null) ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
      },
      update: data,
    });
  }

  async markReauthRequired(provider: string, error: string) {
    return this.db.snsOAuthConnection.update({
      where: { provider },
      data: {
        status: "reauth_required",
        lastError: error.slice(0, 2000),
        reauthRequiredAt: new Date(),
        accessTokenCipher: null,
        refreshTokenCipher: null,
      },
    });
  }

  async markStatus(provider: string, status: string) {
    return this.db.snsOAuthConnection.update({
      where: { provider },
      data: { status },
    });
  }

  async disconnect(provider: string) {
    return this.db.snsOAuthConnection.upsert({
      where: { provider },
      create: {
        provider,
        status: "disconnected",
      },
      update: {
        status: "disconnected",
        accessTokenCipher: null,
        refreshTokenCipher: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        lastError: null,
        reauthRequiredAt: null,
        externalAccountId: null,
        accountLabel: null,
        scopes: [],
      },
    });
  }

  async listNeedingRefresh(withinMs: number) {
    const threshold = new Date(Date.now() + withinMs);
    return this.db.snsOAuthConnection.findMany({
      where: {
        status: { in: ["connected", "auto_refreshing"] },
        accessTokenCipher: { not: null },
        OR: [
          { accessTokenExpiresAt: { lte: threshold } },
          { accessTokenExpiresAt: null },
        ],
      },
    });
  }
}

export class SnsLearningRepository {
  constructor(private readonly db: Db = prisma) {}

  async createObservation(data: Prisma.SnsTrendObservationCreateInput) {
    return this.db.snsTrendObservation.create({ data });
  }

  async listObservations(input?: {
    platform?: string;
    locale?: Locale;
    status?: string;
  }) {
    return this.db.snsTrendObservation.findMany({
      where: {
        platform: input?.platform,
        locale: input?.locale,
        status: input?.status ?? "active",
      },
      orderBy: { observedAt: "desc" },
      take: 200,
    });
  }

  async updateObservation(
    id: string,
    data: Prisma.SnsTrendObservationUpdateInput,
  ) {
    return this.db.snsTrendObservation.update({ where: { id }, data });
  }

  async createPattern(data: Prisma.SnsViralPatternCreateInput) {
    return this.db.snsViralPattern.create({ data });
  }

  async listPatterns(status = "active") {
    return this.db.snsViralPattern.findMany({
      where: { status },
      orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
      take: 200,
    });
  }

  async updatePattern(id: string, data: Prisma.SnsViralPatternUpdateInput) {
    return this.db.snsViralPattern.update({ where: { id }, data });
  }

  async createExperiment(input: {
    data: Prisma.SnsExperimentCreateInput;
    variants: Array<{ key: string; label: string; config: Prisma.InputJsonValue }>;
  }) {
    return this.db.snsExperiment.create({
      data: {
        ...input.data,
        variants: {
          create: input.variants.map((v) => ({
            key: v.key,
            label: v.label,
            config: v.config,
          })),
        },
      },
      include: { variants: true },
    });
  }

  async listExperiments() {
    return this.db.snsExperiment.findMany({
      include: { variants: true, posts: { take: 20 } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async updateExperiment(id: string, data: Prisma.SnsExperimentUpdateInput) {
    return this.db.snsExperiment.update({ where: { id }, data });
  }

  async createMetrics(data: Prisma.SnsPostMetricsCreateInput) {
    return this.db.snsPostMetrics.create({ data });
  }

  async listMetrics(socialPostId?: string) {
    return this.db.snsPostMetrics.findMany({
      where: socialPostId ? { socialPostId } : undefined,
      orderBy: { capturedAt: "desc" },
      take: 200,
      include: { socialPost: true },
    });
  }

  async createScore(data: Prisma.SnsPostScoreCreateInput) {
    return this.db.snsPostScore.create({ data });
  }

  async createRecommendation(data: Prisma.SnsRecommendationCreateInput) {
    return this.db.snsRecommendation.create({ data });
  }

  async listRecommendations(status?: string) {
    return this.db.snsRecommendation.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ predictedScore: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  async updateRecommendation(
    id: string,
    data: Prisma.SnsRecommendationUpdateInput,
  ) {
    return this.db.snsRecommendation.update({ where: { id }, data });
  }

  async createLearning(data: Prisma.SnsLearningRecordCreateInput) {
    return this.db.snsLearningRecord.create({ data });
  }

  async listLearning(input?: { kind?: string; status?: string }) {
    return this.db.snsLearningRecord.findMany({
      where: {
        kind: input?.kind,
        status: input?.status ?? "active",
      },
      orderBy: { observedAt: "desc" },
      take: 200,
    });
  }

  async updateLearning(id: string, data: Prisma.SnsLearningRecordUpdateInput) {
    return this.db.snsLearningRecord.update({ where: { id }, data });
  }

  async logImprovement(data: Prisma.SnsImprovementLogCreateInput) {
    return this.db.snsImprovementLog.create({ data });
  }

  async listImprovements() {
    return this.db.snsImprovementLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async dashboard() {
    const [
      observations,
      patterns,
      experiments,
      recommendations,
      learning,
      improvements,
      posts,
      metrics,
    ] = await Promise.all([
      this.listObservations(),
      this.listPatterns(),
      this.listExperiments(),
      this.listRecommendations(),
      this.listLearning(),
      this.listImprovements(),
      this.db.socialPost.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          metrics: { orderBy: { capturedAt: "desc" }, take: 3 },
          scores: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      this.listMetrics(),
    ]);
    return {
      observations,
      patterns,
      experiments,
      recommendations,
      learning,
      improvements,
      posts,
      metrics,
    };
  }
}

export class AnalyticsRepository {
  constructor(private readonly db: Db = prisma) {}

  async track(input: {
    name: string;
    properties?: Prisma.InputJsonValue;
    locale?: Locale | null;
  }) {
    return this.db.analyticsEvent.create({
      data: {
        name: input.name,
        properties: input.properties ?? {},
        locale: input.locale ?? null,
      },
    });
  }
}

export class KnowledgeNodeRepository {
  constructor(private readonly db: Db = prisma) {}

  async upsert(input: {
    type:
      | "tool"
      | "category"
      | "company"
      | "use_case"
      | "pricing"
      | "api"
      | "feature"
      | "persona"
      | "competitor_set"
      | "concept"
      | "document"
      | "other";
    key: string;
    label: string;
    locale?: Locale | null;
    description?: string;
    entityType?: string;
    entityId?: string;
    properties?: Prisma.InputJsonValue;
  }) {
    return this.db.knowledgeNode.upsert({
      where: { type_key: { type: input.type, key: input.key } },
      create: {
        type: input.type,
        key: input.key,
        label: input.label,
        locale: input.locale ?? null,
        description: input.description,
        entityType: input.entityType,
        entityId: input.entityId,
        properties: input.properties ?? {},
      },
      update: {
        label: input.label,
        locale: input.locale ?? null,
        description: input.description,
        entityType: input.entityType,
        entityId: input.entityId,
        ...(input.properties ? { properties: input.properties } : {}),
      },
    });
  }

  async findByKey(type: string, key: string) {
    return this.db.knowledgeNode.findUnique({
      where: { type_key: { type: type as never, key } },
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.db.knowledgeNode.findMany({
      where: { entityType, entityId },
    });
  }

  async getWithNeighbors(id: string, edgeTypes?: string[]) {
    return this.db.knowledgeNode.findUnique({
      where: { id },
      include: {
        edgesFrom: {
          where: edgeTypes?.length
            ? { type: { in: edgeTypes as never[] } }
            : undefined,
          include: { toNode: true },
        },
        edgesTo: {
          where: edgeTypes?.length
            ? { type: { in: edgeTypes as never[] } }
            : undefined,
          include: { fromNode: true },
        },
      },
    });
  }
}

export class KnowledgeEdgeRepository {
  constructor(private readonly db: Db = prisma) {}

  async upsert(input: {
    fromNodeId: string;
    toNodeId: string;
    type:
      | "similar_to"
      | "competes_with"
      | "belongs_to"
      | "made_by"
      | "used_for"
      | "has_pricing"
      | "has_api"
      | "has_feature"
      | "alternative_to"
      | "related_to"
      | "mentions"
      | "derived_from";
    weight?: number;
    properties?: Prisma.InputJsonValue;
  }) {
    return this.db.knowledgeEdge.upsert({
      where: {
        fromNodeId_toNodeId_type: {
          fromNodeId: input.fromNodeId,
          toNodeId: input.toNodeId,
          type: input.type,
        },
      },
      create: {
        fromNodeId: input.fromNodeId,
        toNodeId: input.toNodeId,
        type: input.type,
        weight: input.weight ?? 1,
        properties: input.properties ?? {},
      },
      update: {
        weight: input.weight ?? 1,
        ...(input.properties ? { properties: input.properties } : {}),
      },
    });
  }

  async listFrom(nodeId: string, type?: string) {
    return this.db.knowledgeEdge.findMany({
      where: {
        fromNodeId: nodeId,
        ...(type ? { type: type as never } : {}),
      },
      include: { toNode: true },
    });
  }
}

export class AgentMemoryRepository {
  constructor(private readonly db: Db = prisma) {}

  async create(input: {
    kind:
      | "run_success"
      | "run_failure"
      | "improvement"
      | "observation"
      | "decision"
      | "feedback"
      | "fact";
    scope?: "global" | "agent" | "workflow" | "tool" | "correlation";
    agentKey?: string;
    workflowId?: string;
    correlationId?: string;
    toolId?: string;
    nodeId?: string;
    title: string;
    content: string;
    metadata?: Prisma.InputJsonValue;
    importance?: number;
  }) {
    return this.db.agentMemory.create({
      data: {
        kind: input.kind,
        scope: input.scope ?? "agent",
        agentKey: input.agentKey,
        workflowId: input.workflowId,
        correlationId: input.correlationId,
        toolId: input.toolId,
        nodeId: input.nodeId,
        title: input.title,
        content: input.content,
        metadata: input.metadata ?? {},
        importance: input.importance ?? 0.5,
      },
    });
  }

  async recall(input: {
    agentKey?: string;
    kinds?: string[];
    toolId?: string;
    correlationId?: string;
    take?: number;
  }) {
    return this.db.agentMemory.findMany({
      where: {
        ...(input.agentKey
          ? {
              OR: [
                { agentKey: input.agentKey },
                { scope: "global" },
              ],
            }
          : {}),
        ...(input.kinds?.length ? { kind: { in: input.kinds as never[] } } : {}),
        ...(input.toolId ? { toolId: input.toolId } : {}),
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      take: input.take ?? 20,
    });
  }

  async touch(id: string) {
    return this.db.agentMemory.update({
      where: { id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }
}

export class KnowledgeDocumentRepository {
  constructor(private readonly db: Db = prisma) {}

  async create(input: {
    nodeId?: string;
    sourceType: string;
    sourceId?: string;
    locale?: Locale | null;
    title: string;
    content: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.knowledgeDocument.create({
      data: {
        nodeId: input.nodeId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        locale: input.locale ?? null,
        title: input.title,
        content: input.content,
        metadata: input.metadata ?? {},
      },
    });
  }

  async addChunk(input: {
    documentId: string;
    chunkIndex: number;
    content: string;
    tokenCount?: number;
    vectorId?: string;
    embeddingProvider?: string;
    embeddingModel?: string;
    dimensions?: number;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.knowledgeChunk.upsert({
      where: {
        documentId_chunkIndex: {
          documentId: input.documentId,
          chunkIndex: input.chunkIndex,
        },
      },
      create: {
        documentId: input.documentId,
        chunkIndex: input.chunkIndex,
        content: input.content,
        tokenCount: input.tokenCount,
        vectorId: input.vectorId,
        embeddingProvider: input.embeddingProvider,
        embeddingModel: input.embeddingModel,
        dimensions: input.dimensions,
        metadata: input.metadata ?? {},
      },
      update: {
        content: input.content,
        tokenCount: input.tokenCount,
        vectorId: input.vectorId,
        embeddingProvider: input.embeddingProvider,
        embeddingModel: input.embeddingModel,
        dimensions: input.dimensions,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }

  async findChunksByVectorIds(vectorIds: string[]) {
    if (!vectorIds.length) return [];
    return this.db.knowledgeChunk.findMany({
      where: { vectorId: { in: vectorIds } },
      include: { document: true },
    });
  }
}

export class VectorRecordRepository {
  constructor(private readonly db: Db = prisma) {}

  async upsert(input: {
    id: string;
    namespace?: string;
    embedding: number[];
    payload?: Prisma.InputJsonValue;
  }) {
    return this.db.vectorRecord.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        namespace: input.namespace ?? "default",
        embedding: input.embedding,
        dimensions: input.embedding.length,
        payload: input.payload ?? {},
      },
      update: {
        namespace: input.namespace ?? "default",
        embedding: input.embedding,
        dimensions: input.embedding.length,
        payload: input.payload ?? {},
      },
    });
  }

  async listByNamespace(namespace: string, take = 10_000) {
    return this.db.vectorRecord.findMany({
      where: { namespace },
      take,
    });
  }

  async delete(id: string) {
    return this.db.vectorRecord.delete({ where: { id } }).catch(() => null);
  }
}

export class MarketplaceRepository {
  constructor(private readonly db: Db = prisma) {}

  async upsertPackage(input: {
    key: string;
    visibility?: "free" | "paid" | "internal" | "community";
    listingStatus?: "draft" | "published" | "archived" | "suspended";
    name: Prisma.InputJsonValue;
    description?: Prisma.InputJsonValue;
    homepageUrl?: string;
    priceUsd?: number | null;
    tags?: string[];
    metadata?: Prisma.InputJsonValue;
    publisherId?: string;
  }) {
    return this.db.marketplaceAgentPackage.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        visibility: input.visibility ?? "internal",
        listingStatus: input.listingStatus ?? "draft",
        name: input.name,
        description: input.description ?? {},
        homepageUrl: input.homepageUrl,
        priceUsd: input.priceUsd ?? null,
        tags: input.tags ?? [],
        metadata: input.metadata ?? {},
        publisherId: input.publisherId,
      },
      update: {
        visibility: input.visibility,
        listingStatus: input.listingStatus,
        name: input.name,
        description: input.description ?? {},
        homepageUrl: input.homepageUrl,
        priceUsd: input.priceUsd ?? null,
        tags: input.tags ?? [],
        ...(input.metadata ? { metadata: input.metadata } : {}),
        publisherId: input.publisherId,
      },
    });
  }

  async publishVersion(input: {
    packageId: string;
    version: string;
    manifest: Prisma.InputJsonValue;
    changelog?: string;
    requiredProviders?: Prisma.InputJsonValue;
    permissions?: string[];
  }) {
    return this.db.$transaction(async (tx) => {
      await tx.marketplaceAgentVersion.updateMany({
        where: { packageId: input.packageId, isLatest: true },
        data: { isLatest: false },
      });
      return tx.marketplaceAgentVersion.upsert({
        where: {
          packageId_version: {
            packageId: input.packageId,
            version: input.version,
          },
        },
        create: {
          packageId: input.packageId,
          version: input.version,
          manifest: input.manifest,
          changelog: input.changelog,
          requiredProviders: input.requiredProviders ?? {},
          permissions: input.permissions ?? [],
          isLatest: true,
        },
        update: {
          manifest: input.manifest,
          changelog: input.changelog,
          requiredProviders: input.requiredProviders ?? {},
          permissions: input.permissions ?? [],
          isLatest: true,
          publishedAt: new Date(),
        },
      });
    });
  }

  async setPermissions(
    packageId: string,
    permissions: Array<{ permission: string; description?: string }>,
  ) {
    await this.db.marketplaceAgentPermission.deleteMany({ where: { packageId } });
    if (!permissions.length) return [];
    await this.db.marketplaceAgentPermission.createMany({
      data: permissions.map((p) => ({
        packageId,
        permission: p.permission,
        description: p.description,
      })),
    });
    return this.db.marketplaceAgentPermission.findMany({ where: { packageId } });
  }

  async setDependencies(
    packageId: string,
    deps: Array<{ dependsOnKey: string; versionRange?: string; optional?: boolean }>,
  ) {
    await this.db.marketplaceAgentDependency.deleteMany({ where: { packageId } });
    if (!deps.length) return [];
    await this.db.marketplaceAgentDependency.createMany({
      data: deps.map((d) => ({
        packageId,
        dependsOnKey: d.dependsOnKey,
        versionRange: d.versionRange ?? "*",
        optional: d.optional ?? false,
      })),
    });
    return this.db.marketplaceAgentDependency.findMany({ where: { packageId } });
  }

  async findPackageByKey(key: string) {
    return this.db.marketplaceAgentPackage.findUnique({
      where: { key },
      include: {
        versions: { orderBy: { publishedAt: "desc" } },
        permissions: true,
        dependencies: true,
        installations: true,
      },
    });
  }

  async listCatalog(filters?: {
    visibility?: string;
    listingStatus?: string;
  }) {
    return this.db.marketplaceAgentPackage.findMany({
      where: {
        ...(filters?.visibility
          ? { visibility: filters.visibility as never }
          : {}),
        ...(filters?.listingStatus
          ? { listingStatus: filters.listingStatus as never }
          : {}),
      },
      include: {
        versions: { where: { isLatest: true }, take: 1 },
        permissions: true,
        dependencies: true,
      },
      orderBy: { key: "asc" },
    });
  }

  async upsertInstallation(input: {
    packageId: string;
    packageVersionId: string;
    agentId: string;
    status?: "installed" | "disabled" | "pending_update" | "uninstalled";
    installedById?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.marketplaceInstallation.upsert({
      where: { agentId: input.agentId },
      create: {
        packageId: input.packageId,
        packageVersionId: input.packageVersionId,
        agentId: input.agentId,
        status: input.status ?? "installed",
        installedById: input.installedById,
        metadata: input.metadata ?? {},
      },
      update: {
        packageVersionId: input.packageVersionId,
        status: input.status ?? "installed",
        metadata: input.metadata ?? {},
      },
    });
  }

  async findInstallationByAgentKey(agentKey: string) {
    const agent = await this.db.agent.findUnique({ where: { key: agentKey } });
    if (!agent) return null;
    return this.db.marketplaceInstallation.findUnique({
      where: { agentId: agent.id },
      include: {
        package: true,
        packageVersion: true,
        agent: true,
      },
    });
  }

  async listInstallations() {
    return this.db.marketplaceInstallation.findMany({
      include: {
        package: true,
        packageVersion: true,
        agent: true,
      },
      orderBy: { installedAt: "desc" },
    });
  }
}

import {
  BrandProfileRepository,
  CustomerUserRepository,
  MarketingOsRepository,
  SnsHandleRepository,
  WorkspaceRepository,
} from "./marketing-os-repos.js";

export class Repositories {
  readonly outbox = new OutboxRepository();
  readonly consumptions = new EventConsumptionRepository();
  readonly agents = new AgentRepository();
  readonly agentRuns = new AgentRunRepository();
  readonly workflows = new WorkflowRepository();
  readonly drafts = new DraftRepository();
  readonly approvals = new ApprovalRepository();
  readonly candidates = new CandidateRepository();
  readonly tools = new ToolRepository();
  readonly articles = new ArticleRepository();
  readonly logs = new LogRepository();
  readonly categories = new CategoryRepository();
  readonly affiliates = new AffiliateRepository();
  readonly affiliateIntel = new AffiliateIntelRepository();
  readonly comparisons = new ComparisonRepository();
  readonly socialPosts = new SocialPostRepository();
  readonly snsOAuth = new SnsOAuthConnectionRepository();
  readonly snsLearning = new SnsLearningRepository();
  readonly settings = new SettingsRepository();
  readonly opsAlerts = new OpsAlertRepository();
  readonly selfHealing = new SelfHealingRepository();
  readonly opsMetrics = new OpsMetricsRepository();
  readonly analytics = new AnalyticsRepository();
  readonly knowledgeNodes = new KnowledgeNodeRepository();
  readonly knowledgeEdges = new KnowledgeEdgeRepository();
  readonly memories = new AgentMemoryRepository();
  readonly knowledgeDocuments = new KnowledgeDocumentRepository();
  readonly vectorRecords = new VectorRecordRepository();
  readonly marketplace = new MarketplaceRepository();
  readonly workspaces = new WorkspaceRepository();
  readonly brandProfiles = new BrandProfileRepository();
  readonly snsHandles = new SnsHandleRepository();
  readonly marketingOs = new MarketingOsRepository();
  readonly customers = new CustomerUserRepository();
}

export const repos = new Repositories();
