import { Response } from "express";

// Standard success response — all routes use this
export const ok = (res: Response, data: unknown, message?: string, status = 200) => {
  res.status(status).json({ success: true, data, ...(message && { message }) });
};

// Standard error response — used by errorHandler and individual route guards
export const fail = (res: Response, message: string, code: string, status = 400) => {
  res.status(status).json({ success: false, error: { code, message } });
};
