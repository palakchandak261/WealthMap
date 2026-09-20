import prisma from "../../lib/prisma";

export const getProfileService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, currency: true,
      cashBalance: true, savingsBalance: true, emergencyFundBalance: true,
      declaredMonthlyIncome: true, onboardingComplete: true, createdAt: true,
    },
  });
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
  return user;
};

export const updateProfileService = async (
  userId: string,
  body: {
    name?: string;
    currency?: string;
    cashBalance?: number;
    savingsBalance?: number;
    emergencyFundBalance?: number;
    declaredMonthlyIncome?: number;
    onboardingComplete?: boolean;
  }
) => {
  return prisma.user.update({
    where: { id: userId },
    data: body,
    select: {
      id: true, name: true, email: true, currency: true,
      cashBalance: true, savingsBalance: true, emergencyFundBalance: true,
      declaredMonthlyIncome: true, onboardingComplete: true,
    },
  });
};
