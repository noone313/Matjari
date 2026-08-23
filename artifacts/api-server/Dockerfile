FROM node:24-slim
WORKDIR /app
COPY dist/ ./dist/
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
