import { redirect } from "next/navigation";

/** Legacy SCORE page — merged into Analysis. */
export default function ScoreRedirect() {
  redirect("/admin/analysis#score");
}
