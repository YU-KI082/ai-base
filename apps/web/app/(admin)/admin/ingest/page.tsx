import { IngestForm } from "./ingest-form";

export default function IngestPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        Manual ingest
      </h1>
      <p className="muted">
        Emits <code>ingest.manual.requested.v1</code> into the outbox. Scout picks it up and starts the pipeline.
      </p>
      <IngestForm />
    </main>
  );
}
