# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

### After every codegen run, remove the duplicate re-export line from `lib/api-zod/src/index.ts`

- **Recurring:** Yes — orval appends `export * from './generated/types';` to the end of the hand-maintained `lib/api-zod/src/index.ts` **every single time** `pnpm --filter @workspace/api-spec run codegen` runs. It will reappear after every future codegen run.
- **Why it breaks:** the first line `export * from "./generated/api"` already exports the zod const `BrowseStoreProductsParams`, while `generated/types` exports a *type* of the same name. The appended barrel re-export makes the two collide, and typecheck fails with:
  `lib/api-zod/src/index.ts: error TS2308: Module "./generated/api" has already exported a member named 'BrowseStoreProductsParams'`.
- **Exact fix steps (in this order):**
  1. Run codegen: `pnpm --filter @workspace/api-spec run codegen`
  2. Open `lib/api-zod/src/index.ts` and delete the last line, which is exactly:
     `export * from './generated/types';`
  3. Do **not** touch the explicit `export type { ... } from "./generated/types";` block above it — it intentionally lists every type except `BrowseStoreProductsParams` (which collides).
  4. Run `pnpm run typecheck` — must pass.
- Example: before typecheck, the file must end with `} from "./generated/types";` and have **no** extra trailing export line.

_Sharp edges: "always run X before Y" rules go here._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
