import type { AiBaseEvent } from "./types.js";

export type EventHandler = (event: AiBaseEvent) => Promise<void>;

export type SubscribeOptions = {
  group: string;
  consumer: string;
  topics: string[];
};

export interface EventBus {
  publish(event: AiBaseEvent): Promise<void>;
  subscribe(
    options: SubscribeOptions,
    handler: EventHandler,
  ): Promise<{ stop: () => Promise<void> }>;
}
