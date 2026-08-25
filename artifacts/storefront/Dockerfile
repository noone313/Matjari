FROM node:24-slim
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/storefront/package.json ./artifacts/storefront/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @workspace/storefront build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=0 /app/artifacts/storefront/.next/standalone ./
COPY --from=0 /app/artifacts/storefront/.next/static ./artifacts/storefront/.next/static
EXPOSE 3000
CMD ["node", "artifacts/storefront/server.js"]
