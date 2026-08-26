import {
  db,
  categoriesTable,
  attributeDefinitionsTable,
  productAttributeValuesTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { type Response } from "express";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function verifyCategoryOwnership(
  merchantId: number,
  categoryId: number,
): Promise<typeof categoriesTable.$inferSelect | null> {
  const [cat] = await db
    .select()
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, categoryId),
        eq(categoriesTable.merchantId, merchantId),
      ),
    )
    .limit(1);
  return cat ?? null;
}

// ── GET /dashboard/categories/:catId/attributes ──────────────────────────────

export async function listAttributeDefinitions(
  req: AuthRequest,
  res: Response,
) {
  const merchantId = req.merchantId!;
  const catIdParam = Array.isArray(req.params.catId)
    ? req.params.catId[0]
    : req.params.catId;
  const categoryId = parseInt(catIdParam, 10);

  try {
    const cat = await verifyCategoryOwnership(merchantId, categoryId);
    if (!cat) {
      res.status(404).json({ error: "الفئة غير موجودة" });
      return;
    }

    const attrs = await db
      .select()
      .from(attributeDefinitionsTable)
      .where(eq(attributeDefinitionsTable.categoryId, categoryId))
      .orderBy(asc(attributeDefinitionsTable.id));

    res.json(attrs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل جلب الخصائص" });
  }
}

// ── POST /dashboard/categories/:catId/attributes ─────────────────────────────

export async function createAttributeDefinition(
  req: AuthRequest,
  res: Response,
) {
  const merchantId = req.merchantId!;
  const catIdParam = Array.isArray(req.params.catId)
    ? req.params.catId[0]
    : req.params.catId;
  const categoryId = parseInt(catIdParam, 10);
  const { key, label, type, options, required } = req.body;

  if (!key || !label) {
    res.status(400).json({ error: "المفتاح والاسم مطلوبان" });
    return;
  }

  const normalizedKey = String(key)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  try {
    const cat = await verifyCategoryOwnership(merchantId, categoryId);
    if (!cat) {
      res.status(404).json({ error: "الفئة غير موجودة" });
      return;
    }

    const [attr] = await db
      .insert(attributeDefinitionsTable)
      .values({
        categoryId,
        key: normalizedKey,
        label: String(label).trim(),
        type: String(type || "text").trim(),
        options: options ?? null,
        required: required ?? false,
      })
      .returning();

    res.status(201).json(attr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل إنشاء الخاصية" });
  }
}

// ── PUT /dashboard/attributes/:attrId ────────────────────────────────────────

export async function updateAttributeDefinition(
  req: AuthRequest,
  res: Response,
) {
  const merchantId = req.merchantId!;
  const attrIdParam = Array.isArray(req.params.attrId)
    ? req.params.attrId[0]
    : req.params.attrId;
  const attrId = parseInt(attrIdParam, 10);
  const { key, label, type, options, required } = req.body;

  try {
    const [existing] = await db
      .select({ attr: attributeDefinitionsTable, cat: categoriesTable })
      .from(attributeDefinitionsTable)
      .innerJoin(
        categoriesTable,
        eq(attributeDefinitionsTable.categoryId, categoriesTable.id),
      )
      .where(eq(attributeDefinitionsTable.id, attrId))
      .limit(1);

    if (!existing || existing.cat.merchantId !== merchantId) {
      res.status(404).json({ error: "الخاصية غير موجودة" });
      return;
    }

    const updates: Record<string, any> = {};
    if (key !== undefined)
      updates.key = String(key)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_");
    if (label !== undefined) updates.label = String(label).trim();
    if (type !== undefined) updates.type = String(type).trim();
    if (options !== undefined) updates.options = options;
    if (required !== undefined) updates.required = required;

    if (Object.keys(updates).length === 0) {
      res.json(existing.attr);
      return;
    }

    const [updated] = await db
      .update(attributeDefinitionsTable)
      .set(updates)
      .where(eq(attributeDefinitionsTable.id, attrId))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل تحديث الخاصية" });
  }
}

// ── DELETE /dashboard/attributes/:attrId ─────────────────────────────────────

export async function deleteAttributeDefinition(
  req: AuthRequest,
  res: Response,
) {
  const merchantId = req.merchantId!;
  const attrIdParam = Array.isArray(req.params.attrId)
    ? req.params.attrId[0]
    : req.params.attrId;
  const attrId = parseInt(attrIdParam, 10);

  try {
    const [existing] = await db
      .select({ attr: attributeDefinitionsTable, cat: categoriesTable })
      .from(attributeDefinitionsTable)
      .innerJoin(
        categoriesTable,
        eq(attributeDefinitionsTable.categoryId, categoriesTable.id),
      )
      .where(eq(attributeDefinitionsTable.id, attrId))
      .limit(1);

    if (!existing || existing.cat.merchantId !== merchantId) {
      res.status(404).json({ error: "الخاصية غير موجودة" });
      return;
    }

    // Delete attribute values first (cascade handles this, but be explicit)
    await db
      .delete(productAttributeValuesTable)
      .where(eq(productAttributeValuesTable.attributeDefinitionId, attrId));

    await db
      .delete(attributeDefinitionsTable)
      .where(eq(attributeDefinitionsTable.id, attrId));

    res.json({ message: "تم حذف الخاصية" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل حذف الخاصية" });
  }
}
