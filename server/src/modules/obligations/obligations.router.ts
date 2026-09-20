import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  createObligation,
  getObligations,
  getUpcoming,
  updateObligation,
  markPaid,
  deleteObligation,
} from "./obligations.controller";

export const obligationsRouter = Router();

obligationsRouter.use(authenticate);

obligationsRouter.post("/",            createObligation);  // add an EMI / rent / bill
obligationsRouter.get("/",             getObligations);    // list all
obligationsRouter.get("/upcoming",     getUpcoming);       // due in the next N days
obligationsRouter.patch("/:id",        updateObligation);
obligationsRouter.patch("/:id/pay",    markPaid);          // mark as paid
obligationsRouter.delete("/:id",       deleteObligation);
