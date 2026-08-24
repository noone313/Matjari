FROM node:24-slim
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/matjari/package.json ./artifacts/matjari/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @workspace/matjari build
FROM node:24-slim
RUN npm install -g serve
WORKDIR /app
COPY --from=0 /app/artifacts/matjari/dist ./dist
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000} --listen 0.0.0.0"]
