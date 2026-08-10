import { db, ordersTable, orderItemsTable } from "@workspace/db";
import { eq, and, gte, sql, desc, count, inArray } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { type Response } from "express";

export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل جلب الإحصائيات" });
  }
}