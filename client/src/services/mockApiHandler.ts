/**
 * Mock API Handler
 * Handles API calls locally using the mock store when demo mode is enabled
 * or when the backend service is offline.
 */

import {
  loadMockStore, saveMockStore, computeMockFinancialState,
  getMockRisk, getMockHealth, getMockForecast, getMockDependencyGraph
} from './mockData';
import type { Expense, Goal, Income, Obligation } from '../types';

export const handleMockRequest = async (config: {
  method?: string;
  url?: string;
  data?: any;
  params?: any;
}): Promise<any> => {
  const method = (config.method ?? 'get').toUpperCase();
  const url = (config.url ?? '').replace(/^\/api\/v1/, '');
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});

  const store = loadMockStore();

  // Helper response wrapper
  const ok = (data: any, message?: string) => ({
    data: { success: true, data, message },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });

  // 1. Auth routes
  if (url === '/auth/me') {
    return ok(store.user);
  }
  if (url === '/auth/login') {
    return ok({ token: 'mock-demo-jwt-token-wealthmap', user: store.user });
  }

  // 2. Goals routes
  if (url === '/goals' && method === 'GET') {
    return ok({ items: store.goals });
  }
  if (url === '/goals' && method === 'POST') {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      userId: store.user.id,
      name: body.name,
      targetAmount: Number(body.targetAmount),
      currentAmount: Number(body.currentAmount || 0),
      deadline: body.deadline,
      status: body.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.goals.push(newGoal);
    saveMockStore(store);
    return ok(newGoal, 'Goal added successfully');
  }
  if (url.startsWith('/goals/') && url.endsWith('/contribute') && method === 'PATCH') {
    const parts = url.split('/');
    const goalId = parts[2];
    const goal = store.goals.find(g => g.id === goalId);
    if (goal) {
      goal.currentAmount = Math.min(Number(goal.targetAmount), Number(goal.currentAmount) + Number(body.amount));
      if (goal.currentAmount >= Number(goal.targetAmount)) {
        goal.status = 'COMPLETED';
      }
      goal.updatedAt = new Date().toISOString();
      saveMockStore(store);
      return ok(goal, 'Contribution added');
    }
  }
  if (url.startsWith('/goals/') && method === 'PATCH') {
    const goalId = url.split('/')[2];
    const goalIndex = store.goals.findIndex(g => g.id === goalId);
    if (goalIndex >= 0) {
      store.goals[goalIndex] = {
        ...store.goals[goalIndex],
        ...body,
        targetAmount: body.targetAmount !== undefined ? Number(body.targetAmount) : store.goals[goalIndex].targetAmount,
        currentAmount: body.currentAmount !== undefined ? Number(body.currentAmount) : store.goals[goalIndex].currentAmount,
        updatedAt: new Date().toISOString(),
      };
      saveMockStore(store);
      return ok(store.goals[goalIndex], 'Goal updated');
    }
  }
  if (url.startsWith('/goals/') && method === 'DELETE') {
    const goalId = url.split('/')[2];
    store.goals = store.goals.filter(g => g.id !== goalId);
    saveMockStore(store);
    return ok({ id: goalId }, 'Goal deleted');
  }

  // 3. Expenses routes
  if (url === '/expenses' && method === 'GET') {
    return ok({ items: store.expenses });
  }
  if (url === '/expenses' && method === 'POST') {
    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      userId: store.user.id,
      category: body.category || 'OTHER',
      amount: Number(body.amount),
      description: body.description || '',
      paymentMethod: body.paymentMethod || 'OTHER',
      isRecurring: Boolean(body.isRecurring),
      spentAt: body.spentAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.expenses.unshift(newExp);
    saveMockStore(store);
    return ok(newExp, 'Expense added');
  }
  if ((url === '/expenses/bulk' || url === '/expenses/import') && method === 'POST') {
    const items = Array.isArray(body.items) ? body.items : Array.isArray(body) ? body : [];
    const created: Expense[] = items.map((item: any, idx: number) => ({
      id: `exp-import-${Date.now()}-${idx}`,
      userId: store.user.id,
      category: item.category || 'OTHER',
      amount: Number(item.amount),
      description: item.description || '',
      paymentMethod: item.paymentMethod || 'OTHER',
      isRecurring: Boolean(item.isRecurring),
      spentAt: item.spentAt ? new Date(item.spentAt).toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    store.expenses.unshift(...created);
    saveMockStore(store);
    return ok({ count: created.length, items: created }, `${created.length} expenses imported successfully`);
  }
  if (url.startsWith('/expenses/') && method === 'PATCH') {
    const expId = url.split('/')[2];
    const idx = store.expenses.findIndex(e => e.id === expId);
    if (idx >= 0) {
      store.expenses[idx] = { ...store.expenses[idx], ...body, updatedAt: new Date().toISOString() };
      saveMockStore(store);
      return ok(store.expenses[idx], 'Expense updated');
    }
  }
  if (url.startsWith('/expenses/') && method === 'DELETE') {
    const expId = url.split('/')[2];
    store.expenses = store.expenses.filter(e => e.id !== expId);
    saveMockStore(store);
    return ok({ id: expId }, 'Expense deleted');
  }

  // 4. Incomes routes
  if (url === '/income' && method === 'GET') {
    return ok({ items: store.incomes });
  }
  if (url === '/income' && method === 'POST') {
    const newInc: Income = {
      id: `inc-${Date.now()}`,
      userId: store.user.id,
      source: body.source,
      amount: Number(body.amount),
      frequency: body.frequency || 'MONTHLY',
      isRecurring: Boolean(body.isRecurring),
      receivedAt: body.receivedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.incomes.unshift(newInc);
    saveMockStore(store);
    return ok(newInc, 'Income added');
  }
  if (url.startsWith('/income/') && method === 'DELETE') {
    const incId = url.split('/')[2];
    store.incomes = store.incomes.filter(i => i.id !== incId);
    saveMockStore(store);
    return ok({ id: incId }, 'Income deleted');
  }

  // 5. Budgets routes
  if (url.startsWith('/budgets') && method === 'GET') {
    return ok(store.budget);
  }
  if (url === '/budgets' && (method === 'POST' || method === 'PUT')) {
    store.budget = {
      ...store.budget,
      ...body,
      totalBudget: Number(body.totalBudget || store.budget.totalBudget),
      updatedAt: new Date().toISOString(),
    };
    saveMockStore(store);
    return ok(store.budget, 'Budget updated');
  }

  // 6. Obligations routes
  if (url === '/obligations' && method === 'GET') {
    return ok({ items: store.obligations });
  }
  if (url === '/obligations' && method === 'POST') {
    const newObl: Obligation = {
      id: `obl-${Date.now()}`,
      userId: store.user.id,
      name: body.name,
      type: body.type,
      amount: Number(body.amount),
      dueDate: body.dueDate,
      frequency: body.frequency || 'MONTHLY',
      isRecurring: Boolean(body.isRecurring),
      isPaid: Boolean(body.isPaid),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.obligations.push(newObl);
    saveMockStore(store);
    return ok(newObl, 'Obligation created');
  }
  if (url.startsWith('/obligations/') && method === 'PATCH') {
    const oblId = url.split('/')[2];
    const idx = store.obligations.findIndex(o => o.id === oblId);
    if (idx >= 0) {
      store.obligations[idx] = { ...store.obligations[idx], ...body, updatedAt: new Date().toISOString() };
      saveMockStore(store);
      return ok(store.obligations[idx], 'Obligation updated');
    }
  }
  if (url.startsWith('/obligations/') && method === 'DELETE') {
    const oblId = url.split('/')[2];
    store.obligations = store.obligations.filter(o => o.id !== oblId);
    saveMockStore(store);
    return ok({ id: oblId }, 'Obligation deleted');
  }

  // 7. Intelligence & Calculation Engines
  const state = computeMockFinancialState(store.expenses, store.budget, store.obligations, store.goals);

  if (url === '/engine/financial-state') {
    return ok(state);
  }
  if (url === '/engine/forecast') {
    return ok(getMockForecast(state));
  }
  if (url === '/engine/risk') {
    return ok(getMockRisk(state));
  }
  if (url === '/engine/health-score') {
    return ok(getMockHealth());
  }
  if (url === '/engine/dependency-graph') {
    return ok(getMockDependencyGraph());
  }
  if (url === '/engine/simulate') {
    const simAmount = Number(body.amount || 0);
    const newSpent = state.totalSpent + simAmount;
    const newRemaining = Math.max(state.totalBudget - newSpent, 0);
    const safeDaily = Math.max(Math.round(newRemaining / state.daysRemainingInMonth), 0);
    return ok({
      input: { amount: simAmount, category: body.category, description: body.description },
      before: {
        riskScore: 24, riskLevel: 'LOW', healthScore: 88, healthGrade: 'EXCELLENT',
        projectedExpense: state.totalSpent + 12000, cashBalance: state.cashBalance,
        safeDaily: state.safeDailySpending, budgetRemaining: state.totalRemaining,
      },
      after: {
        riskScore: simAmount > state.safeDailySpending * 3 ? 42 : 26,
        riskLevel: simAmount > state.safeDailySpending * 3 ? 'MODERATE' : 'LOW',
        healthScore: simAmount > state.safeDailySpending * 3 ? 79 : 86,
        healthGrade: simAmount > state.safeDailySpending * 3 ? 'GOOD' : 'EXCELLENT',
        projectedExpense: state.totalSpent + simAmount + 12000,
        cashBalance: Math.max(state.cashBalance - simAmount, 0),
        safeDaily: safeDaily, budgetRemaining: newRemaining,
      },
      diff: {
        riskDelta: simAmount > state.safeDailySpending * 3 ? 18 : 2,
        healthDelta: simAmount > state.safeDailySpending * 3 ? -9 : -2,
        cashImpact: -simAmount,
        budgetImpact: -simAmount,
        projectedImpact: simAmount,
      },
      verdict: simAmount <= state.safeSpendableAmount
        ? 'Safe purchase! You have ample buffer in your safe-to-spend allowance.'
        : 'Caution: This purchase exceeds your safe discretionary buffer this month.',
      safe: simAmount <= state.safeSpendableAmount,
    });
  }

  // 8. AI Recommendations & Goal Advisory
  if (url === '/ai/recommendations') {
    const userPrompt = String(body.context || '').toLowerCase();
    const isSafe = state.avgDailySpending <= state.safeDailySpending;

    let recs: string[] = [];

    if (userPrompt.includes('goal') || userPrompt.includes('save') || userPrompt.includes('vacation') || userPrompt.includes('emergency')) {
      recs = [
        `Target Savings Plan: Based on your current safe monthly surplus of ₹${state.safeSpendableAmount.toLocaleString('en-IN')}, we recommend saving ₹8,500/month for your Emergency Fund and ₹5,000/month for your Tech Upgrade.`,
        `Inflation Protection: At a projected 6% annual inflation rate, your long-term goals will need an extra 12-18% capital buffer. Consider parking goals > 2 years into diversified index funds.`,
        `Safe Spending Surplus: You are spending ₹${state.avgDailySpending}/day vs your safe limit of ₹${state.safeDailySpending}/day. This ₹${state.safeDailySpending - state.avgDailySpending}/day savings margin frees up ₹${Math.round((state.safeDailySpending - state.avgDailySpending) * state.daysRemainingInMonth)} extra this month directly for goal funding!`,
      ];
    } else {
      recs = [
        isSafe
          ? `🎉 Outstanding spending discipline! Your daily spend is ₹${state.avgDailySpending}/day, keeping you well under your safe limit of ₹${state.safeDailySpending}/day. Maintain this to save ₹${Math.round((state.safeDailySpending - state.avgDailySpending) * state.daysRemainingInMonth)} extra this month!`
          : `Keep an eye on dining and shopping: Try capping daily spending at ₹${state.safeDailySpending} for the remaining ${state.daysRemainingInMonth} days.`,
        `Upcoming Obligation: Your laptop EMI of ₹4,500 is due soon. Funds are fully protected and safe in your balance.`,
        `Long-Term Wealth: Allocate 35% of your remaining monthly surplus into your Emergency Fund goal to reach completion 2 months ahead of schedule.`,
      ];
    }

    return ok({
      recommendations: recs,
      context: {
        riskScore: isSafe ? 24 : 45,
        riskLevel: isSafe ? 'LOW' : 'MODERATE',
        healthScore: 88,
        healthGrade: 'EXCELLENT',
        willExceedBudget: false,
      },
    });
  }

  // Fallback for unknown routes
  return ok({}, 'Demo response');
};
