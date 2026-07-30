import { z } from "zod";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";
import {
  isOAuthProvider,
  refreshConnection,
  validateConnection,
} from "@ai-base/sns-oauth";

const BodySchema = z.object({
  action: z.enum(["refresh", "validate", "disconnect"]),
});

function isConnectableProvider(value: string): boolean {
  return isOAuthProvider(value) || value === "note";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  return withAdmin(request, "settings.manage", async () => {
    const { provider: raw } = await context.params;
    if (!isConnectableProvider(raw)) return jsonError("Unknown provider", 400);
    let body: z.infer<typeof BodySchema>;
    try {
      body = await readJsonSchema(request, BodySchema);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }

    if (body.action === "disconnect") {
      await repos.snsOAuth.disconnect(raw);
      return jsonOk({ ok: true });
    }
    if (!isOAuthProvider(raw)) {
      return jsonError("note uses draft queue — refresh/validate not applicable", 400);
    }
    if (body.action === "refresh") {
      const result = await refreshConnection(raw);
      return jsonOk(result);
    }
    const result = await validateConnection(raw);
    return jsonOk(result);
  });
}
