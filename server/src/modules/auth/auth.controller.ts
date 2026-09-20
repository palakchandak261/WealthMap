import { Request, Response, NextFunction } from "express";
import { registerService, loginService, getMeService } from "./auth.service";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await registerService(req.body);
    ok(res, result, "Account created", 201);
  } catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loginService(req.body);
    ok(res, result, "Login successful");
  } catch (err) { next(err); }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await getMeService(req.userId!);
    ok(res, user);
  } catch (err) { next(err); }
};
