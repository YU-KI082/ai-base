import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";
import { isTokenEncryptionConfigured } from "@ai-base/auth";
import { oauthSetupStatus } from "@ai-base/sns-oauth";

function siteUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}

export async function GET(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    const providers = oauthSetupStatus(siteUrl(request));
    return jsonOk({
      tokenEncryptionConfigured: isTokenEncryptionConfigured(),
      providers,
    });
  });
}
