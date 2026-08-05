# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (then apply the Gotcha below)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- **Local dev (Windows):** the API server runs from the built bundle — `pnpm --filter @workspace/api-server run build`, then start `node dist/index.mjs` with `DATABASE_URL`, `SESSION_SECRET`, `PORT=8080`, `NODE_ENV=development` (port 8080; frontend Vite dev server on 5173). After editing `routes/*.ts`, rebuild + restart the listener on 8080.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Short repo map + pointers to the source-of-truth files._

- **API contract (source of truth):** `lib/api-spec/openapi.yaml` — edit this first, then run codegen.
- **Generated clients (do not hand-edit):** `lib/api-zod/src/generated/` (Zod schemas/consts) and `lib/api-client-react/src/generated/` (React Query hooks). Hand-maintained barrel: `lib/api-zod/src/index.ts`.
- **DB schema:** `lib/db/src/schema/` — one file per table (`merchants.ts`, `products.ts`, `orders.ts`, `discounts.ts`, `push_subscriptions.ts`) + `index.ts` exports. Drizzle config: `lib/db/drizzle.config.ts`; migration push via `pnpm --filter @workspace/db run push`.
- **API routes:** `artifacts/api-server/src/routes/` — `storefront.ts` (public storefront: store, products, discounts validation, orders), `dashboard.ts` (merchant panel: stats/settings/products/orders/discounts), `auth.ts` (register/login/me), `images.ts`, `health.ts`. Auth middleware: `src/middleware/auth.ts`; push: `src/lib/push.ts`.
- **Frontend:** `artifacts/matjari/src/` — storefront pages `src/pages/store/` (Home, Product, Cart, Checkout, Confirmation), dashboard pages `src/pages/dashboard/` (Overview, Products, ProductForm, Orders, OrderDetail, Discounts, Settings), layouts `src/components/layout/` (`StoreLayout.tsx`, `DashboardLayout.tsx`), contexts `src/contexts/` (Auth, Cart).
- **Theme (gold/black luxury):** `artifacts/matjari/src/index.css` — CSS variables; `--primary: 43 74% 49%` is the gold; storefront uses `text-primary` for gold accents and `zinc-900` for black.

## Architecture decisions

- **Server-side search/filter** on the public products endpoint (not client-side) so it scales with inventory and stays shareable via URL (`?q=` / `?cat=`), with 300 ms debounce in the UI.
- **Overselling prevention:** order creation decrements stock atomically inside a `db.transaction` using `UPDATE ... SET stock = stock - qty WHERE id = ? AND stock >= qty`; an empty return rolls back and answers 409, so parallel orders can never oversell.
- **Discount-code validation** is a separate **no-side-effect** public endpoint `GET /stores/:slug/discounts/{code}/validate` for instant UI feedback, while the authoritative check still happens at order time (discount table has no expiry/scheduling columns yet).
- **Public store data is whitelisted field-by-field** in `GET /stores/:slug` (never spreads the row, so `passwordHash` can't leak); dashboard settings routes use a full-row spread, and additive settings fields flow through automatically.
- **Generated clients are committed**; the hand-maintained `lib/api-zod/src/index.ts` explicitly re-exports every type except `BrowseStoreProductsParams` (its zod const in `generated/api` collides with the same-named type).

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
