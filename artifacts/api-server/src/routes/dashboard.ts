import { Router } from "express";
import multer from "multer";
import { db, merchantsTable, productsTable, productVariantsTable, productImagesTable, ordersTable, orderItemsTable, discountCodesTable, pushSubscriptionsTable, reviewsTable, stockNotificationsTable, bundlesTable, bundleItemsTable } from "@workspace/db";
import { eq, and, gte, sql, desc, count, inArray, notInArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { VAPID_PUBLIC_KEY, sendPushToMerchant } from "../lib/push";
import * as statsController from "../controllers/dashboard/stats.controller";
import * as discountsController from "../controllers/dashboard/discounts.controller";
import * as reviewsController from "../controllers/dashboard/reviews.controller";
import * as stockNotificationsController from "../controllers/dashboard/stock-notifications.controller";
import * as bundlesController from "../controllers/dashboard/bundles.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

/** Insert uploaded files into product_images, return their /api/images/:id URLs */
async function saveImages(productId: number, files: Express.Multer.File[]): Promise<string[]> {
  if (!files.length) return [];
  const rows = await db
    .insert(productImagesTable)
    .values(files.map((f) => ({ productId, data: f.buffer, mimeType: f.mimetype })))
    .returning({ id: productImagesTable.id });
  return rows.map((r) => `/api/images/${r.id}`);
}
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

router.get("/products", async (req: AuthRequest, res): Promise<void> => {
  const params = ListOrdersQueryParams.safeParse(req.query);
  const category = req.query.category as string | undefined;
  const q = req.query.q as string | undefined;

  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.merchantId, req.merchantId!))
    .orderBy(desc(productsTable.createdAt));

  const variants = products.length > 0
    ? await db
        .select()
        .from(productVariantsTable)
        .where(inArray(productVariantsTable.productId, products.map((p) => p.id)))
    : [];

  let result = products.map((p) => ({
    ...p,
    variants: variants.filter((v) => v.productId === p.id),
  }));

  if (category && category !== "all") {
    result = result.filter((p) => p.category === category);
  }
  if (q) {
    const lower = q.toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(lower));
  }

  res.json(result);
});

router.post("/products", upload.array("images", 10), async (req: AuthRequest, res): Promise<void> => {
  let body: unknown;
  try { body = JSON.parse(req.body.data ?? "{}"); } catch { res.status(400).json({ error: "Invalid JSON in data field" }); return; }

  const parsed = CreateProductBody.shape.data.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { variants: variantInputs, ...productData } = parsed.data;

  const [product] = await db
    .insert(productsTable)
    .values({
      ...productData,
      category: productData.category as any,
      merchantId: req.merchantId!,
      imageUrls: [],
    })
    .returning();

  const files = (req.files as Express.Multer.File[]) ?? [];
  const imageUrls = await saveImages(product.id, files);
  if (imageUrls.length) {
    await db.update(productsTable).set({ imageUrls }).where(eq(productsTable.id, product.id));
  }

  const insertedVariants =
    variantInputs && variantInputs.length > 0
      ? await db
          .insert(productVariantsTable)
          .values(variantInputs.map((v) => ({ ...v, productId: product.id, stock: v.stock ?? 0 })))
          .returning()
      : [];

  res.status(201).json({ ...product, imageUrls, variants: insertedVariants });
});

router.get("/products/:id", async (req: AuthRequest, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.merchantId, req.merchantId!)))
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  const variants = await db
    .select()
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, product.id));

  res.json({ ...product, variants });
});

router.put("/products/:id", upload.array("images", 10), async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "معرّف غير صالح" }); return; }

  let body: unknown;
  try { body = JSON.parse(req.body.data ?? "{}"); } catch { res.status(400).json({ error: "Invalid JSON in data field" }); return; }

  const parsed = UpdateProductBody.shape.data.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { variants: variantInputs, ...productData } = parsed.data;

  // keepUrls = existing image URLs the client wants to keep (JSON array in form field)
  let keepUrls: string[] = [];
  try { keepUrls = JSON.parse(req.body.keepUrls ?? "[]"); } catch { keepUrls = []; }

  // Remove images not in keepUrls (they were deleted by the user)
  const existingImages = await db
    .select({ id: productImagesTable.id, url: sql<string>`'/api/images/' || ${productImagesTable.id}` })
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, params.data.id));

  const idsToDelete = existingImages
    .filter((img) => !keepUrls.includes(img.url))
    .map((img) => img.id);
  if (idsToDelete.length) {
    await db.delete(productImagesTable).where(inArray(productImagesTable.id, idsToDelete));
  }

  // Upload new images
  const files = (req.files as Express.Multer.File[]) ?? [];
  const newUrls = await saveImages(params.data.id, files);

  // Final imageUrls = kept + new
  const imageUrls = [...keepUrls.filter((u) => u.startsWith("/api/images/")), ...newUrls];

  const [product] = await db
    .update(productsTable)
    .set({ ...productData, category: productData.category as any, imageUrls })
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.merchantId, req.merchantId!)))
    .returning();

  if (!product) { res.status(404).json({ error: "المنتج غير موجود" }); return; }

  // Replace variants
  let updatedVariants: typeof productVariantsTable.$inferSelect[] = [];
  if (variantInputs !== undefined) {
    await db.delete(productVariantsTable).where(eq(productVariantsTable.productId, product.id));
    if (variantInputs.length > 0) {
      updatedVariants = await db
        .insert(productVariantsTable)
        .values(variantInputs.map((v) => ({ ...v, productId: product.id, stock: v.stock ?? 0 })))
        .returning();
    }
  } else {
    updatedVariants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, product.id));
  }

  res.json({ ...product, variants: updatedVariants });
});

router.delete("/products/:id", async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [deleted] = await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.merchantId, req.merchantId!)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  res.sendStatus(204);
});

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
