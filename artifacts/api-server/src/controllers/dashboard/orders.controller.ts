import { db, merchantsTable, ordersTable, orderItemsTable, orderStatusEnum } from "@workspace/db";
import { eq, and, desc, sql, count, inArray, gte } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { ListOrdersQueryParams, GetOrderParams, UpdateOrderStatusParams, UpdateOrderStatusBody } from "@workspace/api-zod";
import { type Response } from "express";
import ExcelJS from "exceljs";

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

export function exportOrders(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const { status, q } = req.query;

  const conditions = [eq(ordersTable.merchantId, merchantId)];
  if (status) conditions.push(eq(ordersTable.status, status as any));
  if (q) conditions.push(sql`${ordersTable.customerName} ILIKE ${'%' + q + '%'}`);

  const whereClause = and(...conditions);

  // Helper to map status to Arabic label (handles both string enum and numeric DB values)
  const mapStatusToArabic = (status: string | number): string => {
    const statusStr = String(status);
    const statusMap: Record<string, string> = {
      new: "جديد",
      processing: "قيد المعالجة",
      shipped: "تم الشحن",
      delivered: "تم التسليم",
      cancelled: "ملغي",
      // Handle numeric enum values that might be stored in DB
      "0": "جديد",
      "1": "قيد المعالجة",
      "2": "تم الشحن",
      "3": "تم التسليم",
      "4": "ملغي",
      "300": "جديد",
      "450": "قيد المعالجة",
    };
    return statusMap[statusStr] || statusMap[String(status)] || String(status);
  };

  db.select()
    .from(ordersTable)
    .where(whereClause)
    .orderBy(desc(ordersTable.createdAt))
    .then(async (orders) => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("الطلبات");

      // Define columns with Arabic headers
      worksheet.columns = [
        { header: "رقم الطلب", key: "id", width: 12 },
        { header: "اسم الزبون", key: "customerName", width: 25 },
        { header: "رقم الهاتف", key: "customerPhone", width: 20 },
        { header: "العنوان", key: "customerAddress", width: 40 },
        { header: "طريقة الدفع", key: "paymentMethod", width: 20 },
        { header: "الإجمالي", key: "total", width: 18 },
        { header: "الحالة", key: "status", width: 15 },
        { header: "التاريخ", key: "createdAt", width: 22 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFB8860B" },
      };
      worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

      // Add data rows
      for (const order of orders) {
        const row = worksheet.addRow({
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerAddress: order.customerAddress,
          paymentMethod: order.paymentMethod === "cod" ? "الدفع عند الاستلام" : "تحويل بنكي",
          total: order.total,
          status: mapStatusToArabic(order.status),
          createdAt: new Date(order.createdAt).toLocaleDateString("ar-IQ", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        // Format total as currency
        row.getCell("total").numFmt = "#,##0";
        // Force phone column as text to preserve leading zeros
        row.getCell("customerPhone").numFmt = "@";
        row.alignment = { horizontal: "center", vertical: "middle" };
      }

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        if (column.key !== "customerAddress") {
          column.width = Math.max(column.width || 10, 15);
        }
      });

      // Set response headers for download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="orders-' + new Date().toISOString().split("T")[0] + '.xlsx"'
      );

      await workbook.xlsx.write(res);
      res.end();
    }).catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل تصدير الطلبات" });
    });
}