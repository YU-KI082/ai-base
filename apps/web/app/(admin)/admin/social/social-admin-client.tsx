"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type Post = {
  id: string;
  platform: string;
  locale: string;
  status: string;
  content: string;
  toolId: string | null;
  createdAt: string;
};

export function SocialAdminClient({ initialPosts }: { initialPosts: Post[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const posts =
    filter === "all" ? initialPosts : initialPosts.filter((p) => p.status === filter);

  async function setStatus(id: string, status: string) {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/social/${id}`, {
        method: "PATCH",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {["all", "draft", "ready", "published", "rejected"].map((s) => (
          <button
            key={s}
            className={`btn ${filter === s ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(s)}
            type="button"
          >
            {s}
          </button>
        ))}
      </div>
      {posts.length === 0 ? (
        <p className="muted">No social posts yet. Publish a tool to generate drafts.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
          {posts.map((post) => (
            <li key={post.id} className="card-surface" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <div>
                  <strong>
                    {post.platform} · {post.locale}
                  </strong>
                  <span className="pill" style={{ marginLeft: 8 }}>
                    {post.status}
                  </span>
                  <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{post.content}</p>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "start" }}>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => void setStatus(post.id, "ready")}>
                    Ready
                  </button>
                  <button className="btn btn-primary" disabled={busy} onClick={() => void setStatus(post.id, "published")}>
                    Mark published
                  </button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => void setStatus(post.id, "rejected")}>
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
