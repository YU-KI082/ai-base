import { LoginForm } from "../../login/login-form";

export default async function OpsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const nextPath = sp.next?.startsWith("/ops") ? sp.next : "/ops";
  return (
    <main className="animate-in" style={{ padding: "2rem 1.25rem", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display-loaded), var(--font-display)", fontSize: "1.75rem" }}>
        Ops Console
      </h1>
      <p className="muted" style={{ marginBottom: "1.25rem" }}>
        運用管理用（ADMIN_OPS_SECRET）
      </p>
      <LoginForm
        nextPath={nextPath}
        labels={{
          secret: "Ops secret",
          submit: "Sign in",
          error: "ログインに失敗しました",
        }}
      />
    </main>
  );
}
