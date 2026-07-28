#!/usr/bin/env bash
# Deploy AI BASE web MVP to Vercel (no new features — ship current tree).
# Usage:
#   export VERCEL_TOKEN=...
#   export DATABASE_URL='postgresql://.../?pgbouncer=true'   # hosted Postgres
#   export ADMIN_OPS_SECRET='...'                            # 16+ chars
#   ./scripts/deploy-vercel.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN (https://vercel.com/account/tokens)}"
: "${DATABASE_URL:?Set DATABASE_URL to hosted Postgres (not localhost)}"
: "${ADMIN_OPS_SECRET:?Set ADMIN_OPS_SECRET (16+ chars)}"

if [[ "$DATABASE_URL" == *"localhost"* ]] || [[ "$DATABASE_URL" == *"127.0.0.1"* ]]; then
  echo "DATABASE_URL must be a hosted Postgres URL for Vercel." >&2
  exit 1
fi

export NEXT_PUBLIC_DEFAULT_LOCALE="${NEXT_PUBLIC_DEFAULT_LOCALE:-ja}"
export CACHE_BACKEND="${CACHE_BACKEND:-memory}"
export LLM_PROVIDER="${LLM_PROVIDER:-mock}"
export EMBEDDING_PROVIDER="${EMBEDDING_PROVIDER:-mock}"
export VECTOR_BACKEND="${VECTOR_BACKEND:-memory}"

echo "==> Push schema + seed to production DB"
DATABASE_URL="$DATABASE_URL" pnpm db:generate
DATABASE_URL="$DATABASE_URL" pnpm db:push
DATABASE_URL="$DATABASE_URL" pnpm db:seed

echo "==> Link / deploy apps/web (monorepo root as project)"
npx --yes vercel@39.4.2 pull --yes --environment=production --token "$VERCEL_TOKEN" || true

# Prefer root vercel.json so install/build see the monorepo
DEPLOY_OUT="$(npx --yes vercel@39.4.2 deploy --prod --yes --token "$VERCEL_TOKEN" \
  --build-env NEXT_PUBLIC_DEFAULT_LOCALE="$NEXT_PUBLIC_DEFAULT_LOCALE" \
  --env DATABASE_URL="$DATABASE_URL" \
  --env ADMIN_OPS_SECRET="$ADMIN_OPS_SECRET" \
  --env CACHE_BACKEND="$CACHE_BACKEND" \
  --env LLM_PROVIDER="$LLM_PROVIDER" \
  --env EMBEDDING_PROVIDER="$EMBEDDING_PROVIDER" \
  --env VECTOR_BACKEND="$VECTOR_BACKEND" \
  --env NEXT_PUBLIC_DEFAULT_LOCALE="$NEXT_PUBLIC_DEFAULT_LOCALE")"

URL="$(echo "$DEPLOY_OUT" | tail -n 1)"
echo "==> Deployed: $URL"

if [[ -n "${NEXT_PUBLIC_SITE_URL:-}" ]]; then
  SITE="$NEXT_PUBLIC_SITE_URL"
else
  SITE="$URL"
fi

npx --yes vercel@39.4.2 env add NEXT_PUBLIC_SITE_URL production --token "$VERCEL_TOKEN" <<<"$SITE" || true
echo "Set NEXT_PUBLIC_SITE_URL=$SITE (re-deploy if this was first set)"
echo "$URL"
