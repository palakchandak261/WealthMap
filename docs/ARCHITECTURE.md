# 🏗️ WealthMap — System Architecture

## High-Level Flow

```
FRONTEND (React + TypeScript)
        │
        │  REST API (JSON over HTTP)
        ▼
BACKEND (Express + TypeScript)
        │
   ┌────┴─────────────────────────────────┐
   │                                       │
   ▼                                       ▼
BUSINESS LOGIC ENGINES              AI LAYER (LLM API)
   │                                       │
   ├── Financial State Engine              └── Receives structured financial
   ├── Budget Engine                           data from engines, returns
   ├── Forecasting Engine                      natural language insights
   ├── Risk Engine
   ├── Dependency Graph Engine
   ├── What-If Simulation Engine
   └── Health Score Engine
        │
        ▼
DATABASE (MySQL via Prisma ORM)
```

## Financial State Engine — Core Concept

The Financial State Engine is the "Digital Twin" of the user's finances.
Every other engine reads from this state.

```
Financial State = {
  income,
  cash,
  savings,
  monthlyBudget,
  categoryBudgets,
  actualExpenses,
  remainingBudget,
  upcomingObligations,
  debts,
  goals,
  spendingRate,
  riskScore
}
```

When any data changes (new expense, new obligation, budget edit),
the state is recalculated before any engine runs.

## Dependency Graph — Data Model

Nodes represent financial entities:
- INCOME, CASH, BUDGET, EXPENSES, SAVINGS, BUFFER, EMI, RENT, DEBT, GOALS, RISK

Edges represent relationships with weight + severity:
- Cash → EMI (relationship: "funds", severity: HIGH)
- Income → Cash (relationship: "deposits_into", severity: CRITICAL)
- Expenses → Cash (relationship: "reduces", severity: HIGH)

When a node's value changes, the engine propagates the delta
through outbound edges using BFS, recalculating severity at each hop.

## Risk Score Formula

```
RiskScore = (
  0.30 × BudgetRisk +
  0.25 × CashFlowRisk +
  0.20 × ObligationRisk +
  0.15 × SpendingVelocityRisk +
  0.10 × GoalRisk
)

Where each component is normalized to 0–100.
```

## Forecast Formula

```
ProjectedExpense = (
  0.50 × currentMonthVelocity +
  0.30 × historicalMonthlyAverage +
  0.20 × recent7DayTrend
) × daysInMonth
```

## Health Score Formula

```
HealthScore = (
  0.25 × budgetAdherence +
  0.20 × cashBufferScore +
  0.20 × obligationCoverageScore +
  0.15 × spendingStabilityScore +
  0.10 × savingsRateScore +
  0.10 × goalProgressScore
)

Where each component is normalized to 0–100.
Final score is 0–100.
```

## What-If Simulation Flow

```
1. Clone current Financial State (deep copy)
2. Apply hypothetical expense/income delta
3. Re-run all engines on the cloned state
4. Compare: original state vs simulated state
5. Return diff: { riskDelta, balanceDelta, goalImpact, budgetImpact }
6. Discard clone — original state is never modified
```

## AI Layer Integration

```
1. Engines produce structured results (JSON)
2. Build a financial context summary string
3. Send to LLM API with a system prompt:
   "You are a financial assistant. Based on this data, give 2–3 concise
    actionable recommendations. Do not perform calculations."
4. Return LLM response to frontend
```

The AI never does math. It only explains what the engines calculated.
