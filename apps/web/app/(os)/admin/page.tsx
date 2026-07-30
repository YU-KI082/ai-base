import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, USER_SESSION_COOKIE } from "@ai-base/auth";
import { AssistantHome } from "./assistant-home";

export default async function AdminHomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!session) redirect("/login?next=/admin");
  const ctx = await requireUser(
    new Request("http://localhost/admin", {
      headers: { cookie: `${USER_SESSION_COOKIE}=${session}` },
    }),
  );
  if (!ctx.setupDone) redirect("/admin/setup");
  return <AssistantHome />;
}
