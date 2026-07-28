import { repos } from "@ai-base/database";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const tool = await repos.tools.findBySlug(slug);
  if (!tool || tool.status !== "published") return jsonError("Not found", 404);
  return jsonOk({ tool });
}
