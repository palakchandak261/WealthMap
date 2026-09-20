import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// Catches anything thrown / passed to next(err) in any route
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status  = err.statusCode ?? 500;
  const message = err.message    ?? "Internal Server Error";
  const code    = err.code       ?? "INTERNAL_ERROR";

  if (status >= 500) console.error("[Server Error]", err);

  res.status(status).json({ success: false, error: { code, message } });
};
