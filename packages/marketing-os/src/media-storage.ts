/**
 * Media storage port — images persist for real.
 * Default: database (URL/data URL in OsPhotoSession).
 * Optional: Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 */

export type StoredMedia = {
  url: string;
  backend: "database" | "blob";
  contentType: string;
};

export type MediaStoragePort = {
  id: string;
  putImage(input: {
    workspaceId: string;
    dataUrl: string;
    fileName?: string;
    contentType?: string;
  }): Promise<StoredMedia>;
};

function parseDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error("画像データが不正です");
  return {
    contentType: m[1] || "image/jpeg",
    buffer: Buffer.from(m[2]!, "base64"),
  };
}

export const databaseMediaStoragePort: MediaStoragePort = {
  id: "database",
  async putImage(input) {
    if (!input.dataUrl.startsWith("data:image/") && !/^https?:\/\//.test(input.dataUrl)) {
      throw new Error("画像データが不正です");
    }
    if (input.dataUrl.startsWith("http")) {
      return {
        url: input.dataUrl,
        backend: "database",
        contentType: input.contentType || "image/jpeg",
      };
    }
    const contentType = input.contentType || parseDataUrl(input.dataUrl).contentType;
    return {
      url: input.dataUrl,
      backend: "database",
      contentType,
    };
  },
};

export const blobMediaStoragePort: MediaStoragePort = {
  id: "vercel-blob",
  async putImage(input) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN が未設定です");
    }
    const { contentType, buffer } = parseDataUrl(input.dataUrl);
    const filename =
      input.fileName?.replace(/[^\w.\-]+/g, "_") ||
      `photo-${Date.now()}.jpg`;
    const pathname = `os/${input.workspaceId}/${Date.now()}-${filename}`;

    // REST upload (no SDK dependency — swap to @vercel/blob later if desired)
    const res = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-version": "7",
        "Content-Type": contentType,
      },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Blob upload failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { url?: string };
    if (!json.url) throw new Error("Blob upload returned no url");
    return { url: json.url, backend: "blob", contentType };
  },
};

let activePort: MediaStoragePort = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  ? blobMediaStoragePort
  : databaseMediaStoragePort;

export function getMediaStoragePort(): MediaStoragePort {
  return activePort;
}

export function registerMediaStoragePort(port: MediaStoragePort): void {
  activePort = port;
}

export async function storeOsImage(input: {
  workspaceId: string;
  dataUrl: string;
  fileName?: string;
  contentType?: string;
}): Promise<StoredMedia> {
  return getMediaStoragePort().putImage(input);
}
