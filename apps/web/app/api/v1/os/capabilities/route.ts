import { getOsCapabilities } from "@ai-base/marketing-os";
import { withOsUser } from "../_lib";

export async function GET(request: Request) {
  return withOsUser(request, async () => {
    return Response.json({ capabilities: getOsCapabilities() });
  });
}
