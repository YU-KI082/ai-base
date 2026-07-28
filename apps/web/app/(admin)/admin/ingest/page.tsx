import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { IngestForm } from "./ingest-form";

export default async function IngestPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.manualIngest}
      </h1>
      <p className="muted">{dict.admin.ingestDescription}</p>
      <IngestForm
        labels={{
          name: dict.admin.fieldName,
          homepageUrl: dict.admin.fieldHomepageUrl,
          description: dict.admin.fieldDescription,
          categoryHints: dict.admin.fieldCategoryHints,
          submit: dict.admin.startPipeline,
          error: dict.common.error,
        }}
      />
    </main>
  );
}
