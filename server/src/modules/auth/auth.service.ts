import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../../lib/prisma";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../lib/mailer";
import type { RegisterInput, LoginInput } from "./auth.schemas";

// ── helpers ───────────────────────────────────────────────────────────────────
const makeToken = (userId: string) => {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as `${number}${"s" | "m" | "h" | "d"}`;
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn });
};

const appErr = (message: string, code: string, statusCode: number) =>
  Object.assign(new Error(message), { code, statusCode });

const makeSecureToken = () => crypto.randomBytes(32).toString("hex");

// ── register ──────────────────────────────────────────────────────────────────
export const registerService = async (body: RegisterInput) => {
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw appErr("Email already registered", "EMAIL_EXISTS", 400);

  const passwordHash = await bcrypt.hash(body.password, 12);
  const verifyToken = makeSecureToken();
  const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      currency: body.currency ?? "INR",
      declaredMonthlyIncome: body.declaredMonthlyIncome ?? 0,
      verifyToken,
      verifyTokenExpiry,
    },
    select: { id: true, name: true, email: true, currency: true, emailVerified: true },
  });

  // Send verification email (non-blocking — don't fail register if email fails)
  sendVerificationEmail(user.email, user.name, verifyToken).catch(() => {});

  return { user, token: makeToken(user.id) };
};

// ── login ─────────────────────────────────────────────────────────────────────
export const loginService = async (body: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const valid = user && (await bcrypt.compare(body.password, user.passwordHash));

  if (!user || !valid)
    throw appErr("Invalid email or password", "INVALID_CREDENTIALS", 401);

  const { passwordHash: _, verifyToken: __, resetToken: ___, ...safeUser } = user;
  return { user: safeUser, token: makeToken(user.id) };
};

// ── verify email ──────────────────────────────────────────────────────────────
export const verifyEmailService = async (token: string) => {
  const user = await prisma.user.findFirst({
    where: {
      verifyToken: token,
      verifyTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) throw appErr("Verification link is invalid or has expired", "INVALID_TOKEN", 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExpiry: null },
  });

  return { message: "Email verified successfully. You can now log in." };
};

// ── forgot password ───────────────────────────────────────────────────────────
export const forgotPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — don't reveal if email exists (security)
  if (!user) return { message: "If that email is registered, a reset link has been sent." };

  const resetToken = makeSecureToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  });

  sendPasswordResetEmail(user.email, user.name, resetToken).catch(() => {});

  return { message: "If that email is registered, a reset link has been sent." };
};

// ── reset password ────────────────────────────────────────────────────────────
export const resetPasswordService = async (token: string, newPassword: string) => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) throw appErr("Reset link is invalid or has expired", "INVALID_TOKEN", 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  return { message: "Password reset successfully. You can now log in." };
};

// ── get current user ──────────────────────────────────────────────────────────
export const getMeService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, currency: true,
      cashBalance: true, savingsBalance: true, emergencyFundBalance: true,
      declaredMonthlyIncome: true, onboardingComplete: true,
      emailVerified: true, createdAt: true,
    },
  });
  if (!user) throw appErr("User not found", "NOT_FOUND", 404);
  return user;
};
