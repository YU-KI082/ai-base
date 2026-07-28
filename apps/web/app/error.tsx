"use client";

import { useEffect } from "react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/v1/self-healing/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Next.js runtime error",
        message: error.message,
        kind: "runtime",
        stack: error.stack,
        digest: error.digest,
        location: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="container site-section">
      <h1>エラーが発生しました</h1>
      <p className="muted">{error.message}</p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        再試行
      </button>
    </main>
  );
}
