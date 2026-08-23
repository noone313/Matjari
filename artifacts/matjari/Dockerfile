FROM node:24-slim
RUN npm install -g serve
WORKDIR /app
COPY dist/ ./dist/
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000} --listen 0.0.0.0"]
