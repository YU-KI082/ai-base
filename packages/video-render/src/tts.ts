/**
 * Optional TTS / BGM / SFX providers for Video Agent.
 * ElevenLabs when ELEVENLABS_API_KEY is set; otherwise silent/ffmpeg drawtext only.
 */

export type TtsProvider = {
  name: string;
  isAvailable(): Promise<boolean>;
  synthesize(input: {
    text: string;
    locale?: string;
  }): Promise<{ audioUrl?: string; localPath?: string; provider: string }>;
};

export const elevenLabsTtsProvider: TtsProvider = {
  name: "elevenlabs",

  async isAvailable() {
    return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  },

  async synthesize(input) {
    const key = process.env.ELEVENLABS_API_KEY?.trim();
    const voice =
      process.env.ELEVENLABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
    if (!key) throw new Error("ELEVENLABS_API_KEY not configured");

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: input.text.slice(0, 2500),
          model_id: "eleven_multilingual_v2",
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`ElevenLabs TTS failed HTTP ${res.status}`);
    }
    // Caller may persist bytes; we return a data URL hint only (no secrets logged)
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      provider: "elevenlabs",
      audioUrl: `data:audio/mpeg;base64,${buf.toString("base64").slice(0, 32)}…`,
      localPath: undefined,
    };
  },
};

export const silentTtsProvider: TtsProvider = {
  name: "silent",
  async isAvailable() {
    return true;
  },
  async synthesize() {
    return { provider: "silent" };
  },
};

export async function getTtsProvider(): Promise<TtsProvider> {
  if (await elevenLabsTtsProvider.isAvailable()) return elevenLabsTtsProvider;
  return silentTtsProvider;
}
