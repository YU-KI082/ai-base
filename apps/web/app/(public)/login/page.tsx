import Link from "next/link";
import { UserAuthForm } from "./user-auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const nextPath =
    sp.next && sp.next.startsWith("/admin") ? sp.next : "/admin";

  return (
    <main className="os-auth-page">
      <div className="os-auth-hero">
        <p className="os-eyebrow">AI BASE OS</p>
        <h1>AI社員が、毎日のマーケを考える</h1>
        <p className="os-lead">
          分析だけで終わらない。今日やるべきことまで、会話で提案します。
        </p>
      </div>
      <UserAuthForm mode="login" nextPath={nextPath} />
      <p className="os-auth-foot">
        <Link href="/">サイトトップへ</Link>
      </p>
    </main>
  );
}
