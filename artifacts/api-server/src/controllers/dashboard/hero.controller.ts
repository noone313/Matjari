import { db, heroSlidesTable } from "@workspace/db";
import { eq, and, max } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { type Response } from "express";

function slideToJson(row: typeof heroSlidesTable.$inferSelect) {
  return {
    id: row.id,
    merchantId: row.merchantId,
    title: row.title,
    subtitle: row.subtitle,
    linkUrl: row.linkUrl,
    position: row.position,
    imageUrl: row.imageData ? `/api/hero/${row.id}/image` : null,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export async function listHeroSlides(req: AuthRequest, res: Response) {
  const rows = await db
    .select()
    .from(heroSlidesTable)
    .where(eq(heroSlidesTable.merchantId, req.merchantId!))
    .orderBy(heroSlidesTable.position, heroSlidesTable.id);

  res.json({ slides: rows.map(slideToJson) });
}

export async function createHeroSlide(req: AuthRequest, res: Response) {
  const body = req.body as { title?: string | null; subtitle?: string | null; linkUrl?: string | null; position?: number; isActive?: boolean };
  const [maxRow] = await db
    .select({ max: max(heroSlidesTable.position) })
    .from(heroSlidesTable)
    .where(eq(heroSlidesTable.merchantId, req.merchantId!));

  const [slide] = await db
    .insert(heroSlidesTable)
    .values({
      merchantId: req.merchantId!,
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      linkUrl: body.linkUrl ?? null,
      position: body.position ?? Number(maxRow?.max ?? -1) + 1,
      isActive: body.isActive ?? true,
    })
    .returning();

  res.status(201).json(slideToJson(slide));
}

export async function updateHeroSlide(req: AuthRequest, res: Response) {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const slideId = parseInt(idParam, 10);
  const body = req.body as { title?: string | null; subtitle?: string | null; linkUrl?: string | null; position?: number; isActive?: boolean };

  const [existing] = await db
    .select({ id: heroSlidesTable.id })
    .from(heroSlidesTable)
    .where(and(eq(heroSlidesTable.id, slideId), eq(heroSlidesTable.merchantId, req.merchantId!)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "الشرحة غير موجودة" });
    return;
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.subtitle !== undefined) patch.subtitle = body.subtitle;
  if (body.linkUrl !== undefined) patch.linkUrl = body.linkUrl;
  if (body.position !== undefined) patch.position = body.position;
  if (body.isActive !== undefined) patch.isActive = body.isActive;

  const [slide] = await db
    .update(heroSlidesTable)
    .set(patch)
    .where(eq(heroSlidesTable.id, slideId))
    .returning();

  res.json(slideToJson(slide));
}

export async function deleteHeroSlide(req: AuthRequest, res: Response) {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const slideId = parseInt(idParam, 10);

  const [existing] = await db
    .select({ id: heroSlidesTable.id })
    .from(heroSlidesTable)
    .where(and(eq(heroSlidesTable.id, slideId), eq(heroSlidesTable.merchantId, req.merchantId!)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "الشرحة غير موجودة" });
    return;
  }

  await db.delete(heroSlidesTable).where(eq(heroSlidesTable.id, slideId));
  res.sendStatus(204);
}
