import { OutboxRepository } from "@ai-base/database";
import type { AiBaseEvent } from "./types.js";
import type { EventBus } from "./bus.js";
import { RedisStreamsEventBus } from "./redis-streams-bus.js";
import { InMemoryEventBus } from "./in-memory-bus.js";

export async function runOutboxRelay(options?: {
  bus?: EventBus;
  pollMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}): Promise<void> {
  const bus =
    options?.bus ??
    (process.env.EVENT_BUS === "memory"
      ? new InMemoryEventBus()
      : new RedisStreamsEventBus());
  const pollMs =
    options?.pollMs ?? Number(process.env.OUTBOX_POLL_MS ?? 1000);
  const maxAttempts =
    options?.maxAttempts ??
    Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 25);
  const outbox = new OutboxRepository();

  while (!options?.signal?.aborted) {
    const batch = await outbox.listUnpublished(100, maxAttempts);
    for (const row of batch) {
      try {
        const event = row.payload as unknown as AiBaseEvent;
        await bus.publish(event);
        await outbox.markPublished(row.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await outbox.markFailed(row.id, message);
        if (row.attempts + 1 >= maxAttempts) {
          console.error(
            `[outbox-relay] dead-letter ${row.id} after ${maxAttempts} attempts: ${message}`,
          );
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function main() {
  console.log("[outbox-relay] starting");
  const controller = new AbortController();
  process.on("SIGINT", () => controller.abort());
  process.on("SIGTERM", () => controller.abort());
  await runOutboxRelay({ signal: controller.signal });
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("outbox-relay.ts") ||
    process.argv[1].endsWith("outbox-relay.js"));

if (isDirect) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
