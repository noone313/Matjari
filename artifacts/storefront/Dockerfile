FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/storefront/package.json ./artifacts/storefront/
COPY lib/api-client-react/package.json ./lib/api-client-react/ 2>/dev/null || true
COPY lib/api-spec/package.json ./lib/api-spec/ 2>/dev/null || true
COPY lib/api-zod/package.json ./lib/api-zod/ 2>/dev/null || true
COPY lib/db/package.json ./lib/db/ 2>/dev/null || true
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/artifacts/storefront/node_modules ./artifacts/storefront/node_modules 2>/dev/null || true
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN pnpm --filter @workspace/storefront build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/artifacts/storefront/.next/standalone ./
COPY --from=builder /app/artifacts/storefront/.next/static ./artifacts/storefront/.next/static
COPY --from=builder /app/artifacts/storefront/public ./artifacts/storefront/public 2>/dev/null || true

EXPOSE 3000
CMD ["node", "artifacts/storefront/server.js"]
