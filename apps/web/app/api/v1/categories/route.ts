import { repos } from "@ai-base/database";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") === "ja" ? "ja" : "en";
  const categories = await repos.categories.list(locale);
  return jsonOk({ items: categories });
}
