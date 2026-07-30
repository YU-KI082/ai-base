import { redirect } from "next/navigation";

/** Legacy tasks page — merged into AI Home. */
export default function TasksRedirect() {
  redirect("/admin#tasks");
}
