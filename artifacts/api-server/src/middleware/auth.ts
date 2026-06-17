import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET ?? "splitwise-secret";

export interface JwtPayload {
  userId: string;
  username: string;
  displayName: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
