# 💰 WealthMap — Predict. Simulate. Prevent.

> **WealthMap: A Proactive Personal Financial Decision-Support and Risk Prediction System**

WealthMap doesn't just track where your money went — it models your complete financial state, predicts what's likely to happen, simulates hypothetical decisions, and helps you act before problems occur.

---

## 🎯 Core Philosophy

```
USER DATA → FINANCIAL STATE ENGINE → PREDICTION → RISK ENGINE
         → DEPENDENCY GRAPH → WHAT-IF SIMULATION → RECOMMENDATIONS
```

**The 3 pillars:**
- 🔮 **PREDICT** — What is likely to happen to your finances?
- 🧪 **SIMULATE** — What happens if you make this purchase?
- 🛡️ **PREVENT** — What can you do before the problem occurs?

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Charts | Recharts |
| Graph Visualization | React Flow |
| Backend | Node.js + Express.js + TypeScript |
| Database | MySQL + Prisma ORM |
| AI Layer | LLM API (OpenAI / Gemini) |
| Auth | JWT |

---

## 📁 Project Structure

```
WealthMap/
├── client/                  # React frontend
│   ├── public/
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Route-level pages
│       ├── hooks/           # Custom React hooks
│       ├── services/        # API call functions
│       ├── store/           # State management (Context/Zustand)
│       ├── types/           # TypeScript interfaces
│       └── utils/           # Helper functions
│
├── server/                  # Express backend
│   └── src/
│       ├── modules/         # Feature modules
│       │   ├── auth/
│       │   ├── users/
│       │   ├── income/
│       │   ├── expenses/
│       │   ├── budgets/
│       │   ├── obligations/
│       │   ├── goals/
│       │   ├── engines/
│       │   │   ├── financial-state/
│       │   │   ├── forecasting/
│       │   │   ├── risk/
│       │   │   ├── dependency/
│       │   │   ├── simulation/
│       │   │   └── health-score/
│       │   └── ai/
│       ├── prisma/          # DB schema + migrations
│       ├── middleware/
│       └── utils/
│
├── docs/                    # Architecture docs, API specs
├── .github/                 # PR templates, issue templates
└── README.md
```

---

## 🧩 10 Modules Overview

| # | Module | Description |
|---|--------|-------------|
| 1 | User & Financial Profile | Auth, onboarding, financial snapshot |
| 2 | Income & Expense Management | Transaction CRUD, day-wise timeline |
| 3 | Budget Engine | Category budgets, utilization tracking |
| 4 | Financial State Engine | Real-time financial snapshot (Digital Twin) |
| 5 | Prediction & Forecasting | Weighted multi-signal expense projection |
| 6 | Risk & Alert Engine | Budget/cash-flow/obligation risk scoring |
| 7 | Financial Dependency Graph | Cascading impact via weighted directed graph |
| 8 | What-If Simulator | Hypothetical scenario simulation |
| 9 | Financial Health & Goals | Health score (0–100), goal tracking |
| 10 | AI Recommendation Engine | LLM-powered natural language insights |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MySQL 8+
- npm or yarn

### 1. Clone the repo
```bash
git clone https://github.com/palakchandak261/WealthMap.git
cd WealthMap
```

### 2. Setup the backend
```bash
cd server
npm install
cp .env.example .env        # fill in your DB credentials + LLM API key
npx prisma migrate dev      # run database migrations
npx prisma generate         # generate Prisma client
npm run dev                 # starts on http://localhost:5000
```

### 3. Setup the frontend
```bash
cd client
npm install
cp .env.example .env        # set VITE_API_URL=http://localhost:5000
npm run dev                 # starts on http://localhost:5173
```

---

## 🗄️ Database Schema (Summary)

| Table | Purpose |
|-------|---------|
| `users` | Auth + financial profile |
| `incomes` | Income sources |
| `expenses` | All transactions |
| `budgets` | Monthly budget |
| `category_budgets` | Per-category limits |
| `obligations` | EMIs, rent, bills |
| `goals` | Savings goals |
| `predictions` | Stored forecast results |
| `risk_logs` | Risk score history |
| `graph_nodes` | Dependency graph nodes |
| `graph_edges` | Dependency graph edges |

---

## 🧮 Core Algorithms

```
1.  Budget Utilization          = Actual / Budget × 100
2.  Safe Daily Spending         = (Remaining − Obligations − Buffer) / Days Left
3.  Spending Velocity           = Current Avg Daily / Previous Avg Daily
4.  Expense Forecast            = 0.5×CurrentTrend + 0.3×HistoricalAvg + 0.2×7DayTrend
5.  Category Forecast           = per-category weighted projection
6.  Risk Score                  = 0.30×Budget + 0.25×CashFlow + 0.20×Obligation
                                  + 0.15×Velocity + 0.10×Goal  (normalized 0–100)
7.  Cash-Flow Projection        = Cash − Σ(upcoming obligations) − projected spend
8.  Dependency Propagation      = BFS/DFS on weighted directed graph
9.  What-If Simulation          = clone financial state → apply delta → recalculate all
10. Anomaly Detection           = Z-score / IQR on per-category spending
11. Health Score                = 25%BudgetAdherence + 20%CashBuffer + 20%ObligationCoverage
                                  + 15%SpendingStability + 10%Savings + 10%GoalProgress
```

---

## 📊 Risk Levels

| Score | Level |
|-------|-------|
| 0–30 | 🟢 LOW |
| 31–60 | 🟡 MODERATE |
| 61–80 | 🔴 HIGH |
| 81–100 | 🚨 CRITICAL |

---

## 🗺️ Development Phases

### Phase 1 — MVP (Start here)
- [ ] Authentication (register/login/JWT)
- [ ] Income management
- [ ] Expense CRUD + categories
- [ ] Monthly budget setup
- [ ] Category budgets
- [ ] Dashboard with basic stats
- [ ] Day-wise expense timeline
- [ ] Basic budget alerts

### Phase 2 — Intelligence
- [ ] Spending velocity engine
- [ ] Safe-to-spend calculator
- [ ] Expense forecasting (weighted model)
- [ ] Category-level predictions
- [ ] Cash-flow projection
- [ ] Risk scoring engine

### Phase 3 — Unique Features
- [ ] Financial Digital Twin (state snapshot)
- [ ] Financial Dependency Graph (React Flow)
- [ ] Cascading impact engine
- [ ] Risk date prediction (timeline)
- [ ] What-If Simulator

### Phase 4 — Advanced
- [ ] Financial Health Score (0–100, explainable)
- [ ] Goals with progress tracking
- [ ] Anomaly detection (Z-score)
- [ ] Recurring expense detection
- [ ] Budget recommendation engine
- [ ] AI natural-language recommendations

---

## 👥 Team Workflow

See [`docs/TEAM_WORKFLOW.md`](./docs/TEAM_WORKFLOW.md) for the complete guide on:
- Branch strategy
- How to pick up tasks
- PR process
- Code review rules
- Who owns what module

---

## ⚠️ Disclaimer

> WealthMap provides computational insights and simulations based on user-provided data. It is **not** a replacement for professional financial advice. All projections are estimates based on observed spending patterns.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE)
