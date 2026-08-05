import { Router } from "express";
import { db, merchantsTable, productsTable, productVariantsTable, ordersTable, orderItemsTable, discountCodesTable } from "@workspace/db";
import { eq, and, ilike, sql, gte } from "drizzle-orm";
import { sendPushToMerchant } from "../lib/push";
import {
  GetStoreParams,
  BrowseStoreProductsParams,
  BrowseStoreProductsQueryParams,
  GetStoreProductParams,
  ValidateDiscountParams,
  ValidateDiscountBody,
  PlaceOrderParams,
  PlaceOrderBody,
} from "@workspace/api-zod";

const router = Router();

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

  res.json({
    slug: merchant.slug,
    storeName: merchant.storeName,
    logoUrl: merchant.logoUrl,
    bannerUrl: merchant.bannerUrl,
    description: merchant.description,
    accentColor: merchant.accentColor,
    phone: merchant.phone,
    bankTransferInfo: merchant.bankTransferInfo,
    createdAt: merchant.createdAt,
  });
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

  const allVariants = await db
    .select()
    .from(productVariantsTable)
    .where(
      products.length > 0
        ? eq(productVariantsTable.productId, products[0].id)
        : eq(productVariantsTable.productId, -1),
    );

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

  res.json({ ...product, variants });
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

  res.json({ valid: true, percentOff: discount.percentOff, code: discount.code });
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

  // Fetch variant prices and names
  const variantIds = items.map((i) => i.variantId);

  if (variantIds.length === 0) {
    res.status(400).json({ error: "السلة فارغة" });
    return;
  }

  const variants = await db.execute(
    `SELECT pv.id, pv.price, pv.product_id, p.name AS product_name, pv.variant_label
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.id = ANY(ARRAY[${variantIds.join(",")}])
       AND p.merchant_id = ${merchant.id}`,
  ) as any;

  const variantRows = variants.rows ?? variants;
  const variantMap = new Map(variantRows.map((r: any) => [r.id, r]));

  let subtotal = 0;
  const orderItemsData: { variantId: number; productName: string; variantLabel: string; quantity: number; priceAtOrder: number }[] = [];

  for (const item of items) {
    const variant = variantMap.get(item.variantId) as any;
    if (!variant) {
      res.status(400).json({ error: `متغير المنتج ${item.variantId} غير موجود` });
      return;
    }
    const lineTotal = variant.price * item.quantity;
    subtotal += lineTotal;
    orderItemsData.push({
      variantId: item.variantId,
      productName: variant.product_name,
      variantLabel: variant.variant_label,
      quantity: item.quantity,
      priceAtOrder: variant.price,
    });
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
      total = Math.round(subtotal * (1 - discount.percentOff / 100));
      appliedDiscount = discount.code;
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

      // Atomically decrement stock for every line item, then arm order items.
      // Stock check + decrement happen in ONE SQL statement to avoid race conditions.
      for (const row of orderItemsData) {
        const updated = await tx
          .update(productVariantsTable)
          .set({ stock: sql`${productVariantsTable.stock} - ${row.quantity}` })
          .where(
            and(
              eq(productVariantsTable.id, row.variantId),
              gte(productVariantsTable.stock, row.quantity),
            ),
          )
          .returning({ id: productVariantsTable.id });

        if (updated.length === 0) {
          // Variant missing or insufficient stock → abort the whole order (rollback).
          throw new Error(`غير متوفر: ${row.productName} (${row.variantLabel})`);
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

export default router;
