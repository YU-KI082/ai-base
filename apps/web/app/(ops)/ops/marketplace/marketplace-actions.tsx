"use client";

import { adminMutationHeaders } from "@/lib/admin-fetch";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarketplaceActions({
  agentKey,
  enabled,
  installed,
  labels,
}: {
  agentKey: string;
  enabled: boolean;
  installed: boolean;
  labels: {
    enable: string;
    disable: string;
    update: string;
    registerViaWorker: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/marketplace/${agentKey}/enable`, {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ enabled: !enabled }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function update() {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/marketplace/${agentKey}/update`, {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "start" }}>
      {installed ? (
        <>
          <button className="btn btn-ghost" disabled={busy} onClick={() => void toggle()}>
            {enabled ? labels.disable : labels.enable}
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={() => void update()}>
            {labels.update}
          </button>
        </>
      ) : (
        <span className="muted">{labels.registerViaWorker}</span>
      )}
    </div>
  );
}
