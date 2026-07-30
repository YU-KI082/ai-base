import { redirect } from "next/navigation";

/** Legacy posts path — renamed to Create. */
export default function PostsRedirect() {
  redirect("/admin/create");
}
