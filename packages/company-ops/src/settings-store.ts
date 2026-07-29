import { repos } from "@ai-base/database";
import {
  COMPANY_OPS_SETTING_KEY,
  defaultCompanyOpsSettings,
  parseCompanyOpsSettings,
  type CompanyOpsSettings,
} from "./settings.js";

export async function loadCompanyOpsSettings(): Promise<CompanyOpsSettings> {
  const row = await repos.settings.getJson(COMPANY_OPS_SETTING_KEY);
  if (!row) return defaultCompanyOpsSettings();
  return parseCompanyOpsSettings(row);
}

export async function saveCompanyOpsSettings(
  patch: Partial<CompanyOpsSettings>,
): Promise<CompanyOpsSettings> {
  const current = await loadCompanyOpsSettings();
  const next = parseCompanyOpsSettings({ ...current, ...patch });
  await repos.settings.upsertJson(COMPANY_OPS_SETTING_KEY, next);
  return next;
}
