import { createHash } from "node:crypto";
import type { Locale, Prisma, PrismaClient } from "@prisma/client";
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
  readonly logs = new LogRepository();
  readonly categories = new CategoryRepository();
  readonly affiliates = new AffiliateRepository();
  readonly affiliateIntel = new AffiliateIntelRepository();
  readonly comparisons = new ComparisonRepository();
  readonly socialPosts = new SocialPostRepository();
  readonly snsLearning = new SnsLearningRepository();
  readonly analytics = new AnalyticsRepository();
  readonly knowledgeNodes = new KnowledgeNodeRepository();
  readonly knowledgeEdges = new KnowledgeEdgeRepository();
  readonly memories = new AgentMemoryRepository();
  readonly knowledgeDocuments = new KnowledgeDocumentRepository();
  readonly vectorRecords = new VectorRecordRepository();
  readonly marketplace = new MarketplaceRepository();
}

export const repos = new Repositories();
