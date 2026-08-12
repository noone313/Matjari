import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

export default defineConfig(async ({ command }) => {
  const isBuild = command === 'build';

  // PORT is only needed when actually serving (dev server / preview).
  // It is a Replit-specific requirement: the platform assigns a port that the
  // dev server must bind to. During `vite build` there is no server, so PORT
  // must not be required (Railway does not set it at build time).
  let port: number | undefined;
  if (!isBuild) {
    const rawPort = process.env.PORT;

    if (!rawPort) {
      throw new Error(
        'PORT environment variable is required but was not provided.',
      );
    }

    const parsedPort = Number(rawPort);

    if (Number.isNaN(parsedPort) || parsedPort <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }

    port = parsedPort;
  }

  const basePath = process.env.BASE_PATH ?? '/';

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== 'production' &&
      process.env.REPL_ID !== undefined
        ? [
            await import('@replit/vite-plugin-cartographer').then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, '..'),
              }),
            ),
            await import('@replit/vite-plugin-dev-banner').then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      ...(isBuild ? {} : { port, strictPort: true }),
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
      // Local dev only: proxy /api to the API server (Replit handles this via platform routing)
      ...(process.env.REPL_ID
        ? {}
        : {
            proxy: {
              '/api': {
                target: `http://localhost:${process.env.API_PORT ?? 8080}`,
                changeOrigin: true,
              },
            },
          }),
    },
    preview: {
      ...(isBuild ? {} : { port }),
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
