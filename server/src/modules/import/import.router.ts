import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { ok } from "../../lib/response";
import { ImportPayloadSchema } from "./import.schemas";
import { importDataService } from "./import.service";

export const importRouter = Router();

importRouter.use(authenticate);

// POST /api/v1/import — bulk import of a parsed CSV / Excel / JSON workbook
importRouter.post("/", validate(ImportPayloadSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await importDataService(req.userId!, req.body);
    ok(res, result, `Imported ${result.total} record${result.total === 1 ? "" : "s"}`, 201);
  } catch (err) { next(err); }
});
