import { repos } from "@ai-base/database";
import {
  createEvent,
  EventTypes,
  withOutboxEvent,
} from "@ai-base/events";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import {
  DraftDecisionBodySchema,
  jsonError,
  jsonOk,
  readJsonSchema,
} from "@/app/api/v1/_lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdmin(request, "drafts.approve", async (user) => {
    const { id } = await context.params;
    const body = await readJsonSchema(request, DraftDecisionBodySchema);
    const draft = await repos.drafts.findById(id);
    if (!draft) return jsonError("Draft not found", 404);
    if (draft.status !== "pending_approval") {
      return jsonError(`Draft is ${draft.status}, expected pending_approval`);
    }
    if (!draft.workflowId) return jsonError("Draft missing workflowId");

    const approval = await withOutboxEvent(async (tx, enqueue) => {
      const decided = await repos.approvals.decide(
        {
          draftId: draft.id,
          decision: "rejected",
          reviewerId: user.id,
          comment: body.comment,
        },
        tx,
      );

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "draft.rejected",
          resource: "draft",
          resourceId: draft.id,
          after: { approvalId: decided.id, comment: body.comment },
        },
      });

      await repos.workflows.setState(draft.workflowId!, "rejected", tx);

      await enqueue(
        createEvent({
          type: EventTypes.ContentRejected,
          source: "admin:approval",
          dataschema: "https://ai-base.local/schemas/content.rejected.v1.json",
          correlationid: draft.workflow?.correlationId ?? draft.workflowId!,
          subject: draft.id,
          data: {
            draftId: draft.id,
            workflowId: draft.workflowId,
            approvalId: decided.id,
            reviewerId: user.id,
            comment: body.comment,
          },
        }),
      );

      return decided;
    });

    return jsonOk({ ok: true, approvalId: approval.id });
  });
}
