import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "matjari-dev-secret";

export const SESSION_COOKIE_NAME = "matjari_session";

export interface AuthRequest extends Request {
  merchantId?: number;
}

/**
 * Read the JWT from either the Authorization header (legacy) or the httpOnly
 * cookie (preferred). Falls back to the cookie when the header is absent so
 * that both old localStorage-based clients and new cookie-based clients work
 * during migration.
 */
function extractToken(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. httpOnly cookie
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  return null;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "غير مصرح — يجب تسجيل الدخول" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { merchantId: number };
    req.merchantId = payload.merchantId;
    next();
  } catch {
    res.status(401).json({ error: "الجلسة منتهية — يرجى تسجيل الدخول مجدداً" });
  }
}

export function signToken(merchantId: number): string {
  return jwt.sign({ merchantId }, JWT_SECRET, { expiresIn: "30d" });
}

/**
 * Cookie options for the session cookie. Uses `sameSite: 'none'` + `secure`
 * so the cookie works cross-origin (frontend and API are on different
 * Railway subdomains). `httpOnly` prevents JavaScript access (XSS protection).
 * `path: '/'` ensures the cookie is sent on all routes.
 */
export function sessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "none";
  path: string;
  maxAge: number;
} {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
}
