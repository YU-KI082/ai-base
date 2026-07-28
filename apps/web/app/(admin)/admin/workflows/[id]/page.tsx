import { notFound } from "next/navigation";
import { repos } from "@ai-base/database";

export const dynamic = "force-dynamic";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workflow = await repos.workflows.findById(id);
  if (!workflow) notFound();

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {workflow.type}
      </h1>
      <p className="muted">
        {workflow.state} · {workflow.correlationId}
      </p>
      <ol>
        {workflow.workflowSteps.map((step) => (
          <li key={step.id} style={{ marginBottom: "0.5rem" }}>
            <strong>{step.stepKey}</strong> ({step.agentKey}) — {step.status}
            {step.lastError ? <div className="muted">{step.lastError}</div> : null}
          </li>
        ))}
      </ol>
    </main>
  );
}
