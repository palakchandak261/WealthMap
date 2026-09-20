import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { addIncome, getIncomes, updateIncome, deleteIncome } from "./income.controller";

export const incomeRouter = Router();

incomeRouter.use(authenticate);

incomeRouter.post("/",    addIncome);
incomeRouter.get("/",     getIncomes);
incomeRouter.patch("/:id", updateIncome);
incomeRouter.delete("/:id", deleteIncome);
