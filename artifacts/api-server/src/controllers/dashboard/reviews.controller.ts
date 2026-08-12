import { db, merchantsTable, productsTable, reviewsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { DecideReviewParams, DecideReviewBody, DeleteReviewParams } from "@workspace/api-zod";
import { type Response } from "express";

export function listReviews(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;

  const conditions = [eq(productsTable.merchantId, merchantId)];
  if (status === "pending") conditions.push(eq(reviewsTable.isApproved, false));
  if (status === "approved") conditions.push(eq(reviewsTable.isApproved, true));

  db.select({
    id: reviewsTable.id,
    productId: reviewsTable.productId,
    productName: productsTable.name,
    customerName: reviewsTable.customerName,
    rating: reviewsTable.rating,
    comment: reviewsTable.comment,
    isApproved: reviewsTable.isApproved,
    createdAt: reviewsTable.createdAt,
  })
    .from(reviewsTable)
    .innerJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
    .where(and(...conditions))
    .orderBy(desc(reviewsTable.createdAt))
    .then((reviews) => res.json({ reviews }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل جلب التقييمات" });
    });
}

export function decideReview(req: AuthRequest, res: Response) {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const reviewId = parseInt(idParam, 10);
  const body = DecideReviewBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  db.update(reviewsTable)
    .set({ isApproved: body.data.isApproved })
    .where(eq(reviewsTable.id, reviewId))
    .returning()
    .then(([review]) => {
      if (!review) {
        res.status(404).json({ error: "التقييم غير موجود" });
        return;
      }
      res.json(review);
    }).catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل تحديث التقييم" });
    });
}

export function deleteReview(req: AuthRequest, res: Response) {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const reviewId = parseInt(idParam, 10);

  db.delete(reviewsTable).where(eq(reviewsTable.id, reviewId))
    .then((result) => {
      if (result.rowCount === 0) res.status(404).json({ error: "التقييم غير موجود" });
      else res.sendStatus(204);
    }).catch((err: Error) => {
      console.error(err);
      res.status(500).json({ error: "فشل حذف التقييم" });
    });
}

export function getProductReviews(req: AuthRequest, res: Response) {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const productIdParam = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const productId = parseInt(productIdParam, 10);
  const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = parseInt(limitParam as string || "20", 10);

  db.select({
    id: reviewsTable.id,
    rating: reviewsTable.rating,
    comment: reviewsTable.comment,
    customerName: reviewsTable.customerName,
    createdAt: reviewsTable.createdAt,
  })
    .from(reviewsTable)
    .innerJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
    .innerJoin(merchantsTable, eq(productsTable.merchantId, merchantsTable.id))
    .where(and(eq(merchantsTable.slug, slug), eq(reviewsTable.productId, productId), eq(reviewsTable.isApproved, true)))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limit)
    .then((reviews) => {
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      res.json({ reviews, averageRating: Math.round(avgRating * 10) / 10, totalReviews: reviews.length });
    }).catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل جلب التقييمات" });
    });
}