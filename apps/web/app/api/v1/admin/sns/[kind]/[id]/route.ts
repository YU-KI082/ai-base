import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  return withAdmin(request, "settings.manage", async () => {
    const { kind, id } = await context.params;
    const body = await readJson<{
      status?: string;
      humanNotes?: string;
      humanCorrection?: string;
      humanOverride?: unknown;
      title?: string;
      content?: string;
      summary?: string;
    }>(request);

    if (kind === "observations") {
      const row = await repos.snsLearning.updateObservation(id, {
        status: body.status,
        humanNotes: body.humanNotes,
        theme: body.title,
      });
      return jsonOk({ item: row });
    }
    if (kind === "patterns") {
      const row = await repos.snsLearning.updatePattern(id, {
        status: body.status,
        humanOverride:
          body.humanOverride === undefined
            ? undefined
            : (body.humanOverride as object),
        summary: body.summary ?? body.humanCorrection,
        title: body.title,
      });
      return jsonOk({ item: row });
    }
    if (kind === "learning") {
      const row = await repos.snsLearning.updateLearning(id, {
        status: body.status,
        humanCorrection: body.humanCorrection,
        title: body.title,
        content: body.content,
      });
      return jsonOk({ item: row });
    }
    if (kind === "recommendations") {
      const row = await repos.snsLearning.updateRecommendation(id, {
        status: body.status,
        humanNotes: body.humanNotes,
      });
      return jsonOk({ item: row });
    }
    if (kind === "experiments") {
      const row = await repos.snsLearning.updateExperiment(id, {
        status: body.status,
        humanNotes: body.humanNotes,
        resultSummary: body.summary,
      });
      return jsonOk({ item: row });
    }

    return jsonError("Unknown kind", 400);
  });
}
