import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";
import {
  createObligationService, getObligationsService, getUpcomingService,
  updateObligationService, markPaidService, deleteObligationService,
} from "./obligations.service";

export const createObligation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await createObligationService(req.userId!, req.body), "Obligation added", 201); }
  catch (err) { next(err); }
};

export const getObligations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isPaid = req.query.isPaid !== undefined ? req.query.isPaid === "true" : undefined;
    ok(res, await getObligationsService(req.userId!, isPaid));
  } catch (err) { next(err); }
};

export const getUpcoming = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    ok(res, await getUpcomingService(req.userId!, days));
  } catch (err) { next(err); }
};

export const updateObligation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await updateObligationService(req.userId!, req.params.id, req.body), "Obligation updated"); }
  catch (err) { next(err); }
};

export const markPaid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await markPaidService(req.userId!, req.params.id), "Marked as paid"); }
  catch (err) { next(err); }
};

export const deleteObligation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await deleteObligationService(req.userId!, req.params.id); ok(res, null, "Obligation deleted"); }
  catch (err) { next(err); }
};
