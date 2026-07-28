import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: [
    "@ai-base/auth",
    "@ai-base/cache",
    "@ai-base/database",
    "@ai-base/events",
    "@ai-base/i18n",
    "@ai-base/llm",
    "@ai-base/marketplace",
    "@ai-base/sns-learning",
    "@ai-base/affiliate-intel",
  ],
  serverExternalPackages: ["@prisma/client", "@ai-base/database", "ioredis"],
};

export default nextConfig;
