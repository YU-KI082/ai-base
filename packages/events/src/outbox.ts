import type { Prisma } from "@ai-base/database";
import { OutboxRepository, prisma } from "@ai-base/database";
import type { AiBaseEvent } from "./types.js";
import type { EventBus } from "./bus.js";

/**
 * Persist domain changes and enqueue CloudEvents in the same transaction.
 */
export async function withOutboxEvent<T>(
  work: (
    tx: Prisma.TransactionClient,
    enqueue: (event: AiBaseEvent) => Promise<void>,
  ) => Promise<T>,
): Promise<T> {
  const outbox = new OutboxRepository(prisma);
  return prisma.$transaction(async (tx) => {
    const enqueue = async (event: AiBaseEvent) => {
      await outbox.enqueue(
        {
          id: event.id,
          topic: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
          headers: {
            source: event.source,
            correlationid: event.correlationid,
          },
        },
        tx,
      );
    };
    return work(tx, enqueue);
  });
}

export async function enqueueEvent(event: AiBaseEvent): Promise<void> {
  const outbox = new OutboxRepository(prisma);
  await outbox.enqueue({
    id: event.id,
    topic: event.type,
    payload: event as unknown as Prisma.InputJsonValue,
    headers: {
      source: event.source,
      correlationid: event.correlationid,
    },
  });
}
