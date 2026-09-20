import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";

// ── helpers ──────────────────────────────────────────────────────────────────
const makeToken = (userId: string) => {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as `${number}${"s"|"m"|"h"|"d"}`;
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn });
};

const appErr = (message: string, code: string, statusCode: number) =>
  Object.assign(new Error(message), { code, statusCode });

// ── register ─────────────────────────────────────────────────────────────────
export const registerService = async (body: {
  name: string;
  email: string;
  password: string;
  currency?: string;
  declaredMonthlyIncome?: number;
}) => {
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw appErr("Email already registered", "EMAIL_EXISTS", 400);

  const passwordHash = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      name:                 body.name,
      email:                body.email,
      passwordHash,
      currency:             body.currency ?? "INR",
      declaredMonthlyIncome: body.declaredMonthlyIncome ?? 0,
    },
    select: { id: true, name: true, email: true, currency: true },
  });

  return { user, token: makeToken(user.id) };
};

// ── login ────────────────────────────────────────────────────────────────────
export const loginService = async (body: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const valid = user && (await bcrypt.compare(body.password, user.passwordHash));

  if (!user || !valid)
    throw appErr("Invalid email or password", "INVALID_CREDENTIALS", 401);

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token: makeToken(user.id) };
};

// ── get current user ─────────────────────────────────────────────────────────
export const getMeService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, currency: true,
      cashBalance: true, savingsBalance: true, emergencyFundBalance: true,
      declaredMonthlyIncome: true, onboardingComplete: true, createdAt: true,
    },
  });
  if (!user) throw appErr("User not found", "NOT_FOUND", 404);
  return user;
};
