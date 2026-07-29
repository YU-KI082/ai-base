import { EventTypes, createEvent, enqueueEvent } from "@ai-base/events";
import {
  activateSiteBrand,
  buildRevenueDashboard,
  loadCompanyOpsSettings,
  saveCompanyOpsSettings,
  SITE_BRAND_PACKS,
  type CompanyOpsSettings,
} from "@ai-base/company-ops";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const [settings, revenue] = await Promise.all([
      loadCompanyOpsSettings(),
      buildRevenueDashboard(),
    ]);
    return jsonOk({ settings, revenue, brands: SITE_BRAND_PACKS });
  });
}

export async function PATCH(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    const body = await readJson<Partial<CompanyOpsSettings>>(request);
    try {
      const settings = await saveCompanyOpsSettings(body);
      return jsonOk({ settings });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }
  });
}

export async function POST(request: Request) {
  return withAdmin(request, "agents.manage", async () => {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      brandKey?: string;
    };
    if (body.action === "emergency_stop") {
      return jsonOk({
        settings: await saveCompanyOpsSettings({ emergencyStop: true }),
      });
    }
    if (body.action === "resume") {
      return jsonOk({
        settings: await saveCompanyOpsSettings({
          emergencyStop: false,
          mode: "full_auto",
        }),
      });
    }
    if (body.action === "activate_brand" && body.brandKey) {
      const pack = await activateSiteBrand(body.brandKey, saveCompanyOpsSettings);
      return jsonOk({ brand: pack });
    }
    if (body.action === "run_tick") {
      await enqueueEvent(
        createEvent({
          type: EventTypes.CompanyOpsTick,
          source: "admin:company",
          dataschema: "https://ai-base.local/schemas/company.ops.tick.v1.json",
          correlationid: `company-manual-${Date.now()}`,
          data: { reason: "manual" as const },
        }),
      );
      return jsonOk({ queued: true });
    }
    return jsonError("Unknown action", 400);
  });
}
