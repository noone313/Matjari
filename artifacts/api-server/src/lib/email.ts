import { Resend } from "resend";
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "متجري <onboarding@resend.dev>";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://workspacematjari-staging.up.railway.app";

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (resend) return resend;
  if (!RESEND_API_KEY) {
    logger.warn("[email] RESEND_API_KEY not set — emails will be logged only");
    return null;
  }
  resend = new Resend(RESEND_API_KEY);
  return resend;
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  const client = getClient();
  if (!client) {
    logger.info({ to, resetUrl }, "[email] Password reset (no Resend — logged only)");
    return;
  }

  try {
    await client.emails.send({
      from: RESEND_FROM,
      to,
      subject: "إعادة تعيين كلمة المرور — متجري",
      html: `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 40px; text-align: center;">
    <h1 style="font-size: 24px; color: #111827; margin: 0 0 8px;">متجري</h1>
    <p style="color: #6b7280; font-size: 14px; margin: 0 0 32px;">إعادة تعيين كلمة المرور</p>
    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك.<br>
      اضغط الزر أدناه لإنشاء كلمة مرور جديدة:
    </p>
    <a href="${resetUrl}" style="display: inline-block; background: #111827; color: white; text-decoration: none; padding: 12px 32px; border-radius: 4px; font-weight: bold; font-size: 14px;">
      إعادة تعيين كلمة المرور
    </a>
    <p style="color: #9ca3af; font-size: 12px; margin: 32px 0 0; line-height: 1.6;">
      هذا الرابط صالح لمدة ساعة واحدة فقط.<br>
      إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.
    </p>
  </div>
</body>
</html>`,
    });
    logger.info({ to }, "[email] Password reset sent via Resend");
  } catch (err) {
    logger.error({ err, to }, "[email] Failed to send password reset email");
    throw err;
  }
}
