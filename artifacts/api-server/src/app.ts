import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile)
      if (!origin) return callback(null, true);
      // Allow any origin — the API is public and stateless
      callback(null, true);
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(compression({ threshold: 512 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ─── Centralized Error Handler ──────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  const status = (err as any).statusCode ?? 500;
  const message = status === 500 ? "حدث خطأ داخلي في الخادم" : err.message;
  const body: { error: string; detail?: string; stack?: string } = { error: message };
  if (status === 500 && process.env.DEBUG_ERRORS === "1") {
    body.detail = err.message;
    body.stack = err.stack;
  }
  res.status(status).json(body);
});

export default app;
