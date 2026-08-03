import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, merchantsTable, ordersTable } from "@workspace/db";
import { and, count, eq } from "drizzle-orm";
import { requireAuth, signToken, type AuthRequest } from "../middleware/auth";
import {
  RegisterMerchantBody,
  LoginMerchantBody,
} from "@workspace/api-zod";

const router = Router();

// POST /auth/register
router.post("/register", async (req, res): Promise<void> => {
  const parsed = RegisterMerchantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { storeName, slug, email, password } = parsed.data;

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: "الـ slug يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط" });
    return;
  }

  const existingEmail = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.email, email))
    .limit(1);

  if (existingEmail.length > 0) {
    res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    return;
  }

  const existingSlug = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.slug, slug))
    .limit(1);

  if (existingSlug.length > 0) {
    res.status(409).json({ error: "رابط المتجر مستخدم بالفعل" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [merchant] = await db
    .insert(merchantsTable)
    .values({ storeName, slug, email, passwordHash })
    .returning();

  const token = signToken(merchant.id);

  res.status(201).json({
    merchant: {
      id: merchant.id,
      slug: merchant.slug,
      storeName: merchant.storeName,
      email: merchant.email,
      logoUrl: merchant.logoUrl,
      bannerUrl: merchant.bannerUrl,
      description: merchant.description,
      accentColor: merchant.accentColor,
      bankTransferInfo: merchant.bankTransferInfo,
      phone: merchant.phone,
      createdAt: merchant.createdAt,
      productCount: 0,
      orderCount: 0,
    },
    token,
    newOrdersCount: 0, // brand-new account has no orders
  });
});

// POST /auth/login
router.post("/login", async (req, res): Promise<void> => {
  const parsed = LoginMerchantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.email, email))
    .limit(1);

  if (!merchant) {
    res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    return;
  }

  const valid = await bcrypt.compare(password, merchant.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    return;
  }

  const token = signToken(merchant.id);

  // Fetch current new-orders count so the client can initialise its seen-orders
  // baseline immediately on login (preventing a badge flash for historical orders).
  const [newOrdersRow] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.merchantId, merchant.id), eq(ordersTable.status, "new")));

  res.json({
    merchant: {
      id: merchant.id,
      slug: merchant.slug,
      storeName: merchant.storeName,
      email: merchant.email,
      logoUrl: merchant.logoUrl,
      bannerUrl: merchant.bannerUrl,
      description: merchant.description,
      accentColor: merchant.accentColor,
      bankTransferInfo: merchant.bankTransferInfo,
      phone: merchant.phone,
      createdAt: merchant.createdAt,
      productCount: null,
      orderCount: null,
    },
    token,
    newOrdersCount: Number(newOrdersRow?.count ?? 0),
  });
});

// POST /auth/logout
router.post("/logout", (_req, res): void => {
  res.sendStatus(204);
});

// GET /auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.id, req.merchantId!))
    .limit(1);

  if (!merchant) {
    res.status(401).json({ error: "التاجر غير موجود" });
    return;
  }

  res.json({
    id: merchant.id,
    slug: merchant.slug,
    storeName: merchant.storeName,
    email: merchant.email,
    logoUrl: merchant.logoUrl,
    bannerUrl: merchant.bannerUrl,
    description: merchant.description,
    accentColor: merchant.accentColor,
    bankTransferInfo: merchant.bankTransferInfo,
    phone: merchant.phone,
    createdAt: merchant.createdAt,
    productCount: null,
    orderCount: null,
  });
});

export default router;
