import { redirect } from "next/navigation";

/** Plan path /admin/chat — chat lives on Home. */
export default function ChatRedirect() {
  redirect("/admin");
}
