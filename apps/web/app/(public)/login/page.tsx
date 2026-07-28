import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <main className="container" style={{ padding: "4rem 0", maxWidth: 560 }}>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif" }}>Admin sign-in</h1>
      <p className="muted">
        Production admin access requires Supabase session verification. Configure
        auth credentials and set a session cookie — <code>ADMIN_DEV_BYPASS</code> is
        disabled in production.
      </p>
      <p>
        Local development: set <code>ADMIN_DEV_BYPASS=true</code> with{" "}
        <code>NODE_ENV</code> not equal to <code>production</code>, then open{" "}
        <Link href="/admin">/admin</Link>.
      </p>
      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
