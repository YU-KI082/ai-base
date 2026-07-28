import type { EventBus } from "./bus.js";
import { InMemoryEventBus } from "./in-memory-bus.js";
import { RedisStreamsEventBus } from "./redis-streams-bus.js";

export function createEventBus(
  kind: "redis" | "memory" = process.env.EVENT_BUS === "memory"
    ? "memory"
    : "redis",
): EventBus {
  if (kind === "memory") return new InMemoryEventBus();
  return new RedisStreamsEventBus();
}

export * from "./types.js";
export * from "./bus.js";
export * from "./in-memory-bus.js";
export * from "./redis-streams-bus.js";
export * from "./outbox.js";
export { runOutboxRelay } from "./outbox-relay.js";
