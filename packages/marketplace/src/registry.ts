import { repos, type Repositories } from "@ai-base/database";
import {
  localeText,
  toDisplayName,
  type MarketplaceAgentManifest,
  type MarketplaceVisibility,
} from "./manifest.js";
import { satisfiesVersion } from "./semver.js";

export type DependencyCheckResult = {
  ok: boolean;
  missing: Array<{ key: string; versionRange: string; optional: boolean }>;
  incompatible: Array<{
    key: string;
    versionRange: string;
    installedVersion: string;
  }>;
};

/**
 * Agent Registry + Marketplace operations.
 * Does not replace runtime Agent workers — it catalogs, installs, updates, and gates them.
 */
export class AgentRegistry {
  constructor(private readonly db: Repositories = repos) {}

  /**
   * Register a plugin into marketplace catalog + runtime agent table.
   * Safe for builtins on every worker boot (idempotent upsert).
   */
  async registerPlugin(
    manifest: MarketplaceAgentManifest,
    options?: {
      listingStatus?: "draft" | "published" | "archived" | "suspended";
      visibility?: MarketplaceVisibility;
      publisherId?: string;
      install?: boolean;
    },
  ) {
    const visibility =
      options?.visibility ??
      manifest.marketplace?.visibility ??
      "internal";
    const listingStatus =
      options?.listingStatus ??
      manifest.marketplace?.listingStatus ??
      (visibility === "internal" ? "published" : "draft");

    const pkg = await this.db.marketplace.upsertPackage({
      key: manifest.key,
      visibility,
      listingStatus,
      name: toDisplayName(manifest),
      description: {
        en: localeText(manifest.description, "en"),
        ja: localeText(manifest.description, "ja"),
      },
      homepageUrl: manifest.marketplace?.homepageUrl,
      priceUsd: manifest.marketplace?.priceUsd ?? null,
      tags: manifest.marketplace?.tags ?? [],
      publisherId: options?.publisherId,
      metadata: {
        capabilities: manifest.capabilities,
        subscribe: manifest.subscribe,
        publish: manifest.publish,
      },
    });

    const version = await this.db.marketplace.publishVersion({
      packageId: pkg.id,
      version: manifest.version,
      manifest: manifest as never,
      requiredProviders: (manifest.requiredProviders ?? {}) as never,
      permissions: manifest.permissions ?? [],
    });

    await this.db.marketplace.setPermissions(
      pkg.id,
      (manifest.permissions ?? []).map((permission) => ({ permission })),
    );
    await this.db.marketplace.setDependencies(
      pkg.id,
      (manifest.dependencies ?? []).map((d) => ({
        dependsOnKey: d.key,
        versionRange: d.versionRange ?? "*",
        optional: d.optional ?? false,
      })),
    );

    const agent = await this.db.agents.upsertRegistry({
      key: manifest.key,
      name: toDisplayName(manifest).en,
      version: manifest.version,
      capabilities: manifest.capabilities,
      subscribe: manifest.subscribe,
      publish: manifest.publish,
    });
    await this.db.agents.linkPackageVersion(manifest.key, version.id);

    if (options?.install !== false) {
      await this.db.marketplace.upsertInstallation({
        packageId: pkg.id,
        packageVersionId: version.id,
        agentId: agent.id,
        status: agent.status === "disabled" ? "disabled" : "installed",
      });
    }

    return { package: pkg, version, agent };
  }

  async listCatalog(filters?: {
    visibility?: MarketplaceVisibility;
    listingStatus?: string;
  }) {
    return this.db.marketplace.listCatalog(filters);
  }

  async getPackage(key: string) {
    return this.db.marketplace.findPackageByKey(key);
  }

  async setEnabled(key: string, enabled: boolean) {
    const agent = await this.db.agents.setEnabled(key, enabled);
    const installation = await this.db.marketplace.findInstallationByAgentKey(key);
    if (installation) {
      await this.db.marketplace.upsertInstallation({
        packageId: installation.packageId,
        packageVersionId: installation.packageVersionId,
        agentId: agent.id,
        status: enabled ? "installed" : "disabled",
      });
    }
    return agent;
  }

  async checkDependencies(manifest: MarketplaceAgentManifest): Promise<DependencyCheckResult> {
    const missing: DependencyCheckResult["missing"] = [];
    const incompatible: DependencyCheckResult["incompatible"] = [];
    const installed = await this.db.agents.list();
    const byKey = new Map(installed.map((a) => [a.key, a]));

    for (const dep of manifest.dependencies ?? []) {
      const row = byKey.get(dep.key);
      const range = dep.versionRange ?? "*";
      if (!row || row.status === "disabled") {
        missing.push({
          key: dep.key,
          versionRange: range,
          optional: dep.optional ?? false,
        });
        continue;
      }
      if (!satisfiesVersion(row.version, range)) {
        incompatible.push({
          key: dep.key,
          versionRange: range,
          installedVersion: row.version,
        });
      }
    }

    const hardMissing = missing.filter((m) => !m.optional);
    return {
      ok: hardMissing.length === 0 && incompatible.length === 0,
      missing,
      incompatible,
    };
  }

  /**
   * Update installed agent to a specific (or latest) marketplace version.
   */
  async updateAgent(key: string, targetVersion?: string) {
    const pkg = await this.db.marketplace.findPackageByKey(key);
    if (!pkg) throw new Error(`Marketplace package not found: ${key}`);
    const versionRow = targetVersion
      ? pkg.versions.find((v) => v.version === targetVersion)
      : pkg.versions.find((v) => v.isLatest) ?? pkg.versions[0];
    if (!versionRow) throw new Error(`No version available for ${key}`);

    const manifest = versionRow.manifest as unknown as MarketplaceAgentManifest;
    const deps = await this.checkDependencies(manifest);
    if (!deps.ok) {
      throw new Error(
        `Dependency check failed for ${key}: ${JSON.stringify(deps)}`,
      );
    }

    return this.registerPlugin(manifest, {
      visibility: pkg.visibility,
      listingStatus: pkg.listingStatus,
      install: true,
    });
  }

  async getPermissions(key: string): Promise<string[]> {
    const pkg = await this.db.marketplace.findPackageByKey(key);
    return pkg?.permissions.map((p) => p.permission) ?? [];
  }

  async assertPermissions(key: string, required: string[]) {
    const granted = new Set(await this.getPermissions(key));
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length) {
      throw new Error(
        `Agent ${key} missing permissions: ${missing.join(", ")}`,
      );
    }
  }

  async listInstallations() {
    return this.db.marketplace.listInstallations();
  }
}

export function createAgentRegistry(db: Repositories = repos) {
  return new AgentRegistry(db);
}
