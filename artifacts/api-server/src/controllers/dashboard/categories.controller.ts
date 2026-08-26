import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { type Response } from "express";

export async function listCategories(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;

  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.merchantId, merchantId), eq(categoriesTable.isActive, true)))
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل جلب الفئات" });
  }
}

export async function createCategory(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const { slug, label, sortOrder } = req.body;

  if (!slug || !label) {
    res.status(400).json({ error: "الاسم والرابط مطلوبان" });
    return;
  }

  const normalizedSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");

  try {
    const existing = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.merchantId, merchantId), eq(categoriesTable.slug, normalizedSlug)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "الفئة موجودة مسبقاً" });
      return;
    }

    const [category] = await db.insert(categoriesTable).values({
      merchantId,
      slug: normalizedSlug,
      label: String(label).trim(),
      sortOrder: sortOrder ?? 0,
    }).returning();

    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل إنشاء الفئة" });
  }
}

export async function updateCategory(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const categoryId = parseInt(idParam, 10);
  const { slug, label, sortOrder } = req.body;

  try {
    const existing = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.merchantId, merchantId)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "الفئة غير موجودة" });
      return;
    }

    const updates: Record<string, any> = {};
    if (label !== undefined) updates.label = String(label).trim();
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    if (slug !== undefined) {
      const normalizedSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      updates.slug = normalizedSlug;
    }

    if (Object.keys(updates).length === 0) {
      res.json(existing[0]);
      return;
    }

    const [updated] = await db.update(categoriesTable)
      .set(updates)
      .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.merchantId, merchantId)))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل تحديث الفئة" });
  }
}

export async function deleteCategory(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const categoryId = parseInt(idParam, 10);

  try {
    const existing = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.merchantId, merchantId)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "الفئة غير موجودة" });
      return;
    }

    // Count affected products
    const affectedProducts = await db.select()
      .from(productsTable)
      .where(and(eq(productsTable.merchantId, merchantId), eq(productsTable.category, existing[0].slug)));

    // If products exist, move them to the first active category or "other"
    if (affectedProducts.length > 0) {
      const fallbackCategory = await db.select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.merchantId, merchantId),
            eq(categoriesTable.isActive, true),
            // Not the category being deleted
          )
        )
        .orderBy(categoriesTable.sortOrder)
        .limit(5);

      // Find the first active category that isn't the one being deleted
      const target = fallbackCategory.find((c) => c.id !== categoryId);

      if (target) {
        // Move products to the target category
        await db.update(productsTable)
          .set({ category: target.slug })
          .where(and(eq(productsTable.merchantId, merchantId), eq(productsTable.category, existing[0].slug)));
      } else {
        // No other category exists — create "أخرى" (other)
        const [otherCat] = await db.insert(categoriesTable).values({
          merchantId,
          slug: "other",
          label: "أخرى",
          sortOrder: 999,
        }).returning();

        await db.update(productsTable)
          .set({ category: otherCat.slug })
          .where(and(eq(productsTable.merchantId, merchantId), eq(productsTable.category, existing[0].slug)));
      }
    }

    // Soft delete — set isActive to false
    await db.update(categoriesTable)
      .set({ isActive: false })
      .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.merchantId, merchantId)));

    res.json({
      message: affectedProducts.length > 0
        ? `تم حذف الفئة ونقل ${affectedProducts.length} منتج لفئة أخرى`
        : "تم حذف الفئة",
      movedProducts: affectedProducts.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل حذف الفئة" });
  }
}

export async function reorderCategories(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ error: "القائمة مطلوبة" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.update(categoriesTable)
          .set({ sortOrder: i })
          .where(and(eq(categoriesTable.id, orderedIds[i]), eq(categoriesTable.merchantId, merchantId)));
      }
    });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل ترتيب الفئات" });
  }
}
