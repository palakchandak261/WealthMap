/**
 * WealthMap — Database Seed
 * Creates one demo user with a realistic financial footprint so the backend
 * team can build/test the Financial State, Forecasting, Risk, Dependency
 * Graph, and What-If engines against real rows immediately.
 *
 * Run with: npx prisma db seed
 */
import { PrismaClient, Frequency, ObligationType, GoalStatus, GraphNodeType, GraphSeverity, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean slate for repeatable seeding in dev
  await prisma.graphEdge.deleteMany();
  await prisma.graphNode.deleteMany();
  await prisma.riskLog.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.obligation.deleteMany();
  await prisma.categoryBudget.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@wealthmap.app',
      // bcrypt hash of "Demo@1234" — replace before real auth testing
      passwordHash: '$2b$12$KIXjH0n/V4V.yRZ8PQGIKeO0aTCMXSEXzRvMq3XcRAn4L5BW5Ky9S',
      currency: 'INR',
      cashBalance: '85000.00',
      savingsBalance: '150000.00',
      emergencyFundBalance: '50000.00',
      declaredMonthlyIncome: '75000.00',
      onboardingComplete: true,
    },
  });

  await prisma.income.create({
    data: {
      userId: user.id,
      source: 'Salary',
      amount: '75000.00',
      frequency: Frequency.MONTHLY,
      isRecurring: true,
      receivedAt: new Date('2026-09-01'),
    },
  });

  const budget = await prisma.budget.create({
    data: {
      userId: user.id,
      month: 9,
      year: 2026,
      totalBudget: '50000.00',
      categoryBudgets: {
        create: [
          { category: 'Groceries', limit: '10000.00' },
          { category: 'Rent', limit: '20000.00' },
          { category: 'Dining', limit: '6000.00' },
          { category: 'Transport', limit: '4000.00' },
          { category: 'Entertainment', limit: '5000.00' },
          { category: 'Utilities', limit: '5000.00' },
        ],
      },
    },
    include: { categoryBudgets: true },
  });

  await prisma.expense.createMany({
    data: [
      { userId: user.id, category: 'Groceries', amount: '2200.00', description: 'Weekly groceries', paymentMethod: PaymentMethod.UPI, isRecurring: false, spentAt: new Date('2026-09-02') },
      { userId: user.id, category: 'Dining', amount: '1500.00', description: 'Dinner out', paymentMethod: PaymentMethod.CARD, isRecurring: false, spentAt: new Date('2026-09-05') },
      { userId: user.id, category: 'Transport', amount: '900.00', description: 'Cab rides', paymentMethod: PaymentMethod.UPI, isRecurring: false, spentAt: new Date('2026-09-06') },
      { userId: user.id, category: 'Entertainment', amount: '2500.00', description: 'Concert tickets', paymentMethod: PaymentMethod.CARD, isRecurring: false, spentAt: new Date('2026-09-10') },
      { userId: user.id, category: 'Groceries', amount: '2100.00', description: 'Weekly groceries', paymentMethod: PaymentMethod.UPI, isRecurring: false, spentAt: new Date('2026-09-12') },
      { userId: user.id, category: 'Utilities', amount: '3200.00', description: 'Electricity + water', paymentMethod: PaymentMethod.NET_BANKING, isRecurring: true, spentAt: new Date('2026-09-14') },
      { userId: user.id, category: 'Entertainment', amount: '299.00', description: 'Streaming subscription', paymentMethod: PaymentMethod.CARD, isRecurring: true, spentAt: new Date('2026-09-01') },
    ],
  });

  await prisma.obligation.createMany({
    data: [
      { userId: user.id, name: 'Home Rent', type: ObligationType.RENT, amount: '20000.00', dueDate: new Date('2026-10-01'), frequency: Frequency.MONTHLY, isRecurring: true },
      { userId: user.id, name: 'Car EMI', type: ObligationType.EMI, amount: '8500.00', dueDate: new Date('2026-09-28'), frequency: Frequency.MONTHLY, isRecurring: true },
      { userId: user.id, name: 'Health Insurance', type: ObligationType.INSURANCE, amount: '12000.00', dueDate: new Date('2026-12-15'), frequency: Frequency.YEARLY, isRecurring: true },
    ],
  });

  await prisma.goal.create({
    data: {
      userId: user.id,
      name: 'Emergency Fund',
      targetAmount: '300000.00',
      currentAmount: '150000.00',
      deadline: new Date('2027-06-30'),
      status: GoalStatus.ACTIVE,
    },
  });

  await prisma.riskLog.create({
    data: {
      userId: user.id,
      riskScore: 42,
      riskLevel: 'MODERATE',
      budgetRisk: 35,
      cashFlowRisk: 40,
      obligationRisk: 55,
      velocityRisk: 30,
      goalRisk: 50,
    },
  });

  await prisma.prediction.create({
    data: {
      userId: user.id,
      type: 'EXPENSE_FORECAST',
      resultJson: {
        projectedExpense: 48750.0,
        currentMonthVelocity: 46000.0,
        historicalMonthlyAverage: 49500.0,
        recent7DayTrend: 51000.0,
      },
    },
  });

  // Dependency graph: Income -> Cash -> {EMI, Rent, Expenses}, Cash -> Savings/Goals
  const income = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.INCOME, label: 'Salary', value: '75000.00', positionX: 0, positionY: 0 } });
  const cash = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.CASH, label: 'Cash', value: '85000.00', positionX: 250, positionY: 0 } });
  const rent = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.RENT, label: 'Home Rent', value: '20000.00', positionX: 500, positionY: -100 } });
  const emi = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.EMI, label: 'Car EMI', value: '8500.00', positionX: 500, positionY: 0 } });
  const expenses = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.EXPENSES, label: 'Monthly Expenses', value: '12400.00', positionX: 500, positionY: 100 } });
  const savings = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.SAVINGS, label: 'Savings', value: '150000.00', positionX: 500, positionY: 200 } });
  const risk = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.RISK, label: 'Risk Score', value: '42', positionX: 750, positionY: 0 } });

  await prisma.graphEdge.createMany({
    data: [
      { sourceNodeId: income.id, targetNodeId: cash.id, relationship: 'deposits_into', weight: 1.0, severity: GraphSeverity.CRITICAL },
      { sourceNodeId: cash.id, targetNodeId: rent.id, relationship: 'funds', weight: 0.24, severity: GraphSeverity.HIGH },
      { sourceNodeId: cash.id, targetNodeId: emi.id, relationship: 'funds', weight: 0.1, severity: GraphSeverity.HIGH },
      { sourceNodeId: cash.id, targetNodeId: expenses.id, relationship: 'funds', weight: 0.15, severity: GraphSeverity.MEDIUM },
      { sourceNodeId: cash.id, targetNodeId: savings.id, relationship: 'funds', weight: 0.2, severity: GraphSeverity.LOW },
      { sourceNodeId: expenses.id, targetNodeId: cash.id, relationship: 'reduces', weight: 1.0, severity: GraphSeverity.HIGH },
      { sourceNodeId: rent.id, targetNodeId: risk.id, relationship: 'increases', weight: 0.3, severity: GraphSeverity.HIGH },
      { sourceNodeId: emi.id, targetNodeId: risk.id, relationship: 'increases', weight: 0.2, severity: GraphSeverity.MEDIUM },
    ],
  });

  console.log('✔ Seed complete. Demo user:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
