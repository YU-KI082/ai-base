"use client";

export function OsLogoutButton({ label = "ログアウト" }: { label?: string }) {
  return (
    <button
      className="os-ghost-btn"
      type="button"
      onClick={() => {
        void (async () => {
          await fetch("/api/v1/os/auth?action=logout", { method: "POST" });
          window.location.href = "/login";
        })();
      }}
    >
      {label}
    </button>
  );
}
