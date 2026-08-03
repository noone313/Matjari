import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "matjari-dev-secret";

export interface AuthRequest extends Request {
  merchantId?: number;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح — يجب تسجيل الدخول" });
    return;
  }

  const token = authHeader.slice(7);
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
