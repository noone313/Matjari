import { db, merchantsTable, discountCodesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { CreateDiscountBody, DeleteDiscountParams, ToggleDiscountParams, ValidateDiscountBody } from "@workspace/api-zod";
import { type Response } from "express";

export function listDiscounts(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;

  const conditions = [eq(discountCodesTable.merchantId, merchantId)];
  if (status === "active") conditions.push(eq(discountCodesTable.isActive, true));
  if (status === "inactive") conditions.push(eq(discountCodesTable.isActive, false));

  const whereClause = and(...conditions);

  db.select()
    .from(discountCodesTable)
    .where(whereClause)
    .orderBy(desc(discountCodesTable.createdAt))
    .then((discounts) => res.json(discounts))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل جلب أكواد الخصم" });
    });
}

export function createDiscount(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const body = CreateDiscountBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  db.insert(discountCodesTable).values({
    merchantId,
    code: body.data.code.toUpperCase(),
    percentOff: body.data.percentOff,
    isActive: body.data.isActive ?? true,
  }).returning()
    .then(([discount]) => res.status(201).json(discount))
    .catch((err) => {
      console.error(err);
      if (err.message?.includes("duplicate") || err.code === "23505") {
        res.status(409).json({ error: "كود الخصم موجود مسبقاً" });
      } else {
        res.status(500).json({ error: "فشل إنشاء كود الخصم" });
      }
    });
}

export function toggleDiscount(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const discountId = parseInt(idParam, 10);

  db.transaction(async (tx) => {
    const [discount] = await tx.select().from(discountCodesTable).where(and(eq(discountCodesTable.id, discountId), eq(discountCodesTable.merchantId, merchantId))).limit(1);
    if (!discount) throw new Error("Discount not found");

    const [updated] = await tx.update(discountCodesTable).set({ isActive: !discount.isActive }).where(eq(discountCodesTable.id, discount.id)).returning();
    return updated;
  }).then((discount) => res.json(discount))
    .catch((err: Error) => {
      console.error(err);
      if (err.message === "Discount not found") res.status(404).json({ error: "كود الخصم غير موجود" });
      else res.status(500).json({ error: "فشل تبديل حالة الكود" });
    });
}

export function deleteDiscount(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const discountId = parseInt(idParam, 10);

  db.delete(discountCodesTable).where(and(eq(discountCodesTable.id, discountId), eq(discountCodesTable.merchantId, merchantId)))
    .then((result) => {
      if (result.rowCount === 0) res.status(404).json({ error: "كود الخصم غير موجود" });
      else res.sendStatus(204);
    }).catch((err: Error) => {
      console.error(err);
      res.status(500).json({ error: "فشل حذف كود الخصم" });
    });
}

export function validateDiscountCode(req: AuthRequest, res: Response) {
  const body = ValidateDiscountBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  db.select({ id: discountCodesTable.id, merchantId: discountCodesTable.merchantId, percentOff: discountCodesTable.percentOff, isActive: discountCodesTable.isActive })
    .from(discountCodesTable)
    .innerJoin(merchantsTable, eq(merchantsTable.id, discountCodesTable.merchantId))
    .where(and(eq(merchantsTable.slug, slug), eq(discountCodesTable.code, body.data.code.toUpperCase()), eq(discountCodesTable.isActive, true)))
    .limit(1)
    .then(([discount]) => {
      if (!discount) {
        res.json({ valid: false, percentOff: 0 });
        return;
      }
      res.json({ valid: true, percentOff: discount.percentOff });
    }).catch((err: Error) => {
      console.error(err);
      res.status(500).json({ error: "فشل التحقق من كود الخصم" });
    });
}