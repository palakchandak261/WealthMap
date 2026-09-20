import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { fail } from "../lib/response";

// Extend Request so downstream handlers can read req.userId
export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    fail(res, "No token provided", "UNAUTHORIZED", 401);
    return;
  }

  try {
    const payload = jwt.verify(
      header.split(" ")[1],
      process.env.JWT_SECRET!
    ) as { userId: string };

    req.userId = payload.userId;
    next();
  } catch {
    fail(res, "Token is invalid or expired", "INVALID_TOKEN", 401);
  }
};
