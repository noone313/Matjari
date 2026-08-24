FROM node:24-slim
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @workspace/api-server build
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
