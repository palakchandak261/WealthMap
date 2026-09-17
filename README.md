# 💰 WealthMap — Predict. Simulate. Prevent.

> **WealthMap: A Proactive Personal Financial Decision-Support and Risk Prediction System**

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

# 💰 WealthMap

### Proactive Personal Finance Decision-Support System

> **Set Budget → Track Expenses → Compare → Alert → Predict → Analyze Impact → Simulate → Recommend**

WealthMap is a proactive personal finance management system designed to help users understand their current financial situation, monitor day-wise spending, manage monthly and category-wise budgets, receive early warnings, predict future spending, account for upcoming financial obligations, and analyze the possible consequences of financial decisions before they happen.

Unlike a traditional expense tracker that mainly answers **"Where did my money go?"**, WealthMap aims to answer:

> **"Where is my money going, am I likely to exceed my budget, what happens if I continue spending this way, and could my spending affect my upcoming financial obligations?"**

---

# 📌 Table of Contents

* [Project Overview](#-project-overview)
* [Problem Statement](#-problem-statement)
* [Project Objective](#-project-objective)
* [Core Idea](#-core-idea)
* [Key Features](#-key-features)
* [How WealthMap Works](#-how-wealthmap-works)
* [System Architecture](#-system-architecture)
* [Technology Stack](#-technology-stack)
* [Project Structure](#-project-structure)
* [Database Design](#-database-design)
* [Backend Modules](#-backend-modules)
* [Frontend Modules](#-frontend-modules)
* [Financial Intelligence](#-financial-intelligence)
* [Budget Alert System](#-budget-alert-system)
* [Prediction and Pre-Computation](#-prediction-and-pre-computation)
* [Financial Readiness Score](#-financial-readiness-score)
* [Dependency and Cascading Impact](#-dependency-and-cascading-impact)
* [What-If Simulation](#-what-if-simulation)
* [AI Recommendation System](#-ai-recommendation-system)
* [API Overview](#-api-overview)
* [Development Roadmap](#-development-roadmap)
* [Team Responsibilities](#-team-responsibilities)
* [Dataset](#-dataset)
* [Testing](#-testing)
* [Git Workflow](#-git-workflow)
* [Installation](#-installation)
* [Environment Variables](#-environment-variables)
* [Running the Project](#-running-the-project)
* [Project Goals](#-project-goals)
* [Future Scope](#-future-scope)
* [Disclaimer](#-disclaimer)
* [Contributors](#-contributors)

---

# 📖 Project Overview

WealthMap combines:

* Expense tracking
* Budget management
* Day-wise financial monitoring
* Budget alerts
* Daily spending limits
* Pre-computation
* Spending prediction
* Category-wise prediction
* Recurring obligations
* Cash-flow analysis
* Debt management
* Financial readiness analysis
* Dependency mapping
* Cascading financial impact
* What-If analysis
* AI-based explanations and recommendations

The system progressively transforms raw financial transactions into useful decision-support information.

```text
User Financial Data
        ↓
Budget & Expense Tracking
        ↓
Comparison
        ↓
Alerts
        ↓
Pre-Computation
        ↓
Prediction
        ↓
Obligation Analysis
        ↓
Risk Analysis
        ↓
Cascading Impact
        ↓
What-If Simulation
        ↓
Recommendation
```

---

# ❗ Problem Statement

Traditional personal finance applications mainly provide historical information such as:

* Total expenses
* Spending categories
* Account balance
* Monthly transactions

However, users often need more proactive information:

* Am I spending too quickly?
* Will I exceed my monthly budget?
* Which category is likely to exceed its budget?
* How much can I safely spend per day?
* Will upcoming EMI or bills create financial pressure?
* What could happen if I make an unexpected large purchase?
* Could one financial problem affect another obligation?

WealthMap addresses these questions by combining **tracking, comparison, pre-computation, prediction, alerts, dependencies, and simulation**.

---

# 🎯 Project Objective

The main objective of WealthMap is to build a financial decision-support system that:

1. Allows users to define monthly budgets.
2. Supports category-wise budget allocation.
3. Tracks expenses day-wise.
4. Compares actual expenses against planned budgets.
5. Generates threshold-based alerts.
6. Calculates recommended daily spending limits.
7. Pre-computes projected month-end spending.
8. Predicts potential budget violations.
9. Predicts category-wise spending.
10. Tracks recurring expenses and financial obligations.
11. Analyzes income versus expenses.
12. Evaluates financial risk.
13. Calculates a project-defined Financial Readiness Score.
14. Represents financial dependencies using a graph.
15. Analyzes cascading financial impact.
16. Allows users to perform What-If simulations.
17. Provides AI-generated explanations and recommendations.

---

# 💡 Core Idea

## Observe → Understand → Predict → Simulate → Prevent

The system starts with actual financial data and progressively converts it into actionable information.

```text
OBSERVE
Income + Expenses + Budgets + Obligations
        ↓
UNDERSTAND
Spending Patterns + Budget Usage
        ↓
PREDICT
Future Spending + Cash Flow
        ↓
SIMULATE
Potential Financial Decisions
        ↓
PREVENT
Early Alerts + Recommendations
```

---

# ⭐ Key Features

## Must Have

* User authentication
* Income management
* Monthly budget
* Category-wise budget
* Day-wise expense tracking
* Budget comparison
* Budget alerts
* Daily spending limit
* Pre-computation
* Month-end expense prediction
* Dashboard

## Good to Have

* Recurring expenses
* Income vs expense analysis
* Category-wise prediction
* Upcoming obligations
* Financial Readiness Score
* Notifications

## Advanced / Unique

* Debt management
* Debt payment tracking
* Co-signer relationships
* Credit utilization
* Financial Dependency Graph
* Cascading Impact Analysis
* What-If Simulation
* AI recommendations

---

# 🔄 How WealthMap Works

```text
User Registers
      ↓
Adds Income
      ↓
Defines Monthly Budget
      ↓
Defines Category Budgets
      ↓
Adds Upcoming Obligations
      ↓
Records Expenses Day-wise
      ↓
System Calculates Actual Spending
      ↓
Compares Spending With Budget
      ↓
Generates Alerts
      ↓
Calculates Daily Spending Limit
      ↓
Pre-Computes Future Spending
      ↓
Predicts Month-End Expense
      ↓
Checks Upcoming Obligations
      ↓
Calculates Risk
      ↓
Updates Readiness Score
      ↓
Analyzes Dependencies
      ↓
Calculates Cascading Impact
      ↓
Allows What-If Simulation
      ↓
Generates AI Explanation
```

---

# 🏗️ System Architecture

```text
                         ┌──────────────────┐
                         │       USER       │
                         └────────┬─────────┘
                                  │
                                  ↓
                    ┌─────────────────────────┐
                    │    REACT FRONTEND       │
                    │                         │
                    │ React + TypeScript      │
                    │ Tailwind CSS             │
                    │ Recharts                 │
                    │ React Flow               │
                    └────────────┬────────────┘
                                 │
                              REST API
                                 │
                                 ↓
                 ┌───────────────────────────────┐
                 │ NODE + EXPRESS + TYPESCRIPT   │
                 │                               │
                 │ Authentication                │
                 │ Budget Engine                 │
                 │ Alert Engine                  │
                 │ Prediction Engine             │
                 │ Cash Flow Engine              │
                 │ Risk Engine                   │
                 │ Readiness Engine              │
                 │ Dependency Engine             │
                 │ Cascading Impact Engine       │
                 │ What-If Engine                │
                 │ Recommendation Engine         │
                 └───────────────┬───────────────┘
                                 │
                               PRISMA
                                 │
                                 ↓
                    ┌─────────────────────────┐
                    │       MYSQL 8.x         │
                    │                         │
                    │ Users                   │
                    │ Income                  │
                    │ Expenses                │
                    │ Budgets                 │
                    │ Obligations             │
                    │ Debts                   │
                    │ Goals                   │
                    │ Predictions             │
                    │ Risks                   │
                    │ Dependencies            │
                    │ Simulations             │
                    └─────────────────────────┘
                                 │
                                 ↓
                          ┌────────────┐
                          │  LLM API   │
                          └────────────┘
                                 │
                                 ↓
                       AI Explanations
                       & Recommendations
```

---

# 🛠️ Technology Stack

## Frontend

| Technology   | Purpose           |
| ------------ | ----------------- |
| React.js     | User interface    |
| TypeScript   | Type safety       |
| HTML/JSX     | UI structure      |
| CSS          | Styling           |
| Tailwind CSS | UI design         |
| Axios        | API communication |
| Recharts     | Financial charts  |
| React Flow   | Dependency graphs |

## Backend

| Technology | Purpose                         |
| ---------- | ------------------------------- |
| Node.js    | Runtime                         |
| Express.js | REST API framework              |
| TypeScript | Type-safe backend               |
| Prisma     | ORM                             |
| JWT        | Authentication                  |
| bcrypt     | Password hashing                |
| Zod        | Request validation              |
| Axios      | External API communication      |
| LLM API    | AI explanations/recommendations |

## Database

```text
MySQL 8.x
Prisma ORM
SQL
```

## Development Tools

```text
VS Code
Git
GitHub
Postman
Figma
```

---

# 📁 Project Structure

```text
WealthMap/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── context/
│   │   └── App.tsx
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── engines/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── types/
│   │   └── server.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   └── ...
│
├── database/
│   ├── ER-Diagram/
│   ├── SQL/
│   └── documentation/
│
├── data/
│   ├── users.csv
│   ├── income.csv
│   ├── expenses.csv
│   ├── budgets.csv
│   ├── obligations.csv
│   └── goals.csv
│
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── database.md
│   ├── api-documentation.md
│   ├── algorithms.md
│   ├── frontend.md
│   ├── testing.md
│   └── project-flow.md
│
└── README.md
```

---

# 🗄️ Database Design

The final database contains the following major tables:

```text
users
categories
income
expenses
budgets
category_budgets
obligations
debts
debt_payments
co_signers
credit_accounts
goals
predictions
risk_events
dependencies
simulations
notifications
```

## Main Relationships

```text
USERS
 │
 ├── INCOME
 ├── EXPENSES
 ├── BUDGETS
 ├── OBLIGATIONS
 ├── GOALS
 ├── DEBTS
 ├── CREDIT_ACCOUNTS
 ├── PREDICTIONS
 ├── RISK_EVENTS
 ├── DEPENDENCIES
 ├── SIMULATIONS
 └── NOTIFICATIONS

EXPENSES
    ↓
CATEGORIES

BUDGETS
    ↓
CATEGORY_BUDGETS

DEBTS
 ├── DEBT_PAYMENTS
 └── CO_SIGNERS
```

---

# 🧮 Financial Intelligence

WealthMap uses deterministic backend calculations to generate financial information.

The LLM is not responsible for calculating financial values.

---

# 💵 Budget Calculation

```text
Remaining Budget =
Budget − Actual Expense
```

Example:

```text
Budget = ₹25,000
Spent = ₹18,000

Remaining = ₹7,000
```

---

# 📊 Budget Usage

```text
Budget Used % =
(Actual Expense / Budget) × 100
```

Example:

```text
₹4,800 / ₹6,000 × 100
= 80%
```

---

# 🚨 Budget Alert System

WealthMap uses the following project-defined thresholds:

| Usage       | Status              |
| ----------- | ------------------- |
| < 80%       | 🟢 Normal           |
| 80% – <90%  | 🟡 Warning          |
| 90% – <100% | 🟠 Critical Warning |
| = 100%      | 🔴 Limit Reached    |
| >100%       | 🔴 Exceeded         |

Example:

```text
Food Budget = ₹6,000
Food Spending = ₹4,800

Usage = 80%

→ WARNING
```

---

# 📅 Daily Spending Limit

```text
Daily Spending Limit =
Remaining Budget / Remaining Days
```

Example:

```text
Remaining Budget = ₹12,000
Remaining Days = 15

Daily Limit =
₹12,000 / 15

= ₹800/day
```

The system can compare the user's actual daily spending against this value.

---

# 🔮 Pre-Computation

Pre-computation allows WealthMap to estimate future financial conditions before the month ends.

### Average Daily Spending

```text
Average Daily Spending =
Total Spent / Days Passed
```

### Projected Monthly Expense

```text
Projected Monthly Expense =
Average Daily Spending × Total Days in Month
```

Example:

```text
Monthly Budget = ₹25,000

Spent = ₹15,000
Days Passed = 15

Average Daily Spending =
₹15,000 / 15
= ₹1,000

Projected Expense =
₹1,000 × 30
= ₹30,000
```

The system can therefore flag:

```text
Projected Expense = ₹30,000
Budget = ₹25,000

Potential Overrun = ₹5,000
```

---

# 📈 Category-Wise Prediction

For each category:

```text
Projected Category Expense =
Category Spending / Days Elapsed × Days in Month
```

Example:

```text
Food Budget = ₹6,000

Food Spent = ₹4,500
Days Passed = 15

Projected Food Expense =
₹4,500 / 15 × 30

= ₹9,000
```

Potential overrun:

```text
₹9,000 − ₹6,000
= ₹3,000
```

---

# 🔁 Recurring Expenses and Obligations

WealthMap can track recurring financial commitments such as:

* Rent
* EMI
* Electricity
* Internet
* Mobile recharge
* Insurance
* Subscriptions
* College fees

Example:

```text
Monthly Budget = ₹25,000

Rent = ₹8,000
EMI = ₹5,000

Committed Amount = ₹13,000

Flexible Budget =
₹25,000 − ₹13,000
= ₹12,000
```

---

# 💰 Income vs Expense

```text
Remaining Income =
Income − Total Expenses
```

Example:

```text
Income = ₹40,000
Expenses = ₹28,000

Remaining = ₹12,000
```

---

# 💳 Debt Management

WealthMap can track:

* Principal amount
* Outstanding amount
* Interest rate
* EMI
* Due date
* Payment status
* Late fees
* Missed payments

Debt payment statuses:

```text
PENDING
PAID
LATE
MISSED
```

---

# 📉 Debt-to-Income Ratio

```text
DTI =
Monthly Debt Payments /
Monthly Income × 100
```

This is used as one input to the project-defined Readiness Score.

---

# 💳 Credit Utilization

```text
Credit Utilization =
Used Credit / Credit Limit × 100
```

Example:

```text
Used Credit = ₹15,000
Credit Limit = ₹50,000

Utilization = 30%
```

---

# 🛡️ Emergency Buffer

WealthMap can estimate emergency coverage in months:

```text
Emergency Buffer =
Available Savings /
Essential Monthly Expenses
```

Example:

```text
Savings = ₹30,000
Essential Expenses = ₹10,000/month

Emergency Buffer = 3 months
```

---

# 📊 Financial Readiness Score

WealthMap uses a **project-defined 100-point Readiness Score**.

Recommended weighting:

| Factor             |  Weight |
| ------------------ | ------: |
| Debt-to-Income     |      20 |
| On-Time Payments   |      20 |
| Credit Utilization |      15 |
| Emergency Buffer   |      20 |
| Budget Adherence   |      25 |
| **Total**          | **100** |

Example:

```text
Readiness Score = 78 / 100
```

> This is a WealthMap prototype indicator and is **not an official credit score or standardized financial rating**.

---

# ⚠️ Risk Engine

The Risk Engine evaluates multiple financial conditions:

```text
Budget Risk
Cash Flow Risk
Obligation Risk
Spending Risk
Debt Payment Risk
Goal Risk
```

The result contains:

```text
Risk Score
Risk Level
Risk Events
```

Example:

```text
Risk Score = 68
Risk Level = HIGH
```

Risk thresholds should be treated as **project-defined rules**, not universal financial standards.

---

# 🔗 Financial Dependency Graph

WealthMap represents relationships between financial entities.

Example:

```text
Expense
   ↓
Available Cash
   ↓
Debt Payment
   ↓
Payment Status
   ↓
Late Fee
   ↓
Co-signer Impact
   ↓
Readiness
```

Another example:

```text
Income
   ↓
Cash
   ├── Expenses
   ├── Goals
   └── Debt Payments
             ↓
            Risk
             ↓
         Readiness
```

The frontend visualizes these relationships using **React Flow**.

---

# 🌊 Cascading Financial Impact

A financial event may have multiple downstream effects.

Example:

```text
Unexpected ₹8,000 Expense
          ↓
Reduced Available Cash
          ↓
Insufficient EMI Funds
          ↓
Potential Missed Payment
          ↓
Late Fee Risk
          ↓
Co-signer-related Impact
          ↓
Readiness Score Impact
```

The Cascading Impact Engine returns:

```text
directImpact
indirectImpact
affectedEntities
riskChange
healthChange
```

This is one of the major differentiating features of WealthMap.

---

# 🔬 What-If Analysis

Users can simulate hypothetical financial decisions without modifying their real financial data.

Example:

> What if I spend ₹3,000 more?

The system calculates:

```text
Current State
      ↓
Hypothetical Expense
      ↓
Recalculate
      ↓
Compare
```

It can compare:

```text
Current Balance
Simulated Balance

Current Budget
Simulated Budget

Current Risk
Simulated Risk

Current Readiness
Simulated Readiness

Goal Impact
Obligation Impact
```

### Important Rule

**What-If simulations must never modify the user's actual financial state.**

---

# 🤖 AI Recommendation System

The LLM is used only after deterministic financial calculations are completed.

```text
User Data
   ↓
Backend Calculations
   ↓
Structured Financial State
   ↓
LLM API
   ↓
Explanation
   ↓
Recommendation
```

Example backend data:

```text
Budget = ₹25,000
Spent = ₹18,000
Projected = ₹28,500
Risk = 62
Upcoming EMI = ₹5,000
```

The LLM can then explain the situation in natural language.

### Important Principle

> **The backend calculates. The LLM explains.**

The LLM should not invent or independently calculate financial numbers.

---

# 🔌 API Overview

## Authentication

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

## Users

```text
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
```

## Income

```text
POST   /api/income
GET    /api/income
GET    /api/income/:id
PUT    /api/income/:id
DELETE /api/income/:id
```

## Expenses

```text
POST   /api/expenses
GET    /api/expenses
GET    /api/expenses/:id
PUT    /api/expenses/:id
DELETE /api/expenses/:id
```

## Categories

```text
GET    /api/categories
POST   /api/categories
```

## Budgets

```text
POST   /api/budgets
GET    /api/budgets
GET    /api/budgets/:id
PUT    /api/budgets/:id
DELETE /api/budgets/:id
```

## Obligations

```text
POST   /api/obligations
GET    /api/obligations
PUT    /api/obligations/:id
DELETE /api/obligations/:id
```

## Debts

```text
POST   /api/debts
GET    /api/debts
PUT    /api/debts/:id
DELETE /api/debts/:id
```

## Debt Payments

```text
POST   /api/debt-payments
GET    /api/debt-payments
PUT    /api/debt-payments/:id
```

## Credit Accounts

```text
POST   /api/credit-accounts
GET    /api/credit-accounts
PUT    /api/credit-accounts/:id
```

## Goals

```text
POST   /api/goals
GET    /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id
```

## Financial Intelligence

```text
GET /api/dashboard
GET /api/forecast
GET /api/cash-flow
GET /api/risk
GET /api/readiness-score
GET /api/safe-to-spend
GET /api/digital-twin
GET /api/dependency-graph
GET /api/cascading-impact
POST /api/simulation
GET /api/anomalies
GET /api/notifications
GET /api/recommendations
```

---

# 🖥️ Frontend Pages

The frontend should contain:

```text
/login
/register

/dashboard

/income
/expenses
/budgets
/obligations
/debts
/goals

/forecast
/risk
/readiness
/safe-to-spend

/digital-twin
/dependency-graph
/cascading-impact

/simulation

/notifications
/recommendations

/profile
/settings
```

---

# 📊 Dashboard

The dashboard should provide a single financial overview.

### Financial Overview

```text
Income: ₹40,000
Budget: ₹25,000
Spent: ₹18,000
Remaining: ₹7,000
Safe-to-Spend: ₹X
```

### Prediction

```text
Projected Expense: ₹28,500
Potential Overrun: ₹3,500
```

### Alerts

```text
🔴 Food budget likely to exceed
🟡 Monthly spending approaching limit
🟢 EMI amount available
```

### Financial Readiness

```text
Readiness Score: 78/100
```

---

# 🧪 Recommended Demo Scenario

Use a realistic test user.

```text
Income = ₹40,000
Monthly Budget = ₹25,000
```

Category budgets:

```text
Food = ₹6,000
Travel = ₹3,000
Shopping = ₹4,000
Bills = ₹5,000
Entertainment = ₹2,000
Other = ₹5,000
```

Expenses:

```text
Food = ₹4,800
Travel = ₹2,000
Shopping = ₹3,000
Bills = ₹3,500
Entertainment = ₹1,000
```

Total:

```text
₹14,300
```

Upcoming obligations:

```text
Rent = ₹8,000
EMI = ₹5,000
```

Then test:

1. Budget percentage
2. Daily spending limit
3. Projected monthly spending
4. Food prediction
5. Upcoming EMI
6. Risk score
7. Readiness Score
8. Unexpected ₹8,000 expense
9. Cascading impact
10. What-If ₹3,000 additional expense

---

# 🧪 Testing Scenarios

The project should test at least these user types:

### Stable User

```text
Stable income
Stable expenses
Spending within budget
```

### Overspending User

```text
High discretionary spending
Budget approaching/exceeding limit
```

### High-Obligation User

```text
High EMI
High rent
Low flexible budget
```

### Increasing-Spending User

```text
Month 1 → ₹10,000
Month 2 → ₹12,000
Month 3 → ₹15,000
Month 4 → ₹18,000
```

### Unexpected-Expense User

```text
Normal spending
       ↓
Unexpected ₹10,000 expense
       ↓
Cash reduction
       ↓
Goal impact
       ↓
Risk increase
```

---

# 🗃️ Dataset

WealthMap does not require a traditional machine-learning dataset to operate.

The primary data comes from user-entered financial information:

```text
Income
Expenses
Budgets
Obligations
Debts
Goals
Credit Accounts
```

For development and testing, synthetic data can be generated.

Recommended synthetic scenarios include:

```text
Stable users
Overspending users
High-obligation users
Increasing-spending users
Unexpected-expense scenarios
```

The dataset should match the actual WealthMap database schema.

---

# 👥 Team Responsibilities

## Member 1 — Database —

Responsible for:

* MySQL
* SQL
* ER diagram
* Database schema
* Relationships
* Primary keys
* Foreign keys
* Constraints
* Indexes
* Prisma schema
* Migrations
* Seed data
* Database documentation

---

## Member 2 — Backend + Intelligence 

Responsible for:

* Node.js
* Express.js
* TypeScript
* Authentication
* REST APIs
* Business logic
* Budget Engine
* Alert Engine
* Daily Limit Engine
* Pre-Computation Engine
* Prediction Engine
* Obligation Engine
* Cash Flow Engine
* Debt Engine
* Risk Engine
* Readiness Score
* Dependency Engine
* Cascading Impact Engine
* What-If Engine
* Anomaly Detection
* Notification Engine
* LLM integration
* API testing

---

## Member 3 — Frontend —

Responsible for:

* React
* TypeScript
* Tailwind CSS
* Axios
* Recharts
* React Flow
* Authentication UI
* Dashboard
* Income page
* Expense page
* Budget page
* Obligation page
* Debt page
* Goals page
* Forecast page
* Risk page
* Readiness page
* Safe-to-Spend
* Digital Twin
* Dependency Graph
* Cascading Impact UI
* What-If Simulator
* Notifications
* AI Recommendations
* Responsive design

---

# 🚦 Development Roadmap

The project should be implemented in the following order.

```text
REQUIREMENTS FREEZE
        ↓
ER DIAGRAM
        ↓
MYSQL DATABASE
        ↓
PRISMA SCHEMA
        ↓
SEED DATA
        ↓
DATABASE TESTING
        ↓
NODE + EXPRESS
        ↓
AUTH API
        ↓
CRUD APIs
        ↓
BUDGET ENGINE
        ↓
ALERT ENGINE
        ↓
DAILY LIMIT ENGINE
        ↓
PRE-COMPUTATION ENGINE
        ↓
PREDICTION ENGINE
        ↓
OBLIGATION ENGINE
        ↓
CASH-FLOW ENGINE
        ↓
DEBT ENGINE
        ↓
RISK ENGINE
        ↓
READINESS SCORE
        ↓
DEPENDENCY ENGINE
        ↓
CASCADING IMPACT ENGINE
        ↓
WHAT-IF ENGINE
        ↓
ANOMALY DETECTION
        ↓
NOTIFICATION ENGINE
        ↓
LLM ENGINE
        ↓
API TESTING
        ↓
REACT SETUP
        ↓
AUTH UI
        ↓
CRUD PAGES
        ↓
DASHBOARD
        ↓
CHARTS
        ↓
FORECAST / RISK
        ↓
SAFE-TO-SPEND
        ↓
READINESS / HEALTH
        ↓
DIGITAL TWIN
        ↓
DEPENDENCY GRAPH
        ↓
WHAT-IF SIMULATOR
        ↓
AI RECOMMENDATIONS
        ↓
INTEGRATION
        ↓
TESTING
        ↓
DEPLOYMENT
        ↓
DOCUMENTATION
        ↓
FINAL DEMO
```

---

# 🔒 Development Dependency Rule

The implementation dependency is:

```text
DATABASE
    ↓
BACKEND
    ↓
FRONTEND
    ↓
INTEGRATION
    ↓
TESTING
```

Members can prepare documentation and UI designs in parallel, but the core coding dependencies should follow this order.

---

# 🔀 Git Workflow

Repository:

```text
WealthMap/
```

Branches:

```text
main
develop
database
backend
frontend
```

Recommended workflow:

```text
Member 1 → database
Member 2 → backend
Member 3 → frontend

        ↓

Pull Request

        ↓

develop

        ↓

Testing

        ↓

main
```

Do not push unfinished experimental code directly to `main`.

---

# 📚 Documentation

The repository should contain:

```text
docs/
├── requirements.md
├── architecture.md
├── database.md
├── api-documentation.md
├── algorithms.md
├── frontend.md
├── testing.md
└── project-flow.md
```

The API documentation is particularly important because the frontend depends on the backend API contract.

---

# ⚙️ Installation

## Prerequisites

Install:

```text
Node.js
npm
MySQL 8.x
Git
VS Code
```

Verify:

```bash
node --version
npm --version
mysql --version
git --version
```

---

# 📦 Backend Setup

```bash
cd backend
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Run database migration:

```bash
npx prisma migrate dev
```

Seed database:

```bash
npx prisma db seed
```

Start development server:

```bash
npm run dev
```

---

# 🎨 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend communicates with the backend through REST APIs.

---

# 🔐 Environment Variables

Create a `.env` file inside the backend.

Example:

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/wealthmap"

JWT_SECRET="your_secure_jwt_secret"

LLM_API_KEY="your_llm_api_key"

PORT=5000
```

Never commit real secrets to GitHub.

Add:

```text
.env
```

to `.gitignore`.

---

# 🔗 Application Flow

```text
React Frontend
      ↓
Axios
      ↓
Express REST API
      ↓
Controllers
      ↓
Services
      ↓
Financial Engines
      ↓
Prisma
      ↓
MySQL
```

For AI:

```text
Financial State
      ↓
Backend Calculation
      ↓
Structured Context
      ↓
LLM API
      ↓
Explanation / Recommendation
```

---

# 🏆 What Makes WealthMap Different?

A conventional expense tracker mainly answers:

> **Where did my money go?**

WealthMap aims to answer:

> **Where is my money going, am I going to exceed my budget, what happens if I continue spending this way, and can my spending affect my upcoming obligations?**

The project combines:

```text
Expense Tracking
        +
Budget Management
        +
Pre-Computation
        +
Prediction
        +
Alerts
        +
Obligation Analysis
        +
Risk Analysis
        +
Financial Dependencies
        +
Cascading Impact
        +
What-If Simulation
        +
AI Explanation
```

This transforms WealthMap from a basic CRUD expense tracker into a **proactive financial decision-support system**.

---

# 🚀 Future Scope

Potential future improvements include:

* Bank account integration
* Automated transaction import
* Mobile application
* Advanced machine-learning forecasting
* Personalized budget adaptation
* More sophisticated anomaly detection
* Financial goal optimization
* Automated recurring-payment detection
* Advanced financial scenario planning
* Multi-currency support
* Exportable financial reports
* Voice-based financial queries
* More advanced AI explanations

These are future possibilities and are not required for the core project.

---

# ⚠️ Financial Disclaimer

WealthMap is an academic/software prototype designed for personal financial tracking, analysis, prediction, and decision-support experimentation.

The project's:

* Readiness Score
* Risk Score
* Predictions
* Alerts
* Recommendations
* Simulations

are based on project-defined calculations and assumptions.

They should **not** be treated as official credit scores, guaranteed financial predictions, professional financial advice, or recommendations to make a specific financial decision.

---

# 👨‍💻 Contributors

### WealthMap Development Team

| Member   | Role                            | Workload |
| -------- | ------------------------------- | -------: |
| Member 1 | Database Engineer               |      25% |
| Member 2 | Backend + Intelligence Engineer |      45% |
| Member 3 | Frontend Engineer               |      30% |

---

# 📌 Project Status

```text
🚧 Under Development
```

Development follows:

```text
Database
   ↓
Backend
   ↓
Frontend
   ↓
Integration
   ↓
Testing
   ↓
Deployment
```

---

# 💰 WealthMap

### Predict. Simulate. Prevent.

> **A proactive financial system that helps users understand not only where their money is going, but where their current financial behavior may lead.**


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


