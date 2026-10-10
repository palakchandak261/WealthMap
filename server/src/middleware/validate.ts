import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Zod request body validation middleware.
 * Usage: router.post("/route", validate(MySchema), controller)
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: messages.join(", ") },
        });
        return;
      }
      next(err);
    }
  };
