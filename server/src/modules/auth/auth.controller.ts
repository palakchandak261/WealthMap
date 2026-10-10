import { Request, Response, NextFunction } from "express";
import {
  registerService, loginService, getMeService,
  verifyEmailService, forgotPasswordService, resetPasswordService,
} from "./auth.service";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try { ok(res, await registerService(req.body), "Account created. Check your email to verify.", 201); }
  catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try { ok(res, await loginService(req.body), "Login successful"); }
  catch (err) { next(err); }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await getMeService(req.userId!)); }
  catch (err) { next(err); }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try { ok(res, await verifyEmailService(req.params.token)); }
  catch (err) { next(err); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try { ok(res, await forgotPasswordService(req.body.email)); }
  catch (err) { next(err); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try { ok(res, await resetPasswordService(req.body.token, req.body.password)); }
  catch (err) { next(err); }
};
