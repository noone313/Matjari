import { Router } from "express";
import { merchantsTable, productsTable, productVariantsTable, ordersTable, orderItemsTable, discountCodesTable, reviewsTable, stockNotificationsTable, bundlesTable, bundleItemsTable } from "@workspace/db";
import { eq, and, gte, sql, desc, count, inArray, notInArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { VAPID_PUBLIC_KEY } from "../lib/push";
import * as statsController from "../controllers/dashboard/stats.controller";
import * as discountsController from "../controllers/dashboard/discounts.controller";
import * as reviewsController from "../controllers/dashboard/reviews.controller";
import * as stockNotificationsController from "../controllers/dashboard/stock-notifications.controller";
import * as bundlesController from "../controllers/dashboard/bundles.controller";
import * as productsController from "../controllers/dashboard/products.controller";
import * as pushController from "../controllers/dashboard/push.controller";
import * as ordersController from "../controllers/dashboard/orders.controller";
import * as settingsController from "../controllers/dashboard/settings.controller";

import {
  UpdateDashboardSettingsBody,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
  GetProductParams,
  ListOrdersQueryParams,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  DeleteDiscountParams,
  ToggleDiscountParams,
  CreateDiscountBody,
  ListReviewsQueryParams,
  DecideReviewParams,
  DecideReviewBody,
  DeleteReviewParams,
  ListStockNotificationsQueryParams,
  UpdateStockNotificationParams,
  UpdateStockNotificationBody,
  CreateBundleBody,
  UpdateBundleBody,
  UpdateBundleParams,
  DeleteBundleParams,
} from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get("/stats", statsController.getDashboardStats);

// ─── Settings ────────────────────────────────────────────────────────────────
router.get("/settings", settingsController.getSettings);
router.put("/settings", settingsController.updateSettings);

// ─── Products ────────────────────────────────────────────────────────────────
router.get("/products", productsController.getProducts);
router.post("/products", productsController.upload.array("images", 10), productsController.createProduct);
router.get("/products/:id", productsController.getProduct);
router.put("/products/:id", productsController.upload.array("images", 10), productsController.updateProduct);
router.delete("/products/:id", productsController.deleteProduct);

// ─── Orders ──────────────────────────────────────────────────────────────────
router.get("/orders", ordersController.getOrders);
router.get("/orders/stats", ordersController.getOrderStats);
router.get("/orders/:id", ordersController.getOrder);
router.patch("/orders/:id/status", ordersController.updateOrderStatus);

// ─── Discounts ───────────────────────────────────────────────────────────────

router.get("/discounts", discountsController.listDiscounts);
router.post("/discounts", discountsController.createDiscount);
router.delete("/discounts/:id", discountsController.deleteDiscount);
router.patch("/discounts/:id/toggle", discountsController.toggleDiscount);
router.get("/stores/:slug/discounts/validate", discountsController.validateDiscountCode);

// ─── Reviews ────────────────────────────────────────────────────────────────
router.get("/reviews", reviewsController.listReviews);
router.patch("/reviews/:id", reviewsController.decideReview);
router.delete("/reviews/:id", reviewsController.deleteReview);

// ─── Stock Notifications ─────────────────────────────────────────────────────

// ─── Stock Notifications ─────────────────────────────────────────────────────

router.get("/stock-notifications", stockNotificationsController.listStockNotifications);
router.patch("/stock-notifications/:id", stockNotificationsController.updateStockNotification);

// ─── Bundles ─────────────────────────────────────────────────────────────────

router.get("/bundles", bundlesController.listBundles);
router.post("/bundles", bundlesController.createBundle);
router.put("/bundles/:id", bundlesController.updateBundle);
router.delete("/bundles/:id", bundlesController.deleteBundle);

// ─── Push Notifications ──────────────────────────────────────────────────────

router.get("/push/vapid-public-key", (_req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    res.status(503).json({ error: "Push notifications not configured" });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post("/push/subscribe", pushController.subscribeToPush);
router.delete("/push/unsubscribe", pushController.unsubscribeFromPush);

export default router;
