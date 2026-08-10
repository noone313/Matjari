import { db, merchantsTable, productsTable, productVariantsTable, bundlesTable, bundleItemsTable } from "@workspace/db";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { CreateBundleBody, UpdateBundleBody, UpdateBundleParams, DeleteBundleParams } from "@workspace/api-zod";
import { type Response } from "express";

async function getBundlesForMerchant(merchantId: number, ids?: number[]) {
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
    .where(
      and(
        eq(bundlesTable.merchantId, merchantId),
        ids && ids.length > 0 ? inArray(bundlesTable.id, ids) : undefined,
      ),
    )
    .orderBy(desc(bundlesTable.createdAt));

  if (bundles.length === 0) return [];

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

  return bundles.map((b) => ({
    id: b.id,
    merchantId: b.merchantId,
    name: b.name,
    description: b.description,
    bundlePrice: b.bundlePrice,
    isActive: b.isActive,
    createdAt: b.createdAt,
    imageUrl: b.imageData ? `/api/bundles/${b.id}/image` : null,
    items: itemsByBundle.get(b.id) ?? [],
  }));
}

export async function listBundles(req: AuthRequest, res: Response) {
  const bundles = await getBundlesForMerchant(req.merchantId!);
  res.json({ bundles });
}

export async function createBundle(req: AuthRequest, res: Response) {
  const body = CreateBundleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const items = body.data.items ?? [];
  if (items.length === 0) {
    res.status(400).json({ error: "يجب اختيار عنصر واحد على الأقل" });
    return;
  }

  const variantIds = items.map((i) => i.variantId);
  const ownVariants = await db
    .select({ id: productVariantsTable.id })
    .from(productVariantsTable)
    .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
    .where(
      and(
        eq(productsTable.merchantId, req.merchantId!),
        inArray(productVariantsTable.id, variantIds),
      ),
    );

  if (ownVariants.length !== new Set(variantIds).size) {
    res.status(400).json({ error: "أحد الخيارات المحددة غير صالح" });
    return;
  }

  const bundle = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(bundlesTable)
      .values({
        merchantId: req.merchantId!,
        name: body.data.name,
        description: body.data.description ?? null,
        bundlePrice: body.data.bundlePrice,
        isActive: body.data.isActive ?? true,
      })
      .returning();
    if (items.length > 0) {
      await tx.insert(bundleItemsTable).values(
        items.map((i) => ({ bundleId: created.id, variantId: i.variantId, quantity: i.quantity })),
      );
    }
    return created;
  });

  const [full] = await getBundlesForMerchant(req.merchantId!, [bundle.id]);
  res.status(201).json(full);
}

export async function updateBundle(req: AuthRequest, res: Response) {
  const body = UpdateBundleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const bundleId = parseInt(idParam, 10);

  const [existing] = await db
    .select()
    .from(bundlesTable)
    .where(and(eq(bundlesTable.id, bundleId), eq(bundlesTable.merchantId, req.merchantId!)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "الباقة غير موجودة" });
    return;
  }

  const items = body.data.items ?? [];
  const variantIds = items.map((i) => i.variantId);
  if (variantIds.length > 0) {
    const ownVariants = await db
      .select({ id: productVariantsTable.id })
      .from(productVariantsTable)
      .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
      .where(
        and(
          eq(productsTable.merchantId, req.merchantId!),
          inArray(productVariantsTable.id, variantIds),
        ),
      );
    if (ownVariants.length !== new Set(variantIds).size) {
      res.status(400).json({ error: "أحد الخيارات المحددة غير صالح" });
      return;
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(bundlesTable)
      .set({
        name: body.data.name,
        description: body.data.description ?? null,
        bundlePrice: body.data.bundlePrice,
        isActive: body.data.isActive ?? true,
      })
      .where(eq(bundlesTable.id, bundleId));
    await tx.delete(bundleItemsTable).where(eq(bundleItemsTable.bundleId, bundleId));
    if (items.length > 0) {
      await tx.insert(bundleItemsTable).values(
        items.map((i) => ({ bundleId: bundleId, variantId: i.variantId, quantity: i.quantity })),
      );
    }
  });

  const [full] = await getBundlesForMerchant(req.merchantId!, [bundleId]);
  res.json(full);
}

export async function deleteBundle(req: AuthRequest, res: Response) {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const bundleId = parseInt(idParam, 10);

  const [existing] = await db
    .select()
    .from(bundlesTable)
    .where(and(eq(bundlesTable.id, bundleId), eq(bundlesTable.merchantId, req.merchantId!)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "الباقة غير موجودة" });
    return;
  }

  await db.delete(bundlesTable).where(eq(bundlesTable.id, bundleId));
  res.sendStatus(204);
}