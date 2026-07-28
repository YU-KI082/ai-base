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
  ],
  serverExternalPackages: ["@prisma/client", "ioredis"],
};

export default nextConfig;
