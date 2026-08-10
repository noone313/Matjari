import { Router } from "express";
import { db, merchantsTable, productsTable, productVariantsTable, ordersTable, orderItemsTable, discountCodesTable, pushSubscriptionsTable, reviewsTable, stockNotificationsTable, bundlesTable, bundleItemsTable } from "@workspace/db";
import { eq, and, gte, sql, desc, count, inArray, notInArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { VAPID_PUBLIC_KEY, sendPushToMerchant } from "../lib/push";
import * as statsController from "../controllers/dashboard/stats.controller";
import * as discountsController from "../controllers/dashboard/discounts.controller";
import * as reviewsController from "../controllers/dashboard/reviews.controller";
import * as stockNotificationsController from "../controllers/dashboard/stock-notifications.controller";
import * as bundlesController from "../controllers/dashboard/bundles.controller";
import * as productsController from "../controllers/dashboard/products.controller";

import {
  UpdateDashboardSettingsBody,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
  GetProductParams,
  ListOrdersQueryParams,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  DeleteDiscountParams,
  ToggleDiscountParams,
  CreateDiscountBody,
  ListReviewsQueryParams,
  DecideReviewParams,
  DecideReviewBody,
  DeleteReviewParams,
  ListStockNotificationsQueryParams,
  UpdateStockNotificationParams,
  UpdateStockNotificationBody,
  CreateBundleBody,
  UpdateBundleBody,
  UpdateBundleParams,
  DeleteBundleParams,
} from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get("/stats", statsController.getDashboardStats);

// ─── Settings ────────────────────────────────────────────────────────────────

router.get("/settings", async (req: AuthRequest, res): Promise<void> => {
  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.id, req.merchantId!))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "التاجر غير موجود" });
    return;
  }

  const [productCountRow] = await db
    .select({ c: count() })
    .from(productsTable)
    .where(eq(productsTable.merchantId, merchant.id));

  const [orderCountRow] = await db
    .select({ c: count() })
    .from(ordersTable)
    .where(eq(ordersTable.merchantId, merchant.id));

  res.json({
    ...merchant,
    productCount: Number(productCountRow?.c ?? 0),
    orderCount: Number(orderCountRow?.c ?? 0),
  });
});

router.put("/settings", async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateDashboardSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(merchantsTable)
    .set(parsed.data)
    .where(eq(merchantsTable.id, req.merchantId!))
    .returning();

  res.json({ ...updated, productCount: null, orderCount: null });
});

// ─── Products ────────────────────────────────────────────────────────────────
router.get("/products", productsController.getProducts);
router.post("/products", productsController.upload.array("images", 10), productsController.createProduct);
router.get("/products/:id", productsController.getProduct);
router.put("/products/:id", productsController.upload.array("images", 10), productsController.updateProduct);
router.delete("/products/:id", productsController.deleteProduct);

// ─── Orders ──────────────────────────────────────────────────────────────────

router.get("/orders", async (req: AuthRequest, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = 20;

  const conditions = [eq(ordersTable.merchantId, req.merchantId!)];
  if (status) {
    conditions.push(sql`${ordersTable.status} = ${status}`);
  }

  const [totalRow] = await db
    .select({ c: count() })
    .from(ordersTable)
    .where(and(...conditions));

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({
    orders,
    total: Number(totalRow?.c ?? 0),
    page,
    pageSize,
  });
});

router.get("/orders/:id", async (req: AuthRequest, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.merchantId, req.merchantId!)))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));

  res.json({ ...order, items });
});

router.patch("/orders/:id/status", async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status as any })
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.merchantId, req.merchantId!)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  res.json(updated);
});

// ─── Discounts ───────────────────────────────────────────────────────────────

router.get("/discounts", discountsController.listDiscounts);
router.post("/discounts", discountsController.createDiscount);
router.delete("/discounts/:id", discountsController.deleteDiscount);
router.patch("/discounts/:id/toggle", discountsController.toggleDiscount);
router.get("/stores/:slug/discounts/validate", discountsController.validateDiscountCode);

// ─── Reviews ────────────────────────────────────────────────────────────────
router.get("/reviews", reviewsController.listReviews);
router.patch("/reviews/:id", reviewsController.decideReview);
router.delete("/reviews/:id", reviewsController.deleteReview);

// ─── Stock Notifications ─────────────────────────────────────────────────────

// ─── Stock Notifications ─────────────────────────────────────────────────────

router.get("/stock-notifications", stockNotificationsController.listStockNotifications);
router.patch("/stock-notifications/:id", stockNotificationsController.updateStockNotification);

// ─── Bundles ─────────────────────────────────────────────────────────────────

router.get("/bundles", bundlesController.listBundles);
router.post("/bundles", bundlesController.createBundle);
router.put("/bundles/:id", bundlesController.updateBundle);
router.delete("/bundles/:id", bundlesController.deleteBundle);

// ─── Push Notifications ──────────────────────────────────────────────────────

/** GET /dashboard/push/vapid-public-key — return the public VAPID key so the
 *  client can subscribe without exposing the private key. */
router.get("/push/vapid-public-key", (_req, res): void => {
  if (!VAPID_PUBLIC_KEY) {
    res.status(503).json({ error: "Push notifications not configured" });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/** POST /dashboard/push/subscribe — save a PushSubscription for this merchant. */
router.post("/push/subscribe", async (req: AuthRequest, res): Promise<void> => {
  const { endpoint, keys } = req.body ?? {};
  if (
    typeof endpoint !== "string" ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    res.status(400).json({ error: "بيانات الاشتراك غير صالحة" });
    return;
  }

  // Upsert: if the endpoint already exists for this merchant, update keys;
  // if it exists for a different merchant (device transfer), replace it.
  await db
    .delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint));

  await db.insert(pushSubscriptionsTable).values({
    merchantId: req.merchantId!,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  res.sendStatus(201);
});

/** DELETE /dashboard/push/unsubscribe — remove all push subscriptions for
 *  this merchant on the given endpoint. */
router.delete("/push/unsubscribe", async (req: AuthRequest, res): Promise<void> => {
  const { endpoint } = req.body ?? {};
  if (typeof endpoint === "string") {
    await db
      .delete(pushSubscriptionsTable)
      .where(
        and(
          eq(pushSubscriptionsTable.merchantId, req.merchantId!),
          eq(pushSubscriptionsTable.endpoint, endpoint),
        ),
      );
  }
  res.sendStatus(204);
});

export default router;
