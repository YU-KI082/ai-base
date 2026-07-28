import type { AiBaseEvent } from "./types.js";
import type { EventBus, EventHandler, SubscribeOptions } from "./bus.js";

type Subscription = {
  options: SubscribeOptions;
  handler: EventHandler;
};

/**
 * In-memory bus for unit/integration tests.
 * At-least-once delivery within a single process.
 */
export class InMemoryEventBus implements EventBus {
  private readonly subscriptions: Subscription[] = [];
  private readonly history: AiBaseEvent[] = [];

  get published(): readonly AiBaseEvent[] {
    return this.history;
  }

  async publish(event: AiBaseEvent): Promise<void> {
    this.history.push(event);
    const matches = this.subscriptions.filter((s) =>
      s.options.topics.includes(event.type),
    );
    for (const sub of matches) {
      await sub.handler(event);
    }
  }

  async subscribe(
    options: SubscribeOptions,
    handler: EventHandler,
  ): Promise<{ stop: () => Promise<void> }> {
    const subscription = { options, handler };
    this.subscriptions.push(subscription);
    return {
      stop: async () => {
        const idx = this.subscriptions.indexOf(subscription);
        if (idx >= 0) this.subscriptions.splice(idx, 1);
      },
    };
  }
}
