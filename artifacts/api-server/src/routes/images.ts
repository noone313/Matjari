import { Router } from "express";
import multer from "multer";
import { db, productImagesTable, productsTable, bundlesTable, heroSlidesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// Store files in memory (max 10 MB per image)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
      const productId = parseInt(String(req.params.id), 10);
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
    const imageId = parseInt(String(req.params.imageId), 10);
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

// ── Upload (or replace) the bundle image (auth required) ──────────────────────
router.put(
  "/dashboard/bundles/:id/image",
  requireAuth,
  upload.single("image"),
  async (req: AuthRequest, res) => {
    try {
      const bundleId = parseInt(String(req.params.id), 10);
      if (isNaN(bundleId)) return res.status(400).json({ error: "Invalid bundle id" });
      if (!req.file) return res.status(400).json({ error: "No image provided" });

      const [bundle] = await db
        .select({ id: bundlesTable.id })
        .from(bundlesTable)
        .where(and(eq(bundlesTable.id, bundleId), eq(bundlesTable.merchantId, req.merchantId!)));

      if (!bundle) return res.status(404).json({ error: "Bundle not found" });

      await db
        .update(bundlesTable)
        .set({ imageData: req.file.buffer, imageMime: req.file.mimetype })
        .where(eq(bundlesTable.id, bundleId));

      return res.status(201).json({ url: `/api/bundles/${bundleId}/image` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

// ── Delete the bundle image (auth required) ───────────────────────────────────
router.delete("/dashboard/bundles/:id/image", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bundleId = parseInt(String(req.params.id), 10);
    if (isNaN(bundleId)) return res.status(400).json({ error: "Invalid bundle id" });

    const [bundle] = await db
      .select({ id: bundlesTable.id })
      .from(bundlesTable)
      .where(and(eq(bundlesTable.id, bundleId), eq(bundlesTable.merchantId, req.merchantId!)));

    if (!bundle) return res.status(404).json({ error: "Bundle not found" });

    await db
      .update(bundlesTable)
      .set({ imageData: null, imageMime: null })
      .where(eq(bundlesTable.id, bundleId));

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ── Serve bundle image (public, stored in the database) ───────────────────────
router.get("/bundles/:id/image", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).send("Invalid id");

    const [bundle] = await db
      .select({ data: bundlesTable.imageData, mime: bundlesTable.imageMime })
      .from(bundlesTable)
      .where(eq(bundlesTable.id, id));

    if (!bundle?.data || !bundle.mime) return res.status(404).send("Not found");

    res.set("Content-Type", bundle.mime);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(bundle.data);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
});

// ── Upload (or replace) the hero slide image (auth required) ─────────────────
router.put(
  "/dashboard/hero/:id/image",
  requireAuth,
  upload.single("image"),
  async (req: AuthRequest, res) => {
    try {
      const slideId = parseInt(String(req.params.id), 10);
      if (isNaN(slideId)) return res.status(400).json({ error: "Invalid slide id" });
      if (!req.file) return res.status(400).json({ error: "No image provided" });

      const [slide] = await db
        .select({ id: heroSlidesTable.id })
        .from(heroSlidesTable)
        .where(and(eq(heroSlidesTable.id, slideId), eq(heroSlidesTable.merchantId, req.merchantId!)));

      if (!slide) return res.status(404).json({ error: "Slide not found" });

      await db
        .update(heroSlidesTable)
        .set({ imageData: req.file.buffer, imageMime: req.file.mimetype })
        .where(eq(heroSlidesTable.id, slideId));

      return res.status(201).json({ url: `/api/hero/${slideId}/image` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

// ── Delete the hero slide image (auth required) ──────────────────────────────
router.delete("/dashboard/hero/:id/image", requireAuth, async (req: AuthRequest, res) => {
  try {
    const slideId = parseInt(String(req.params.id), 10);
    if (isNaN(slideId)) return res.status(400).json({ error: "Invalid slide id" });

    const [slide] = await db
      .select({ id: heroSlidesTable.id })
      .from(heroSlidesTable)
      .where(and(eq(heroSlidesTable.id, slideId), eq(heroSlidesTable.merchantId, req.merchantId!)));

    if (!slide) return res.status(404).json({ error: "Slide not found" });

    await db
      .update(heroSlidesTable)
      .set({ imageData: null, imageMime: null })
      .where(eq(heroSlidesTable.id, slideId));

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ── Serve hero slide image (public, stored in the database) ──────────────────
router.get("/hero/:id/image", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).send("Invalid id");

    const [slide] = await db
      .select({ data: heroSlidesTable.imageData, mime: heroSlidesTable.imageMime })
      .from(heroSlidesTable)
      .where(eq(heroSlidesTable.id, id));

    if (!slide?.data || !slide.mime) return res.status(404).send("Not found");

    const imageData = slide.data instanceof Buffer ? slide.data : Buffer.from(slide.data);
    res.set("Content-Type", slide.mime);
    res.set("Cache-Control", "public, max-age=31536000");
    res.set("Content-Length", imageData.length.toString());
    return res.send(imageData);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
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
