import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@ai-base/auth",
    "@ai-base/cache",
    "@ai-base/events",
    "@ai-base/i18n",
    "@ai-base/llm",
    "@ai-base/marketing-os",
    "@ai-base/marketplace",
    "@ai-base/sns-learning",
    "@ai-base/affiliate-intel",
    "@ai-base/sns-oauth",
    "@ai-base/sns-auto-ops",
    "@ai-base/self-healing",
  ],
  serverExternalPackages: [
    "@prisma/client",
    "@ai-base/database",
    "@neondatabase/serverless",
    "ioredis",
  ],
};

export default nextConfig;
