import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { CreateObligationSchema, UpdateObligationSchema } from "./obligations.schemas";
import {
  createObligation, getObligations, getUpcoming,
  updateObligation, markPaid, deleteObligation,
} from "./obligations.controller";

export const obligationsRouter = Router();

obligationsRouter.use(authenticate);

obligationsRouter.post("/",            validate(CreateObligationSchema), createObligation);
obligationsRouter.get("/",             getObligations);
obligationsRouter.get("/upcoming",     getUpcoming);
obligationsRouter.patch("/:id",        validate(UpdateObligationSchema), updateObligation);
obligationsRouter.patch("/:id/pay",    markPaid);
obligationsRouter.delete("/:id",       deleteObligation);
