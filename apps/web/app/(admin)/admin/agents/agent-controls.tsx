"use client";

import { adminMutationHeaders } from "@/lib/admin-fetch";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgentControls({
  agentKey,
  enabled,
}: {
  agentKey: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/agents/${agentKey}/enable`, {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ enabled: !enabled }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn-ghost" disabled={busy} onClick={() => void toggle()}>
      {enabled ? "Disable" : "Enable"}
    </button>
  );
}
