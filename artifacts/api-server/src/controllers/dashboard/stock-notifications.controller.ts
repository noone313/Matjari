import { db, merchantsTable, productsTable, productVariantsTable, stockNotificationsTable } from "@workspace/db";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { UpdateStockNotificationParams, UpdateStockNotificationBody } from "@workspace/api-zod";
import { type Response } from "express";

export function listStockNotifications(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const productIdParam = Array.isArray(req.query.productId) ? req.query.productId[0] : req.query.productId;
  const page = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
  const limit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const pageNum = parseInt(page as string || "1", 10);
  const limitNum = parseInt(limit as string || "20", 10);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(productsTable.merchantId, merchantId)];
  if (productIdParam) conditions.push(eq(productVariantsTable.productId, parseInt(productIdParam as string, 10)));

  Promise.all([
    db.select({ count: count() })
      .from(stockNotificationsTable)
      .innerJoin(productVariantsTable, eq(stockNotificationsTable.variantId, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
      .where(and(...conditions)),
    db.select({
      id: stockNotificationsTable.id,
      variantId: stockNotificationsTable.variantId,
      productId: productsTable.id,
      productName: productsTable.name,
      variantLabel: productVariantsTable.variantLabel,
      customerPhone: stockNotificationsTable.customerPhone,
      notified: stockNotificationsTable.notified,
      createdAt: stockNotificationsTable.createdAt,
    })
      .from(stockNotificationsTable)
      .innerJoin(productVariantsTable, eq(stockNotificationsTable.variantId, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
      .where(and(...conditions))
      .orderBy(desc(stockNotificationsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ count: count() })
      .from(stockNotificationsTable)
      .innerJoin(productVariantsTable, eq(stockNotificationsTable.variantId, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
      .where(and(...conditions)),
  ]).then(([totalRes, notifications, total]) => {
    res.json({
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total[0]?.count ?? 0),
        totalPages: Math.ceil(Number(total[0]?.count ?? 0) / limitNum),
      },
    });
  }).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "فشل جلب إشعارات المخزون" });
  });
}

export function updateStockNotification(req: AuthRequest, res: Response) {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const notificationId = parseInt(idParam, 10);
  const body = UpdateStockNotificationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  db.update(stockNotificationsTable)
    .set({ notified: body.data.notified })
    .where(eq(stockNotificationsTable.id, notificationId))
    .returning()
    .then(([notification]) => {
      if (!notification) {
        res.status(404).json({ error: "إشعار المخزون غير موجود" });
        return;
      }
      res.json(notification);
    }).catch((err: Error) => {
      console.error(err);
      res.status(500).json({ error: "فشل تحديث إشعار المخزون" });
    });
}