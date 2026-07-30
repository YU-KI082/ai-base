import Link from "next/link";
import { UserAuthForm } from "../login/user-auth-form";

export default function SignupPage() {
  return (
    <main className="os-auth-page">
      <div className="os-auth-hero">
        <p className="os-eyebrow">AI BASE OS</p>
        <h1>専属AIマーケターを雇う</h1>
        <p className="os-lead">
          API連携なしですぐ開始。ブランドを教えるだけで今日の提案が届きます。
        </p>
      </div>
      <UserAuthForm mode="signup" nextPath="/admin/setup" />
      <p className="os-auth-foot">
        <Link href="/login">ログインはこちら</Link>
      </p>
    </main>
  );
}
