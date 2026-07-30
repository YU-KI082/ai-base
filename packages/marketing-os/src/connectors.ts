import type { OsPlatform, SnsConnectorPort } from "./types.js";

const manual = (platform: OsPlatform): SnsConnectorPort => ({
  platform,
  capabilities: { oauth: false, publish: false, insights: false },
});

const registry: Record<OsPlatform, SnsConnectorPort> = {
  instagram: manual("instagram"),
  tiktok: manual("tiktok"),
  x: manual("x"),
  threads: manual("threads"),
  youtube: manual("youtube"),
};

export function getConnector(platform: OsPlatform): SnsConnectorPort {
  return registry[platform];
}

export function listConnectors(): SnsConnectorPort[] {
  return Object.values(registry);
}

/** Register a real API connector later (Instagram etc.). */
export function registerConnector(port: SnsConnectorPort): void {
  registry[port.platform] = port;
}
