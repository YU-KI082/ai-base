import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { listLlmProviders } from "@ai-base/llm";
import { isAdminDevBypassEnabled, isProductionRuntime } from "@ai-base/auth";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const providers = listLlmProviders();

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.settings}
      </h1>
      <section className="card-surface" style={{ padding: "1rem" }}>
        <p>Locales: en, ja</p>
        <p>
          Active LLM provider (env): <code>{process.env.LLM_PROVIDER ?? "openai"}</code>
        </p>
        <p>
          Auth mode:{" "}
          <code>
            {isProductionRuntime()
              ? "production (session/bearer)"
              : isAdminDevBypassEnabled()
                ? "dev_bypass"
                : "unconfigured"}
          </code>
        </p>
        <p className="muted">
          Agents are LLM-vendor agnostic. Switch via <code>LLM_PROVIDER</code> or per-agent{" "}
          <code>config.llmProvider</code>. Secrets must never be written into agent config JSON.
        </p>
        <p>Registered providers:</p>
        <ul>
          {providers.map((id) => (
            <li key={id}>
              <code>{id}</code>
            </li>
          ))}
        </ul>
        <p className="muted">
          API keys live only in the environment / secret manager. The UI lists reference names only.
        </p>
        <ul className="muted">
          <li>OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / GROK_API_KEY</li>
          <li>LOCAL_LLM_BASE_URL (Ollama / vLLM)</li>
          <li>DATABASE_URL / REDIS_URL / CACHE_BACKEND</li>
        </ul>
      </section>
    </main>
  );
}
