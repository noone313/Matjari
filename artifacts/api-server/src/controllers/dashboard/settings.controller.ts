import { db, merchantsTable, productsTable, ordersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { UpdateDashboardSettingsBody } from "@workspace/api-zod";
import { type Response } from "express";

export function getSettings(req: AuthRequest, res: Response) {
  db.select()
    .from(merchantsTable)
    .where(eq(merchantsTable.id, req.merchantId!))
    .limit(1)
    .then(([merchant]) => {
      if (!merchant) {
        res.status(404).json({ error: "التاجر غير موجود" });
        return;
      }
      Promise.all([
        db.select({ c: count() }).from(productsTable).where(eq(productsTable.merchantId, merchant.id)),
        db.select({ c: count() }).from(ordersTable).where(eq(ordersTable.merchantId, merchant.id)),
      ]).then(([productCountRow, orderCountRow]) => {
        res.json({
          ...merchant,
          productCount: Number(productCountRow[0]?.c ?? 0),
          orderCount: Number(orderCountRow[0]?.c ?? 0),
        });
      }).catch((err) => {
        console.error(err);
        res.status(500).json({ error: "فشل جلب الإعدادات" });
      });
    }).catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل جلب الإعدادات" });
    });
}

export function updateSettings(req: AuthRequest, res: Response) {
  const body = UpdateDashboardSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  db.update(merchantsTable)
    .set({
      storeName: body.data.storeName ?? undefined,
      logoUrl: body.data.logoUrl ?? undefined,
      bannerUrl: body.data.bannerUrl ?? undefined,
      heroEnabled: body.data.heroEnabled ?? undefined,
      description: body.data.description ?? undefined,
      accentColor: body.data.accentColor ?? undefined,
      bankTransferInfo: body.data.bankTransferInfo ?? undefined,
      phone: body.data.phone ?? undefined,
      instagramHandle: body.data.instagramHandle ?? undefined,
      whatsappNumber: body.data.whatsappNumber ?? undefined,
      aboutUs: body.data.aboutUs ?? undefined,
      contactUs: body.data.contactUs ?? undefined,
      storeEmail: body.data.storeEmail ?? undefined,
      location: body.data.location ?? undefined,
      facebook: body.data.facebook ?? undefined,
      twitter: body.data.twitter ?? undefined,
      tiktok: body.data.tiktok ?? undefined,
    })
    .where(eq(merchantsTable.id, req.merchantId!))
    .returning()
    .then(([merchant]) => {
      if (!merchant) {
        res.status(404).json({ error: "التاجر غير موجود" });
        return;
      }
      const { passwordHash, ...safe } = merchant;
      res.json({ ...safe, productCount: null, orderCount: null });
    }).catch((err) => {
      console.error(err);
      if (err.message?.includes("duplicate") || err.code === "23505") {
        res.status(409).json({ error: "المعرف (slug) مستخدم مسبقاً" });
      } else {
        res.status(500).json({ error: "فشل تحديث الإعدادات" });
      }
    });
}