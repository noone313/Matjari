import { Router } from "express";
import multer from "multer";
import { db, merchantsTable, productsTable, productVariantsTable, productImagesTable, ordersTable, orderItemsTable, discountCodesTable, pushSubscriptionsTable } from "@workspace/db";
import { eq, and, gte, sql, desc, count, inArray, notInArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { VAPID_PUBLIC_KEY, sendPushToMerchant } from "../lib/push";

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
} from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get("/stats", async (req: AuthRequest, res): Promise<void> => {
  const merchantId = req.merchantId!;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Orders this month + revenue this month
  const monthlyOrders = await db
    .select({ count: count(), revenue: sql<number>`coalesce(sum(${ordersTable.total}), 0)` })
    .from(ordersTable)
    .where(and(eq(ordersTable.merchantId, merchantId), gte(ordersTable.createdAt, startOfMonth)));

  // Total orders + revenue
  const totalStats = await db
    .select({ count: count(), revenue: sql<number>`coalesce(sum(${ordersTable.total}), 0)` })
    .from(ordersTable)
    .where(eq(ordersTable.merchantId, merchantId));

  // Top 5 products by units sold
  const topProducts = await db
    .select({
      productId: orderItemsTable.variantId,
      productName: orderItemsTable.productName,
      totalSold: sql<number>`sum(${orderItemsTable.quantity})`,
      totalRevenue: sql<number>`sum(${orderItemsTable.quantity} * ${orderItemsTable.priceAtOrder})`,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.merchantId, merchantId))
    .groupBy(orderItemsTable.variantId, orderItemsTable.productName)
    .orderBy(sql`sum(${orderItemsTable.quantity}) desc`)
    .limit(5);

  // New orders count (status = 'new')
  const [newOrdersRow] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.merchantId, merchantId), eq(ordersTable.status, "new")));

  // Orders by status
  const statusCounts = await db
    .select({ status: ordersTable.status, count: count() })
    .from(ordersTable)
    .where(eq(ordersTable.merchantId, merchantId))
    .groupBy(ordersTable.status);

  // Recent 10 orders
  const recentOrders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.merchantId, merchantId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);

  res.json({
    ordersThisMonth: Number(monthlyOrders[0]?.count ?? 0),
    revenueThisMonth: Number(monthlyOrders[0]?.revenue ?? 0),
    totalOrders: Number(totalStats[0]?.count ?? 0),
    totalRevenue: Number(totalStats[0]?.revenue ?? 0),
    newOrdersCount: Number(newOrdersRow?.count ?? 0),
    topProducts: topProducts.map((p) => ({
      productId: p.productId ?? 0,
      productName: p.productName,
      totalSold: Number(p.totalSold),
      totalRevenue: Number(p.totalRevenue),
    })),
    ordersByStatus: statusCounts.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    recentOrders,
  });
});

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

router.get("/discounts", async (req: AuthRequest, res): Promise<void> => {
  const codes = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.merchantId, req.merchantId!))
    .orderBy(desc(discountCodesTable.createdAt));

  res.json(codes);
});

router.post("/discounts", async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateDiscountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [code] = await db
    .insert(discountCodesTable)
    .values({
      merchantId: req.merchantId!,
      code: parsed.data.code.toUpperCase(),
      percentOff: parsed.data.percentOff,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();

  res.status(201).json(code);
});

router.delete("/discounts/:id", async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteDiscountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  await db
    .delete(discountCodesTable)
    .where(and(eq(discountCodesTable.id, params.data.id), eq(discountCodesTable.merchantId, req.merchantId!)));

  res.sendStatus(204);
});

router.patch("/discounts/:id/toggle", async (req: AuthRequest, res): Promise<void> => {
  const params = ToggleDiscountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [current] = await db
    .select()
    .from(discountCodesTable)
    .where(and(eq(discountCodesTable.id, params.data.id), eq(discountCodesTable.merchantId, req.merchantId!)))
    .limit(1);

  if (!current) {
    res.status(404).json({ error: "كود الخصم غير موجود" });
    return;
  }

  const [updated] = await db
    .update(discountCodesTable)
    .set({ isActive: !current.isActive })
    .where(eq(discountCodesTable.id, current.id))
    .returning();

  res.json(updated);
});

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
