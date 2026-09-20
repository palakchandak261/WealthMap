import { Router } from "express";
import { register, login, getMe } from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login",    login);
authRouter.get("/me",        authenticate, getMe);  // protected
