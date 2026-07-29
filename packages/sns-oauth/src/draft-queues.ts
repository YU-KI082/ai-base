/**
 * Draft-queue publishers for platforms without live OAuth yet.
 * LinkedIn / YouTube Shorts / Pinterest / Facebook — queue optimized copy.
 * NEVER password-automate browser login.
 */

export type DraftQueueItem = {
  platform: string;
  title?: string;
  content: string;
  hashtags: string[];
  mediaUrl?: string | null;
  cta?: string;
};

export type DraftQueueResult = {
  status: "queued";
  externalPostId: string;
  message: string;
};

export type DraftQueuePublisher = {
  platform: string;
  publish(item: DraftQueueItem): Promise<DraftQueueResult>;
};

function queue(platform: string, item: DraftQueueItem): DraftQueueResult {
  const id = `${platform}-queue:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  return {
    status: "queued",
    externalPostId: id,
    message: `${platform} draft queued (OAuth/API pending). No password automation.`,
  };
}

export const linkedinDraftQueue: DraftQueuePublisher = {
  platform: "linkedin",
  async publish(item) {
    return queue("linkedin", item);
  },
};

export const youtubeShortsDraftQueue: DraftQueuePublisher = {
  platform: "youtube_shorts",
  async publish(item) {
    return queue("youtube_shorts", item);
  },
};

export const pinterestDraftQueue: DraftQueuePublisher = {
  platform: "pinterest",
  async publish(item) {
    return queue("pinterest", item);
  },
};

export const facebookDraftQueue: DraftQueuePublisher = {
  platform: "facebook",
  async publish(item) {
    return queue("facebook", item);
  },
};

export const DRAFT_QUEUE_PLATFORMS = [
  linkedinDraftQueue,
  youtubeShortsDraftQueue,
  pinterestDraftQueue,
  facebookDraftQueue,
] as const;

export function getDraftQueuePublisher(platform: string) {
  return DRAFT_QUEUE_PLATFORMS.find((p) => p.platform === platform) ?? null;
}
