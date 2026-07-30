import { redirect } from "next/navigation";

/** Legacy overview — merged into AI Home. */
export default function DashRedirect() {
  redirect("/admin");
}
