/**
 * WealthMap — Database Seed
 * Creates demo user with rich financial footprint including advanced goals,
 * safe-to-spend appreciation profile, obligations, and dependency graph.
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
      name: 'Demo Student / User',
      email: 'demo@wealthmap.app',
      // bcrypt hash of "Demo@1234"
      passwordHash: '$2a$12$DF3subn.iol3eNpmxCn.9eg1lrJr3Q4cfjPDw4ja58E1w6uV1unem',
      currency: 'INR',
      cashBalance: '85000.00',
      savingsBalance: '150000.00',
      emergencyFundBalance: '50000.00',
      declaredMonthlyIncome: '75000.00',
      onboardingComplete: true,
      emailVerified: true,
      otpVerified: true,
    },
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  await prisma.income.createMany({
    data: [
      {
        userId: user.id,
        source: 'Tech Internship / Salary',
        amount: '75000.00',
        frequency: Frequency.MONTHLY,
        isRecurring: true,
        receivedAt: new Date(currentYear, currentMonth - 1, 1),
      },
      {
        userId: user.id,
        source: 'Freelance Design & Tutoring',
        amount: '15000.00',
        frequency: Frequency.MONTHLY,
        isRecurring: false,
        receivedAt: new Date(currentYear, currentMonth - 1, 10),
      },
    ],
  });

  await prisma.budget.create({
    data: {
      userId: user.id,
      month: currentMonth,
      year: currentYear,
      totalBudget: '52000.00',
      categoryBudgets: {
        create: [
          { category: 'FOOD', limit: '12000.00' },
          { category: 'RENT', limit: '20000.00' },
          { category: 'TRANSPORT', limit: '4000.00' },
          { category: 'ENTERTAINMENT', limit: '5000.00' },
          { category: 'UTILITIES', limit: '5000.00' },
          { category: 'SHOPPING', limit: '6000.00' },
        ],
      },
    },
    include: { categoryBudgets: true },
  });

  await prisma.expense.createMany({
    data: [
      { userId: user.id, category: 'RENT', amount: '20000.00', description: 'Monthly Apartment Rent', paymentMethod: PaymentMethod.NET_BANKING, isRecurring: true, spentAt: new Date(currentYear, currentMonth - 1, 1) },
      { userId: user.id, category: 'FOOD', amount: '2450.00', description: 'Weekly groceries at Nature Basket', paymentMethod: PaymentMethod.UPI, isRecurring: false, spentAt: new Date(currentYear, currentMonth - 1, 3) },
      { userId: user.id, category: 'TRANSPORT', amount: '650.00', description: 'Uber to University Campus', paymentMethod: PaymentMethod.UPI, isRecurring: false, spentAt: new Date(currentYear, currentMonth - 1, 5) },
      { userId: user.id, category: 'FOOD', amount: '1200.00', description: 'Team lunch with classmates', paymentMethod: PaymentMethod.CARD, isRecurring: false, spentAt: new Date(currentYear, currentMonth - 1, 7) },
      { userId: user.id, category: 'UTILITIES', amount: '2100.00', description: 'Electricity & High-speed WiFi Bill', paymentMethod: PaymentMethod.NET_BANKING, isRecurring: true, spentAt: new Date(currentYear, currentMonth - 1, 10) },
      { userId: user.id, category: 'ENTERTAINMENT', amount: '1500.00', description: 'IMAX Cinema & Snacks', paymentMethod: PaymentMethod.CARD, isRecurring: false, spentAt: new Date(currentYear, currentMonth - 1, 12) },
      { userId: user.id, category: 'FOOD', amount: '1850.00', description: 'Organic veggies & dairy groceries', paymentMethod: PaymentMethod.UPI, isRecurring: false, spentAt: new Date(currentYear, currentMonth - 1, 14) },
      { userId: user.id, category: 'SHOPPING', amount: '1499.00', description: 'Reference textbooks & stationery', paymentMethod: PaymentMethod.CARD, isRecurring: false, spentAt: new Date(currentYear, currentMonth - 1, 16) },
      { userId: user.id, category: 'TRANSPORT', amount: '450.00', description: 'Metro card monthly recharge', paymentMethod: PaymentMethod.UPI, isRecurring: false, spentAt: new Date(currentYear, currentMonth - 1, 18) },
    ],
  });

  await prisma.obligation.createMany({
    data: [
      { userId: user.id, name: 'Apartment Rent', type: ObligationType.RENT, amount: '20000.00', dueDate: new Date(currentYear, currentMonth, 1), frequency: Frequency.MONTHLY, isRecurring: true },
      { userId: user.id, name: 'Student Laptop EMI', type: ObligationType.EMI, amount: '4500.00', dueDate: new Date(currentYear, currentMonth - 1, 28), frequency: Frequency.MONTHLY, isRecurring: true },
      { userId: user.id, name: 'Health & Medical Insurance', type: ObligationType.INSURANCE, amount: '12000.00', dueDate: new Date(currentYear, 11, 15), frequency: Frequency.YEARLY, isRecurring: true },
      { userId: user.id, name: 'Gym & Sports Membership', type: ObligationType.SUBSCRIPTION, amount: '1500.00', dueDate: new Date(currentYear, currentMonth - 1, 25), frequency: Frequency.MONTHLY, isRecurring: true, isPaid: true },
    ],
  });

  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        name: 'Emergency Buffer Fund (6 Months)',
        targetAmount: '180000.00',
        currentAmount: '110000.00',
        deadline: new Date('2026-12-31'),
        status: GoalStatus.ACTIVE,
      },
      {
        userId: user.id,
        name: 'M4 MacBook Pro & Dev Setup',
        targetAmount: '150000.00',
        currentAmount: '60000.00',
        deadline: new Date('2027-08-31'),
        status: GoalStatus.ACTIVE,
      },
      {
        userId: user.id,
        name: 'Japan Graduation Trip 🌸',
        targetAmount: '250000.00',
        currentAmount: '75000.00',
        deadline: new Date('2028-04-15'),
        status: GoalStatus.ACTIVE,
      },
      {
        userId: user.id,
        name: 'EV Car Down Payment',
        targetAmount: '400000.00',
        currentAmount: '65000.00',
        deadline: new Date('2029-12-31'),
        status: GoalStatus.ACTIVE,
      },
    ],
  });

  await prisma.riskLog.create({
    data: {
      userId: user.id,
      riskScore: 24,
      riskLevel: 'LOW',
      budgetRisk: 22,
      cashFlowRisk: 20,
      obligationRisk: 30,
      velocityRisk: 25,
      goalRisk: 22,
    },
  });

  await prisma.prediction.create({
    data: {
      userId: user.id,
      type: 'EXPENSE_FORECAST',
      resultJson: {
        projectedExpense: 36000.0,
        currentMonthVelocity: 34000.0,
        historicalMonthlyAverage: 38000.0,
        recent7DayTrend: 35000.0,
      },
    },
  });

  // Dependency graph
  const income = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.INCOME, label: 'Salary + Freelance (₹90,000)', value: '90000.00', positionX: 0, positionY: 0 } });
  const cash = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.CASH, label: 'Liquid Cash (₹85,000)', value: '85000.00', positionX: 250, positionY: 0 } });
  const rent = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.RENT, label: 'Apartment Rent (₹20,000)', value: '20000.00', positionX: 500, positionY: -100 } });
  const emi = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.EMI, label: 'Laptop EMI (₹4,500)', value: '4500.00', positionX: 500, positionY: 0 } });
  const expenses = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.EXPENSES, label: 'Discretionary Spend (₹7,900)', value: '7900.00', positionX: 500, positionY: 100 } });
  const savings = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.SAVINGS, label: 'Goals & Savings (₹150,000)', value: '150000.00', positionX: 500, positionY: 200 } });
  const risk = await prisma.graphNode.create({ data: { userId: user.id, type: GraphNodeType.RISK, label: 'Risk Score (24/100 LOW)', value: '24', positionX: 750, positionY: 0 } });

  await prisma.graphEdge.createMany({
    data: [
      { sourceNodeId: income.id, targetNodeId: cash.id, relationship: 'deposits_into', weight: 1.0, severity: GraphSeverity.LOW },
      { sourceNodeId: cash.id, targetNodeId: rent.id, relationship: 'funds', weight: 0.23, severity: GraphSeverity.MEDIUM },
      { sourceNodeId: cash.id, targetNodeId: emi.id, relationship: 'funds', weight: 0.05, severity: GraphSeverity.LOW },
      { sourceNodeId: cash.id, targetNodeId: expenses.id, relationship: 'funds', weight: 0.09, severity: GraphSeverity.LOW },
      { sourceNodeId: cash.id, targetNodeId: savings.id, relationship: 'funds', weight: 0.35, severity: GraphSeverity.LOW },
      { sourceNodeId: expenses.id, targetNodeId: risk.id, relationship: 'mitigates', weight: 0.1, severity: GraphSeverity.LOW },
    ],
  });

  console.log('✔ WealthMap seed complete. Demo user ready:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
