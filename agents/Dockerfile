# Shared agent worker image pattern (build with --build-arg AGENT=scout)
ARG AGENT=scout
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY agents/${AGENT} ./agents/${AGENT}
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ai-base/database generate
RUN pnpm --filter @ai-base/agent-${AGENT} build
CMD ["sh", "-c", "node agents/${AGENT}/dist/main.js"]
