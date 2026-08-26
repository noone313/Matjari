import { Router, type Response } from "express";
import { db, merchantsTable, productsTable, productVariantsTable, ordersTable, orderItemsTable, discountCodesTable, reviewsTable, stockNotificationsTable, bundlesTable, bundleItemsTable, heroSlidesTable, categoriesTable, attributeDefinitionsTable, productAttributeValuesTable } from "@workspace/db";
import { eq, and, ilike, sql, gte, ne, desc, count, avg, inArray, asc } from "drizzle-orm";
import { sendPushToMerchant } from "../lib/push";
import {
  GetStoreParams,
  BrowseStoreProductsParams,
  BrowseStoreProductsQueryParams,
  GetStoreProductParams,
  GetRelatedProductsParams,
  GetProductReviewsParams,
  CreateProductReviewParams,
  CreateProductReviewBody,
  ValidateDiscountParams,
  ValidateDiscountBody,
  ValidateDiscountCodeParams,
  PlaceOrderParams,
  PlaceOrderBody,
  CreateStockNotificationParams,
  CreateStockNotificationBody,
  BrowseStoreBundlesParams,
  GetStoreOrderParams,
  GetStoreOrderQueryParams,
} from "@workspace/api-zod";

const router = Router();

function setCache(res: Response, seconds: number) {
  res.set("Cache-Control", `public, max-age=${seconds}, s-maxage=${seconds}`);
}

// Compute the discount amount (IQD) for a subtotal. Returns null when the
// discount does not apply (e.g. min order not reached).
function computeDiscountAmount(discount: typeof discountCodesTable.$inferSelect, subtotal: number): number | null {
  if (discount.minOrderTotal != null && subtotal < discount.minOrderTotal) return null;
  if (discount.amountOff != null) return Math.min(discount.amountOff, subtotal);
  if (discount.percentOff != null) return Math.round((subtotal * discount.percentOff) / 100);
  return null;
}

// GET /stores/:slug
router.get("/:slug", async (req, res): Promise<void> => {
  const params = GetStoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const heroSlides = merchant.heroEnabled
    ? await db
        .select({
          id: heroSlidesTable.id,
          merchantId: heroSlidesTable.merchantId,
          title: heroSlidesTable.title,
          subtitle: heroSlidesTable.subtitle,
          linkUrl: heroSlidesTable.linkUrl,
          position: heroSlidesTable.position,
          imageData: heroSlidesTable.imageData,
          imageMime: heroSlidesTable.imageMime,
          isActive: heroSlidesTable.isActive,
          createdAt: heroSlidesTable.createdAt,
        })
        .from(heroSlidesTable)
        .where(and(eq(heroSlidesTable.merchantId, merchant.id), eq(heroSlidesTable.isActive, true)))
        .orderBy(heroSlidesTable.position, heroSlidesTable.id)
    : [];

  setCache(res, 60);
  res.json({
    slug: merchant.slug,
    storeName: merchant.storeName,
    logoUrl: merchant.logoUrl,
    bannerUrl: merchant.bannerUrl,
    heroEnabled: merchant.heroEnabled,
    heroSlides: heroSlides.map((s) => ({
      id: s.id,
      merchantId: s.merchantId,
      title: s.title,
      subtitle: s.subtitle,
      linkUrl: s.linkUrl,
      position: s.position,
      imageUrl: s.imageData ? `/api/hero/${s.id}/image` : null,
      isActive: s.isActive,
      createdAt: s.createdAt,
    })),
    description: merchant.description,
    accentColor: merchant.accentColor,
    phone: merchant.phone,
    bankTransferInfo: merchant.bankTransferInfo,
    instagramHandle: merchant.instagramHandle,
    whatsappNumber: merchant.whatsappNumber,
    createdAt: merchant.createdAt,
  });
});

// GET /stores/:slug/categories
router.get("/:slug/categories", async (req, res): Promise<void> => {
  const params = GetStoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.merchantId, merchant.id), eq(categoriesTable.isActive, true)))
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));

  setCache(res, 60);
  res.json(categories);
});

// GET /stores/:slug/products
router.get("/:slug/products", async (req, res): Promise<void> => {
  const params = BrowseStoreProductsParams.safeParse(req.params);
  const query = BrowseStoreProductsQueryParams.safeParse(req.query);

  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  if (!query.success) {
    res.status(400).json({ error: "بيانات البحث غير صالحة" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const { search, category } = query.data;

  const filters = [
    eq(productsTable.merchantId, merchant.id),
    eq(productsTable.isActive, true),
  ];

  if (category) {
    filters.push(eq(productsTable.category, category as any));
  }

  if (search && search.trim()) {
    filters.push(ilike(productsTable.name, `%${search.trim()}%`));
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(and(...filters));

  // Fetch all variants for all products efficiently
  const variantMap = new Map<number, typeof productVariantsTable.$inferSelect[]>();
  if (products.length > 0) {
    const allProductVariants = await db.execute(
      `SELECT * FROM product_variants WHERE product_id = ANY(ARRAY[${products.map((p) => p.id).join(",")}])`,
    ) as any;

    const rows = allProductVariants.rows ?? allProductVariants;
    for (const row of rows) {
      const pid = row.product_id;
      if (!variantMap.has(pid)) variantMap.set(pid, []);
      variantMap.get(pid)!.push({
        id: row.id,
        productId: row.product_id,
        variantLabel: row.variant_label,
        price: row.price,
        stock: row.stock,
      });
    }
  }

  setCache(res, 30);
  res.json(
    products.map((p) => ({
      ...p,
      variants: variantMap.get(p.id) ?? [],
    })),
  );
});

// GET /stores/:slug/products/:productId
router.get("/:slug/products/:productId", async (req, res): Promise<void> => {
  const params = GetStoreProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, params.data.productId),
        eq(productsTable.merchantId, merchant.id),
        eq(productsTable.isActive, true),
      ),
    )
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  const variants = await db
    .select()
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, product.id));

  setCache(res, 120);
  res.json({ ...product, variants });
});

// GET /stores/:slug/products/:productId/attributes
// Public endpoint: fetch attribute definitions + values for a product
router.get("/:slug/products/:productId/attributes", async (req, res): Promise<void> => {
  const params = GetStoreProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, params.data.productId),
        eq(productsTable.merchantId, merchant.id),
        eq(productsTable.isActive, true),
      ),
    )
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  if (!product.categoryId) {
    res.json({ attributes: [] });
    return;
  }

  // Get attribute definitions for this category
  const defs = await db
    .select()
    .from(attributeDefinitionsTable)
    .where(eq(attributeDefinitionsTable.categoryId, product.categoryId));

  if (defs.length === 0) {
    res.json({ attributes: [] });
    return;
  }

  // Get saved values
  const values = await db
    .select()
    .from(productAttributeValuesTable)
    .where(eq(productAttributeValuesTable.productId, product.id));

  const valueMap = new Map(values.map((v) => [v.attributeDefinitionId, v.value]));

  const attributes = defs.map((d) => ({
    key: d.key,
    label: d.label,
    type: d.type,
    value: valueMap.get(d.id) ?? null,
  })).filter((a) => a.value !== null && a.value !== "");

  setCache(res, 120);
  res.json({ attributes });
});

// GET /stores/:slug/products/:productId/related
// Other active products in the same store and category, excluding the current
// product, capped at 4. Matches the "عطور مشابهة / أكمل مجموعتك" strip.
router.get("/:slug/products/:productId/related", async (req, res): Promise<void> => {
  const params = GetRelatedProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, params.data.productId),
        eq(productsTable.merchantId, merchant.id),
        eq(productsTable.isActive, true),
      ),
    )
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.merchantId, merchant.id),
        eq(productsTable.isActive, true),
        eq(productsTable.category, product.category),
        ne(productsTable.id, product.id),
      ),
    )
    .limit(4);

  const related = products;

  const variantMap = new Map<number, typeof productVariantsTable.$inferSelect[]>();
  if (related.length > 0) {
    const allProductVariants = await db.execute(
      `SELECT * FROM product_variants WHERE product_id = ANY(ARRAY[${related.map((p) => p.id).join(",")}])`,
    ) as any;
    const rows = allProductVariants.rows ?? allProductVariants;
    for (const row of rows) {
      const pid = row.product_id;
      if (!variantMap.has(pid)) variantMap.set(pid, []);
      variantMap.get(pid)!.push({
        id: row.id,
        productId: row.product_id,
        variantLabel: row.variant_label,
        price: row.price,
        stock: row.stock,
      });
    }
  }

  res.json(
    related.map((p) => ({
      ...p,
      variants: variantMap.get(p.id) ?? [],
    })),
  );
});

// GET /stores/:slug/products/:productId/reviews
// Approved reviews only, with the average rating.
router.get("/:slug/products/:productId/reviews", async (req, res): Promise<void> => {
  const params = GetProductReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, params.data.productId),
        eq(productsTable.merchantId, merchant.id),
        eq(productsTable.isActive, true),
      ),
    )
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.productId, product.id), eq(reviewsTable.isApproved, true)))
    .orderBy(desc(reviewsTable.createdAt));

  const [avgRow] = await db
    .select({ average: avg(reviewsTable.rating) })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.productId, product.id), eq(reviewsTable.isApproved, true)));

  res.json({
    reviews,
    averageRating: avgRow?.average != null ? Math.round(Number(avgRow.average) * 10) / 10 : 0,
  });
});

// POST /stores/:slug/products/:productId/reviews
// Public review submission — always stored pending approval.
router.post("/:slug/products/:productId/reviews", async (req, res): Promise<void> => {
  const params = CreateProductReviewParams.safeParse(req.params);
  const body = CreateProductReviewBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: body.success ? "معرّف غير صالح" : body.error.message });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, params.data.productId),
        eq(productsTable.merchantId, merchant.id),
        eq(productsTable.isActive, true),
      ),
    )
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      productId: product.id,
      customerName: body.data.customerName,
      rating: body.data.rating,
      comment: body.data.comment ?? null,
      isApproved: false,
    })
    .returning();

  res.status(201).json(review);
});

// POST /stores/:slug/validate-discount
router.post("/:slug/validate-discount", async (req, res): Promise<void> => {
  const params = ValidateDiscountParams.safeParse(req.params);
  const body = ValidateDiscountBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const [discount] = await db
    .select()
    .from(discountCodesTable)
    .where(
      and(
        eq(discountCodesTable.merchantId, merchant.id),
        eq(discountCodesTable.code, body.data.code.toUpperCase()),
        eq(discountCodesTable.isActive, true),
      ),
    )
    .limit(1);

  if (!discount) {
    res.status(400).json({ error: "كود الخصم غير صالح أو منتهي الصلاحية" });
    return;
  }

  res.json({ valid: true, percentOff: discount.percentOff ?? null, amountOff: discount.amountOff ?? null, minOrderTotal: discount.minOrderTotal ?? null, code: discount.code });
});

// GET /stores/:slug/discounts/:code/validate
// Read-only validation: code exists, belongs to this merchant, and is active.
// No side effects. The authoritative check still happens at order creation.
router.get("/:slug/discounts/:code/validate", async (req, res): Promise<void> => {
  const params = ValidateDiscountCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const [discount] = await db
    .select()
    .from(discountCodesTable)
    .where(
      and(
        eq(discountCodesTable.merchantId, merchant.id),
        eq(discountCodesTable.code, params.data.code.toUpperCase()),
        eq(discountCodesTable.isActive, true),
      ),
    )
    .limit(1);

  if (!discount) {
    res.json({ valid: false });
    return;
  }

  res.json({ valid: true, percentOff: discount.percentOff ?? null, amountOff: discount.amountOff ?? null, minOrderTotal: discount.minOrderTotal ?? null });
});

// POST /stores/:slug/orders
router.post("/:slug/orders", async (req, res): Promise<void> => {
  const params = PlaceOrderParams.safeParse(req.params);
  const body = PlaceOrderBody.safeParse(req.body);

  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const {
    customerName,
    customerPhone,
    customerAddress,
    paymentMethod,
    isGift,
    giftMessage,
    discountCode,
    items,
  } = body.data;

  if (items.length === 0) {
    res.status(400).json({ error: "السلة فارغة" });
    return;
  }

  // Split checkout lines into plain products and gift bundles.
  const productItems = items.filter((i) => i.variantId !== undefined);
  const bundleItems = items.filter((i) => i.bundleId !== undefined);

  if (productItems.length + bundleItems.length !== items.length) {
    res.status(400).json({ error: "عنصر غير صالح في السلة" });
    return;
  }

  // Fetch variant prices/names for plain product lines
  const variantIds = productItems.map((i) => i.variantId!);
  const variants = variantIds.length > 0
    ? await db.execute(
        `SELECT pv.id, pv.price, pv.product_id, p.name AS product_name, pv.variant_label
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = ANY(ARRAY[${variantIds.join(",")}])
           AND p.merchant_id = ${merchant.id}`,
      ) as any
    : { rows: [] };

  const variantRows = variants.rows ?? variants;
  const variantMap = new Map(variantRows.map((r: any) => [r.id, r]));

  // Fetch bundle definitions (single SQL row per bundle_item, grouped in JS)
  const bundleIds = bundleItems.map((i) => i.bundleId!);
  const bundleRows = bundleIds.length > 0
    ? await db.execute(
        `SELECT b.id AS bundle_id, b.name AS bundle_name, b.bundle_price,
                bi.variant_id, bi.quantity AS item_qty
         FROM bundles b
         JOIN bundle_items bi ON bi.bundle_id = b.id
         WHERE b.id = ANY(ARRAY[${bundleIds.join(",")}])
           AND b.merchant_id = ${merchant.id}
           AND b.is_active = true`,
      ) as any
    : { rows: [] };

  const bundleRowsArr = bundleRows.rows ?? bundleRows;
  const bundleMap = new Map<number, any[]>();
  for (const r of bundleRowsArr) {
    const list = bundleMap.get(r.bundle_id) ?? [];
    list.push(r);
    bundleMap.set(r.bundle_id, list);
  }

  let subtotal = 0;
  const orderItemsData: { variantId: number | null; productName: string; variantLabel: string; quantity: number; priceAtOrder: number }[] = [];
  const stockOps: { variantId: number; quantity: number }[] = [];

  for (const item of productItems) {
    const variant = variantMap.get(item.variantId!) as any;
    if (!variant) {
      res.status(400).json({ error: `متغير المنتج ${item.variantId} غير موجود` });
      return;
    }
    const lineTotal = variant.price * item.quantity;
    subtotal += lineTotal;
    orderItemsData.push({
      variantId: item.variantId!,
      productName: variant.product_name,
      variantLabel: variant.variant_label,
      quantity: item.quantity,
      priceAtOrder: variant.price,
    });
    stockOps.push({ variantId: item.variantId!, quantity: item.quantity });
  }

  for (const item of bundleItems) {
    const bundleParts = bundleMap.get(item.bundleId!) as any[] | undefined;
    if (!bundleParts || bundleParts.length === 0) {
      res.status(400).json({ error: `الباقة ${item.bundleId} غير موجودة أو غير نشطة` });
      return;
    }
    // One order line per bundle unit at the unified bundle price.
    subtotal += bundleParts[0].bundle_price * item.quantity;
    orderItemsData.push({
      variantId: null,
      productName: bundleParts[0].bundle_name,
      variantLabel: "باقة هدايا",
      quantity: item.quantity,
      priceAtOrder: bundleParts[0].bundle_price,
    });
    // Reserve stock of the underlying variants.
    for (const part of bundleParts) {
      stockOps.push({ variantId: part.variant_id, quantity: part.item_qty * item.quantity });
    }
  }

  // Apply discount
  let total = subtotal;
  let appliedDiscount: string | null = null;
  if (discountCode) {
    const [discount] = await db
      .select()
      .from(discountCodesTable)
      .where(
        and(
          eq(discountCodesTable.merchantId, merchant.id),
          eq(discountCodesTable.code, discountCode.toUpperCase()),
          eq(discountCodesTable.isActive, true),
        ),
      )
      .limit(1);

    if (discount) {
      const discountAmount = computeDiscountAmount(discount, subtotal);
      if (discountAmount != null) {
        total = subtotal - discountAmount;
        appliedDiscount = discount.code;
      }
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Create order
      const [order] = await tx
        .insert(ordersTable)
        .values({
          merchantId: merchant.id,
          customerName,
          customerPhone,
          customerAddress,
          paymentMethod: paymentMethod as any,
          isGift: isGift ?? false,
          giftMessage: giftMessage ?? null,
          discountCode: appliedDiscount,
          subtotal,
          total,
          status: "new",
        })
        .returning();

      // Atomically decrement stock for every line item (products and bundle
      // contents), then store order items. Stock check + decrement happen in
      // ONE SQL statement to avoid race conditions.
      for (const op of stockOps) {
        const updated = await tx
          .update(productVariantsTable)
          .set({ stock: sql`${productVariantsTable.stock} - ${op.quantity}` })
          .where(
            and(
              eq(productVariantsTable.id, op.variantId),
              gte(productVariantsTable.stock, op.quantity),
            ),
          )
          .returning({ id: productVariantsTable.id });

        if (updated.length === 0) {
          throw new Error("غير متوفر: أحد عناصر السلة");
        }
      }

      await tx.insert(orderItemsTable).values(
        orderItemsData.map((item) => ({ ...item, orderId: order.id })),
      );

      return order;
    });

    // Fire push notification to the merchant (non-blocking — never fails the response)
    sendPushToMerchant(merchant.id, {
      title: `🛍️ طلب جديد — ${merchant.storeName}`,
      body: `طلب جديد من ${customerName} بقيمة ${(total / 1000).toFixed(3)} د.ع`,
      url: "/dashboard/orders",
    }).catch(() => undefined);

    res.status(201).json({
      orderId: result.id,
      total: result.total,
      storeName: merchant.storeName,
      storeSlug: merchant.slug,
    });
    return;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("غير متوفر:")) {
      res.status(409).json({
        error: `عذراً، الكمية المتوفرة من ${err.message.slice("غير متوفر:".length).trim()} أقل مما طلبت`,
      });
      return;
    }
    console.error("Failed to place order", err);
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء الطلب" });
    return;
  }
});

// GET /stores/:slug/orders/:orderId?phone=...
// Customer order tracking. Requires the phone used at checkout so that
// sequential order IDs cannot be enumerated to read other people's orders.
router.get("/:slug/orders/:orderId", async (req, res): Promise<void> => {
  const params = GetStoreOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const query = GetStoreOrderQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "رقم الهاتف مطلوب للتتبع" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, params.data.orderId),
        eq(ordersTable.merchantId, merchant.id),
      ),
    )
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  const normalizePhone = (value: string) => value.replace(/[^\d]/g, "");
  if (normalizePhone(query.data.phone) !== normalizePhone(order.customerPhone)) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));

  res.json({
    id: order.id,
    status: order.status,
    subtotal: order.subtotal,
    total: order.total,
    discountCode: order.discountCode,
    createdAt: order.createdAt,
    items: items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      priceAtOrder: item.priceAtOrder,
    })),
  });
});

// GET /stores/:slug/bundles
// Active gift bundles with their items.
router.get("/:slug/bundles", async (req, res): Promise<void> => {
  const params = BrowseStoreBundlesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, params.data.slug))
    .limit(1);

  if (!merchant) {
    res.status(404).json({ error: "المتجر غير موجود" });
    return;
  }

  const bundles = await db
    .select({
      id: bundlesTable.id,
      merchantId: bundlesTable.merchantId,
      name: bundlesTable.name,
      description: bundlesTable.description,
      bundlePrice: bundlesTable.bundlePrice,
      isActive: bundlesTable.isActive,
      createdAt: bundlesTable.createdAt,
      imageData: bundlesTable.imageData,
    })
    .from(bundlesTable)
    .where(and(eq(bundlesTable.merchantId, merchant.id), eq(bundlesTable.isActive, true)))
    .orderBy(desc(bundlesTable.createdAt));

  if (bundles.length === 0) {
    res.json({ bundles: [] });
    return;
  }

  const items = await db
    .select({
      id: bundleItemsTable.id,
      bundleId: bundleItemsTable.bundleId,
      variantId: bundleItemsTable.variantId,
      variantLabel: productVariantsTable.variantLabel,
      productName: productsTable.name,
      quantity: bundleItemsTable.quantity,
    })
    .from(bundleItemsTable)
    .innerJoin(productVariantsTable, eq(bundleItemsTable.variantId, productVariantsTable.id))
    .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
    .where(inArray(bundleItemsTable.bundleId, bundles.map((b) => b.id)));

  const itemsByBundle = new Map<number, typeof items>();
  for (const it of items) {
    const list = itemsByBundle.get(it.bundleId) ?? [];
    list.push(it);
    itemsByBundle.set(it.bundleId, list);
  }

  setCache(res, 60);
  res.json({
    bundles: bundles.map((b) => ({
      id: b.id,
      merchantId: b.merchantId,
      name: b.name,
      description: b.description,
      imageUrl: b.imageData ? `/api/bundles/${b.id}/image` : null,
      bundlePrice: b.bundlePrice,
      isActive: b.isActive,
      createdAt: b.createdAt,
      items: itemsByBundle.get(b.id) ?? [],
    })),
  });
});

// POST /stores/:slug/products/:productId/variants/:variantId/stock-notifications
// Register a phone number to be notified when an out-of-stock variant is restocked.
router.post(
  "/:slug/products/:productId/variants/:variantId/stock-notifications",
  async (req, res): Promise<void> => {
    const params = CreateStockNotificationParams.safeParse(req.params);
    const body = CreateStockNotificationBody.safeParse(req.body);

    if (!params.success || !body.success) {
      res.status(400).json({ error: body.success ? "معرّف غير صالح" : body.error.message });
      return;
    }

    const [merchant] = await db
      .select()
      .from(merchantsTable)
      .where(eq(merchantsTable.slug, params.data.slug))
      .limit(1);

    if (!merchant) {
      res.status(404).json({ error: "المتجر غير موجود" });
      return;
    }

    const [product] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, params.data.productId),
          eq(productsTable.merchantId, merchant.id),
          eq(productsTable.isActive, true),
        ),
      )
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }

    const [variant] = await db
      .select()
      .from(productVariantsTable)
      .where(
        and(
          eq(productVariantsTable.id, params.data.variantId),
          eq(productVariantsTable.productId, product.id),
        ),
      )
      .limit(1);

    if (!variant) {
      res.status(404).json({ error: "الخيار غير موجود" });
      return;
    }

    if (variant.stock > 0) {
      res.status(409).json({ error: "الخيار متوفر حالياً" });
      return;
    }

    const [notification] = await db
      .insert(stockNotificationsTable)
      .values({
        variantId: variant.id,
        customerPhone: body.data.customerPhone,
        notified: false,
      })
      .returning();

    res.status(201).json(notification);
  },
);

export default router;
