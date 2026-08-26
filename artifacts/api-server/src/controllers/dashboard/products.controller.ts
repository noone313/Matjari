import { db, merchantsTable, productsTable, productVariantsTable, productImagesTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { CreateProductBody, UpdateProductBody, UpdateProductParams, DeleteProductParams, GetProductParams, ListProductsQueryParams } from "@workspace/api-zod";
import { type Response } from "express";

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: Function) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

async function saveImages(tx: any, productId: number, files: Express.Multer.File[]): Promise<string[]> {
  if (!files.length) return [];
  const rows = await tx
    .insert(productImagesTable)
    .values(files.map((f) => ({ productId, data: f.buffer, mimeType: f.mimetype })))
    .returning({ id: productImagesTable.id });
  return rows.map((r: { id: number }) => `/api/images/${r.id}`);
}

export function getProducts(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const q = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const category = Array.isArray(req.query.category) ? req.query.category[0] : req.query.category;

  const conditions = [eq(productsTable.merchantId, merchantId)];
  if (q) conditions.push(sql`${productsTable.name} ILIKE ${'%' + q + '%'}`);
  if (category && category !== "all") conditions.push(eq(productsTable.category, category as any));

  const whereClause = and(...conditions);

  db.select()
    .from(productsTable)
    .where(whereClause)
    .orderBy(desc(productsTable.createdAt))
    .then((products) => {
      const productIds = products.map(p => p.id);
      if (productIds.length === 0) {
        res.json([]);
        return;
      }
      db.select()
        .from(productVariantsTable)
        .where(inArray(productVariantsTable.productId, productIds))
        .then((variants) => {
          res.json(products.map(p => ({ ...p, variants: variants.filter(v => v.productId === p.id) })));
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: "فشل جلب المنتجات" });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل جلب المنتجات" });
    });
}

export function getProduct(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const productId = parseInt(idParam, 10);

  db.select()
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.merchantId, merchantId)))
    .limit(1)
    .then(([product]) => {
      if (!product) {
        res.status(404).json({ error: "المنتج غير موجود" });
        return;
      }
      Promise.all([
        db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId)),
        db.select().from(productImagesTable).where(eq(productImagesTable.productId, productId)),
      ]).then(([variants, images]) => {
        res.json({ ...product, variants, images: images.map(i => `/api/images/${i.id}`) });
      }).catch((err) => {
        console.error(err);
        res.status(500).json({ error: "فشل جلب المنتج" });
      });
    }).catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل جلب المنتج" });
    });
}

export function createProduct(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  let body: any;
  try { body = JSON.parse(req.body.data ?? "{}"); } catch { res.status(400).json({ error: "Invalid JSON in data field" }); return; }

  const parsed = CreateProductBody.shape.data.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { variants: variantInputs, ...productData } = parsed.data;

  db.transaction(async (tx) => {
    const [product] = await tx.insert(productsTable).values({
      ...productData,
      category: productData.category as any,
      merchantId,
      imageUrls: [],
    }).returning();

    const files = (req.files as Express.Multer.File[]) ?? [];
    const imageUrls = await saveImages(tx, product.id, files);
    if (imageUrls.length) {
      await tx.update(productsTable).set({ imageUrls }).where(eq(productsTable.id, product.id));
    }

    const insertedVariants =
      variantInputs && variantInputs.length > 0
        ? await tx.insert(productVariantsTable).values(
            variantInputs.map((v) => ({ ...v, productId: product.id, stock: v.stock ?? 0 }))
          ).returning()
        : [];

    return { product, imageUrls, variants: insertedVariants };
  }).then((result) => {
    res.status(201).json({ ...result.product, imageUrls: result.imageUrls, variants: result.variants });
  }).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "فشل إنشاء المنتج" });
  });
}

export function updateProduct(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const productId = parseInt(idParam, 10);

  let body: any;
  try { body = JSON.parse(req.body.data ?? "{}"); } catch { res.status(400).json({ error: "Invalid JSON in data field" }); return; }

  const parsed = UpdateProductBody.shape.data.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { variants: variantInputs, ...productData } = parsed.data;
  const files = (req.files as Express.Multer.File[]) ?? [];

  let keepUrls: string[] = [];
  try { keepUrls = JSON.parse(req.body.keepUrls ?? "[]"); } catch { keepUrls = []; }

  db.transaction(async (tx) => {
    const [product] = await tx.update(productsTable)
      .set({ ...productData, category: productData.category as any })
      .where(and(eq(productsTable.id, productId), eq(productsTable.merchantId, merchantId)))
      .returning();

    if (!product) throw new Error("Product not found");

    if (variantInputs !== undefined) {
      await tx.delete(productVariantsTable).where(eq(productVariantsTable.productId, productId));
      if (variantInputs.length > 0) {
        await tx.insert(productVariantsTable).values(
          variantInputs.map((v) => ({ ...v, productId, stock: v.stock ?? 0 }))
        );
      }
    }

    const newImageUrls = await saveImages(tx, productId, files);
    const allImageUrls = [...keepUrls.filter((u: string) => u.startsWith("/api/images/")), ...newImageUrls];

    if (allImageUrls.length) {
      await tx.update(productsTable).set({ imageUrls: allImageUrls }).where(eq(productsTable.id, productId));
    }

    const updatedVariants = variantInputs !== undefined
      ? await tx.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId))
      : await tx.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId));

    return { product, imageUrls: allImageUrls, variants: updatedVariants };
  }).then((result) => {
    res.json({ ...result.product, imageUrls: result.imageUrls, variants: result.variants });
  }).catch((err) => {
    console.error(err);
    if (err.message === "Product not found") {
      res.status(404).json({ error: "المنتج غير موجود" });
    } else {
      res.status(500).json({ error: "فشل تحديث المنتج" });
    }
  });
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  const merchantId = req.merchantId!;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const productId = parseInt(idParam, 10);
  const permanent = req.query.permanent === 'true';

  try {
    const existing = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.merchantId, merchantId)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }

    if (permanent) {
      // Permanent delete — remove product + variants + images
      await db.delete(productImagesTable).where(eq(productImagesTable.productId, productId));
      await db.delete(productVariantsTable).where(eq(productVariantsTable.productId, productId));
      await db.delete(productsTable).where(eq(productsTable.id, productId));
      res.json({ message: "تم حذف المنتج نهائياً" });
    } else {
      // Soft delete — archive
      await db.update(productsTable)
        .set({ isActive: false })
        .where(eq(productsTable.id, productId));
      res.json({ message: "تم أرشفة المنتج" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل حذف المنتج" });
  }
}

export { upload };