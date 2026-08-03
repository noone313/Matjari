import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
// Sanitise: remove whitespace, padding, and any non-URL-safe-base64 chars that
// can creep in when a secret is pasted via a form or env editor.
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY ?? "")
  .trim()
  .replace(/\s+/g, "")
  .replace(/=+$/, "")
  .replace(/[^A-Za-z0-9\-_]/g, "");
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@matjari.iq";

let vapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } catch (err) {
    console.error("[push] Failed to configure VAPID — push notifications disabled:", err);
  }
}

export { VAPID_PUBLIC_KEY };

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Send a push notification to every subscription registered for a merchant.
 *  Subscriptions that are gone (410/404) are cleaned up automatically. */
export async function sendPushToMerchant(
  merchantId: number,
  payload: PushPayload,
): Promise<void> {
  if (!vapidConfigured) return;

  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.merchantId, merchantId));

  if (subs.length === 0) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      ),
    ),
  );

  // Remove expired / gone subscriptions (410 Gone, 404 Not Found)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const gone =
      r.status === "rejected" &&
      typeof r.reason === "object" &&
      r.reason !== null &&
      "statusCode" in r.reason &&
      [404, 410].includes((r.reason as { statusCode: number }).statusCode);

    if (gone) {
      await db
        .delete(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.id, subs[i].id))
        .catch(() => undefined);
    }
  }
}
