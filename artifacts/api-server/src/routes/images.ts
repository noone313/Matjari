import { Router } from "express";
import multer from "multer";
import { db, productImagesTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// Store files in memory (max 5 MB per image)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ── Upload image for a product (auth required) ───────────────────────────────
router.post(
  "/dashboard/products/:id/images",
  requireAuth,
  upload.single("image"),
  async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) return res.status(400).json({ error: "Invalid product id" });
      if (!req.file) return res.status(400).json({ error: "No image provided" });

      // Ensure product belongs to this merchant
      const [product] = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(and(eq(productsTable.id, productId), eq(productsTable.merchantId, req.merchantId!)));

      if (!product) return res.status(404).json({ error: "Product not found" });

      const [image] = await db
        .insert(productImagesTable)
        .values({
          productId,
          data: req.file.buffer,
          mimeType: req.file.mimetype,
        })
        .returning({ id: productImagesTable.id });

      return res.status(201).json({ id: image.id, url: `/api/images/${image.id}` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

// ── Delete an image (auth required) ──────────────────────────────────────────
router.delete("/dashboard/images/:imageId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    if (isNaN(imageId)) return res.status(400).json({ error: "Invalid image id" });

    // Verify ownership via join
    const [row] = await db
      .select({ id: productImagesTable.id })
      .from(productImagesTable)
      .innerJoin(productsTable, eq(productsTable.id, productImagesTable.productId))
      .where(
        and(
          eq(productImagesTable.id, imageId),
          eq(productsTable.merchantId, req.merchantId!)
        )
      );

    if (!row) return res.status(404).json({ error: "Image not found" });

    await db.delete(productImagesTable).where(eq(productImagesTable.id, imageId));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ── Serve image (public) ──────────────────────────────────────────────────────
router.get("/images/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).send("Invalid id");

    const [image] = await db
      .select({ data: productImagesTable.data, mimeType: productImagesTable.mimeType })
      .from(productImagesTable)
      .where(eq(productImagesTable.id, id));

    if (!image) return res.status(404).send("Not found");

    res.set("Content-Type", image.mimeType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(image.data);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
});

export default router;
