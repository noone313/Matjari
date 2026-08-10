import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { type AuthRequest } from "../../middleware/auth";
import { type Response } from "express";

export function subscribeToPush(req: AuthRequest, res: Response) {
  const { endpoint, keys } = req.body ?? {};
  if (
    typeof endpoint !== "string" ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    res.status(400).json({ error: "بيانات الاشتراك غير صالحة" });
    return;
  }

  // Upsert: if the endpoint already exists for this merchant, update keys;
  // if it exists for a different merchant (device transfer), replace it.
  db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint))
    .then(() => {
      return db.insert(pushSubscriptionsTable).values({
        merchantId: req.merchantId!,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
    })
    .then(() => res.status(201).json({ ok: true }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "فشل حفظ الاشتراك" });
    });
}

export function unsubscribeFromPush(req: AuthRequest, res: Response) {
  const { endpoint } = req.body ?? {};
  if (typeof endpoint === "string") {
    db.delete(pushSubscriptionsTable)
      .where(
        and(
          eq(pushSubscriptionsTable.merchantId, req.merchantId!),
          eq(pushSubscriptionsTable.endpoint, endpoint),
        ),
      )
      .then(() => res.sendStatus(204))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "فشل إلغاء الاشتراك" });
      });
  } else {
    res.sendStatus(204);
  }
}