import { Router } from "express";
import { register, login, getMe, verifyEmail, forgotPassword, resetPassword } from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { authLimiter } from "../../middleware/rateLimiter";
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from "./auth.schemas";

export const authRouter = Router();

// Rate-limited + validated auth routes
authRouter.post("/register",       authLimiter, validate(RegisterSchema),       register);
authRouter.post("/login",          authLimiter, validate(LoginSchema),           login);
authRouter.post("/forgot-password",authLimiter, validate(ForgotPasswordSchema),  forgotPassword);
authRouter.post("/reset-password", authLimiter, validate(ResetPasswordSchema),   resetPassword);

// Email verification (token in URL param)
authRouter.get("/verify-email/:token", verifyEmail);

// Protected
authRouter.get("/me", authenticate, getMe);
