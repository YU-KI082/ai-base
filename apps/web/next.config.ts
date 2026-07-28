import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-base/auth",
    "@ai-base/cache",
    "@ai-base/events",
    "@ai-base/i18n",
    "@ai-base/llm",
    "@ai-base/marketplace",
    "@ai-base/sns-learning",
    "@ai-base/affiliate-intel",
    "@ai-base/sns-oauth",
    "@ai-base/sns-auto-ops",
    "@ai-base/self-healing",
  ],
  // Keep Prisma (and the DB package that wraps it) outside the bundler so engines ship.
  serverExternalPackages: ["@prisma/client", "@ai-base/database", "ioredis"],
};

export default nextConfig;
