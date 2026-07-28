import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  // Monorepo: trace files from workspace root so Prisma engines are packaged.
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/.prisma/client/**",
      "./node_modules/@prisma/client/**",
      "../../node_modules/.prisma/client/**",
      "../../node_modules/@prisma/client/**",
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**",
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**",
    ],
  },
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
