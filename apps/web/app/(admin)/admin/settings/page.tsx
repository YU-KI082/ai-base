import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { listLlmProviders } from "@ai-base/llm";
import {
  isAdminDevBypassEnabled,
  isOpsAuthConfigured,
  isProductionRuntime,
} from "@ai-base/auth";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const providers = listLlmProviders();
  const authMode = isProductionRuntime()
    ? isOpsAuthConfigured()
      ? dict.admin.authOpsSecret
      : dict.admin.authUnconfigured
    : isAdminDevBypassEnabled()
      ? dict.admin.authDevBypass
      : isOpsAuthConfigured()
        ? dict.admin.authOpsSecret
        : dict.admin.authUnconfigured;

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.settings}
      </h1>
      <section className="card-surface" style={{ padding: "1rem" }}>
        <p>{dict.admin.settingsLocales}</p>
        <p>
          {dict.admin.activeLlmProvider}:{" "}
          <code>{process.env.LLM_PROVIDER ?? "openai"}</code>
        </p>
        <p>
          {dict.admin.authMode}: <code>{authMode}</code>
        </p>
        <p className="muted">{dict.admin.llmVendorHint}</p>
        <p>{dict.admin.registeredProviders}:</p>
        <ul>
          {providers.map((id) => (
            <li key={id}>
              <code>{id}</code>
            </li>
          ))}
        </ul>
        <p className="muted">{dict.admin.apiKeysHint}</p>
        <ul className="muted">
          <li>OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / GROK_API_KEY</li>
          <li>LOCAL_LLM_BASE_URL (Ollama / vLLM)</li>
          <li>DATABASE_URL / REDIS_URL / CACHE_BACKEND</li>
        </ul>
      </section>
    </main>
  );
}
