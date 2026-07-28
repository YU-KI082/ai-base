import { Redis } from "ioredis";
import { parseEvent, type AiBaseEvent } from "./types.js";
import type { EventBus, EventHandler, SubscribeOptions } from "./bus.js";

function streamKey(prefix: string, topic: string): string {
  return `${prefix}:stream:${topic}`;
}

export class RedisStreamsEventBus implements EventBus {
  private readonly redis: Redis;
  private readonly prefix: string;
  private running = true;

  constructor(options?: { url?: string; prefix?: string; redis?: Redis }) {
    this.prefix = options?.prefix ?? process.env.EVENT_BUS_STREAM_PREFIX ?? "aibase";
    this.redis =
      options?.redis ??
      new Redis(options?.url ?? process.env.REDIS_URL ?? "redis://localhost:6379", {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
  }

  async publish(event: AiBaseEvent): Promise<void> {
    const key = streamKey(this.prefix, event.type);
    await this.redis.xadd(
      key,
      "*",
      "id",
      event.id,
      "payload",
      JSON.stringify(event),
    );
  }

  async subscribe(
    options: SubscribeOptions,
    handler: EventHandler,
  ): Promise<{ stop: () => Promise<void> }> {
    for (const topic of options.topics) {
      const key = streamKey(this.prefix, topic);
      try {
        await this.redis.xgroup("CREATE", key, options.group, "0", "MKSTREAM");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("BUSYGROUP")) throw error;
      }
    }

    this.running = true;
    const loop = this.consumeLoop(options, handler);

    return {
      stop: async () => {
        this.running = false;
        await loop.catch(() => undefined);
      },
    };
  }

  private async consumeLoop(
    options: SubscribeOptions,
    handler: EventHandler,
  ): Promise<void> {
    const keys = options.topics.map((topic) => streamKey(this.prefix, topic));
    while (this.running) {
      try {
        const response = (await this.redis.xreadgroup(
          "GROUP",
          options.group,
          options.consumer,
          "COUNT",
          10,
          "BLOCK",
          2000,
          "STREAMS",
          ...keys,
          ...keys.map(() => ">"),
        )) as Array<[string, Array<[string, string[]]>]> | null;

        if (!response) continue;

        for (const [stream, messages] of response) {
          for (const [messageId, fields] of messages) {
            const payloadIndex = fields.findIndex((f) => f === "payload");
            const raw = payloadIndex >= 0 ? fields[payloadIndex + 1] : undefined;
            if (!raw) {
              await this.redis.xack(stream, options.group, messageId);
              continue;
            }
            try {
              const event = parseEvent(JSON.parse(raw));
              await handler(event);
              await this.redis.xack(stream, options.group, messageId);
            } catch (error) {
              // Leave message pending for retry / DLQ handling later.
              console.error(
                `[redis-bus] handler failed for ${messageId}:`,
                error,
              );
            }
          }
        }
      } catch (error) {
        if (!this.running) break;
        console.error("[redis-bus] consume error:", error);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async disconnect(): Promise<void> {
    this.running = false;
    await this.redis.quit();
  }
}
