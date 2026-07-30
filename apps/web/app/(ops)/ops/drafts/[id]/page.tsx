import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { repos } from "@ai-base/database";
import { getDictionary, resolveLocale, statusLabel } from "@ai-base/i18n";
import { DraftActions } from "./draft-actions";

export const dynamic = "force-dynamic";

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const draft = await repos.drafts.findById(id);
  if (!draft) notFound();

  const payload = draft.payload as {
    slug?: string;
    homepageUrl?: string;
    locales?: {
      en?: { name?: string; description?: string };
      ja?: { name?: string; description?: string };
    };
  };

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {payload.slug ?? draft.id}
      </h1>
      <p className="muted">
        {statusLabel(locale, draft.status)} · {dict.admin.workflowLabel}{" "}
        {draft.workflowId ?? "—"}
      </p>
      <p>
        <a href={payload.homepageUrl} target="_blank" rel="noreferrer">
          {payload.homepageUrl}
        </a>
      </p>
      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <section className="card-surface" style={{ padding: "1rem" }}>
          <h2>{dict.public.switchToEn}</h2>
          <h3>{payload.locales?.en?.name}</h3>
          <p>{payload.locales?.en?.description}</p>
        </section>
        <section className="card-surface" style={{ padding: "1rem" }}>
          <h2>{dict.public.switchToJa}</h2>
          <h3>{payload.locales?.ja?.name}</h3>
          <p>{payload.locales?.ja?.description}</p>
        </section>
      </div>
      {draft.status === "pending_approval" ? (
        <DraftActions
          draftId={draft.id}
          labels={{
            approve: dict.admin.approveDraft,
            reject: dict.admin.rejectDraft,
            comment: dict.admin.comment,
          }}
        />
      ) : null}
    </main>
  );
}
