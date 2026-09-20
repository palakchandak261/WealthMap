import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getProfile, updateProfile } from "./users.controller";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/profile",   getProfile);
usersRouter.patch("/profile", updateProfile);
