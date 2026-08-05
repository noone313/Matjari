// Load .env from project root when running locally.
// Must be imported FIRST in index.ts so dotenv runs before any other module
// (e.g. @workspace/db) reads process.env at import time.
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), "../../.env") }); // monorepo root
config({ path: resolve(process.cwd(), ".env") });       // artifact root fallback
