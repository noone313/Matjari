---
name: Matjari platform
description: Architecture decisions, auth pattern, orval quirks, and routing pitfalls for the متجري SaaS storefront project
---

# Matjari Platform — Durable Notes

## Auth
- JWT signed with SESSION_SECRET, stored in localStorage as `matjari_token`
- custom-fetch.ts already pre-configured: `_authTokenGetter = () => localStorage.getItem("matjari_token")`
- Dashboard routes require `requireAuth` middleware from `artifacts/api-server/src/middleware/auth.ts`
- Demo merchant: `nawaf@demo.com` / `demo1234` / slug `nawaf-parfum`

## Orval codegen quirk — params collision
**Why:** Endpoints with BOTH a path param AND query params cause Orval (split mode) to generate `<OpId>Params` in both `types/` and `api.ts`, colliding on barrel re-export.
**Fix:** Remove query params from any endpoint that already has a path param. Do client-side filtering instead. Applied to `browseStoreProducts`.

## Wouter routing — slug prop not passed
**Why:** When using `component={Page}` in a nested `<Route>`, Wouter passes `{ params: { slug } }` to the component, NOT `{ slug }` directly. Parent layout gets slug via its own route params but children get wrong prop shape.
**Fix:** Use render-function syntax in nested routes: `<Route path="...">{(p) => <Page slug={slug} />}</Route>` — pass slug from the parent StoreRouter closure.

## Generated hook call pattern
When passing `enabled`, MUST also pass `queryKey` or TypeScript fails:
```ts
useGetStore(slug, { query: { enabled: !!slug, queryKey: getGetStoreQueryKey(slug) } })
```

## Mutation slug requirement
`useValidateDiscount` and `usePlaceOrder` require `{ slug, data }` — slug is the store slug, NOT optional.

## DB schema
- `merchants` → `products` + `product_variants` → `orders` + `order_items`
- `discount_codes` unique on (merchant_id, code)
- All cascade on delete from merchant
- Prices stored as integers (Iraqi Dinar, smallest unit = 1 IQD)

## useToast import path
Correct: `@/hooks/use-toast` — NOT `@/components/ui/use-toast`
