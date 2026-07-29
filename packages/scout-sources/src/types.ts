export type DiscoveredTool = {
  name: string;
  homepageUrl: string;
  sourceName: string;
  sourceUrl?: string;
  externalId?: string;
  description?: string;
  categoryHints?: string[];
  raw?: Record<string, unknown>;
};

export type ScoutSourceProvider = {
  name: string;
  isConfigured(): boolean;
  discover(limit?: number): Promise<DiscoveredTool[]>;
};
