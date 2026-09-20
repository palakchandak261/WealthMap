import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { getProfileService, updateProfileService } from "./users.service";
import { ok } from "../../lib/response";

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    ok(res, await getProfileService(req.userId!));
  } catch (err) { next(err); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    ok(res, await updateProfileService(req.userId!, req.body), "Profile updated");
  } catch (err) { next(err); }
};
