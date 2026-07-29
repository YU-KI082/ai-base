/**
 * note.com publish provider — queue drafts when official API unavailable.
 * Swap implementation when note opens an official publish API.
 * NEVER automate browser login with ID/password.
 */

export type NoteDraft = {
  title: string;
  body: string;
  tags: string[];
  imageUrls?: string[];
  toolSlug?: string;
};

export type NotePublishResult = {
  status: "queued" | "published";
  externalPostId: string;
  message: string;
};

export type NotePublisher = {
  readonly name: string;
  isConfigured(): boolean;
  publish(draft: NoteDraft): Promise<NotePublishResult>;
};

/** Default: store as queued — operator or future API completes publish. */
export const noteDraftQueueProvider: NotePublisher = {
  name: "note_draft_queue",

  isConfigured() {
    return true;
  },

  async publish(draft) {
    const id = `note-queue:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    return {
      status: "queued",
      externalPostId: id,
      message: `note draft queued (title=${draft.title.slice(0, 40)}). Official API publish not enabled — no password automation.`,
    };
  },
};

/** Optional official/partner API when NOTE_API_URL + NOTE_API_KEY are set. */
export const noteApiProvider: NotePublisher = {
  name: "note_api",

  isConfigured() {
    return Boolean(
      process.env.NOTE_API_URL?.trim() && process.env.NOTE_API_KEY?.trim(),
    );
  },

  async publish(draft) {
    const url = process.env.NOTE_API_URL!.trim();
    const key = process.env.NOTE_API_KEY!.trim();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draft),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
    };
    if (!res.ok || !json.id) {
      throw new Error(json.error || `note API failed HTTP ${res.status}`);
    }
    return {
      status: "published",
      externalPostId: json.id,
      message: "Published via note API provider",
    };
  },
};

export function getNotePublisher(): NotePublisher {
  if (noteApiProvider.isConfigured()) return noteApiProvider;
  return noteDraftQueueProvider;
}
