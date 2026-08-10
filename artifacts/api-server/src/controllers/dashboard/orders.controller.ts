import { db, merchantsTable, ordersTable, orderItemsTable, orderStatusEnum } from "@workspace/db";
import { eq, and, desc, sql, count, inArray, gte } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { ListOrdersQueryParams, GetOrderParams, UpdateOrderStatusParams, UpdateOrderStatusBody } from "@workspace/api-zod";
import { type Response } from "express";

export function getOrders(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const { status, page = "1", limit = "20", q } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(ordersTable.merchantId, merchantId)];
  if (status) conditions.push(eq(ordersTable.status, status as any));
  if (q) conditions.push(sql`${ordersTable.customerName} ILIKE ${'%' + q + '%'}`);

  const whereClause = and(...conditions);

  Promise.all([
    db.select({ count: count() }).from(ordersTable).where(whereClause),
    db.select().from(ordersTable).where(whereClause).orderBy(desc(ordersTable.createdAt)).limit(limitNum).offset(offset),
  ]).then(([totalRes, orders]) => {
    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(totalRes[0]?.count ?? 0),
        totalPages: Math.ceil(Number(totalRes[0]?.count ?? 0) / limitNum),
      },
    });
  }).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "فشل جلب الطلبات" });
  });
}

export function getOrder(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = parseInt(idParam, 10);

  db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.merchantId, merchantId))).limit(1)
    .then(([order]) => {
      if (!order) {
        res.status(404).json({ error: "الطلب غير موجود" });
        return;
      }
      db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId))
        .then((items) => {
          res.json({ ...order, items });
        });
    }).catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل جلب الطلب" });
    });
}

export function updateOrderStatus(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = parseInt(idParam, 10);
  const body = UpdateOrderStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  db.transaction(async (tx) => {
    const [order] = await tx.update(ordersTable)
      .set({ status: body.data.status as (typeof orderStatusEnum.enumValues)[number] })
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.merchantId, merchantId)))
      .returning();

    if (!order) throw new Error("Order not found");

    return order;
  }).then((order) => {
    res.json(order);
  }).catch((err) => {
    console.error(err);
    if (err.message === "Order not found") {
      res.status(404).json({ error: "الطلب غير موجود" });
    } else {
      res.status(500).json({ error: "فشل تحديث حالة الطلب" });
    }
  });
}

export function getOrderStats(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  Promise.all([
    db.select({ count: count(), revenue: sql<number>`coalesce(sum(${ordersTable.total}), 0)` })
      .from(ordersTable)
      .where(and(eq(ordersTable.merchantId, merchantId), gte(ordersTable.createdAt, startOfMonth))),
    db.select({ count: count(), revenue: sql<number>`coalesce(sum(${ordersTable.total}), 0)` })
      .from(ordersTable)
      .where(eq(ordersTable.merchantId, merchantId)),
    db.select({ status: ordersTable.status, count: count() })
      .from(ordersTable)
      .where(eq(ordersTable.merchantId, merchantId))
      .groupBy(ordersTable.status),
    db.select({ count: count() })
      .from(ordersTable)
      .where(and(eq(ordersTable.merchantId, merchantId), eq(ordersTable.status, "new"))),
    db.select().from(ordersTable).where(eq(ordersTable.merchantId, merchantId)).orderBy(desc(ordersTable.createdAt)).limit(10),
  ]).then(([monthly, total, statusCounts, newOrders, recent]) => {
    res.json({
      ordersThisMonth: Number(monthly[0]?.count ?? 0),
      revenueThisMonth: Number(monthly[0]?.revenue ?? 0),
      totalOrders: Number(total[0]?.count ?? 0),
      totalRevenue: Number(total[0]?.revenue ?? 0),
      ordersByStatus: statusCounts.map(s => ({ status: s.status, count: Number(s.count) })),
      newOrdersCount: Number(newOrders[0]?.count ?? 0),
      recentOrders: recent,
    });
  }).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "فشل جلب إحصائيات الطلبات" });
  });
}