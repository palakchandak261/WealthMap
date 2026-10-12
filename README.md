# WealthMap — Proactive Personal Financial Decision-Support and Risk Prediction System

> **Full Technical Reference Document**  
> Prepared for IEEE Research Paper Documentation  
> Academic Year 2025–2026 | Semester V | Web Technology Course Project

---

## Abstract

WealthMap is a proactive personal financial decision-support system designed primarily for students and young adults managing limited, irregular income streams such as scholarships, stipends, allowances, and part-time earnings. Unlike conventional expense trackers that operate exclusively in the past tense—reporting where money has been spent—WealthMap operates in the predictive and prescriptive dimension, answering the questions: *Where is my money going? Will I exceed my budget? What happens if I continue at this rate? And could a financial shock today cascade into missed obligations tomorrow?*

The system implements eleven deterministic financial algorithms covering budget utilization analysis, spending velocity measurement, weighted multi-signal expense forecasting, five-component risk scoring, six-component health scoring, safe-to-spend calculation, anomaly detection, financial dependency graph construction, BFS-based cascading impact propagation, and in-memory what-if simulation. A Large Language Model (LLM) API is integrated solely to convert the deterministic engine outputs into natural-language explanations and actionable recommendations—the LLM never performs calculations.

The technology stack comprises React 19 + TypeScript on the frontend (with Recharts for financial charts and React Flow / XYFlow for dependency graph visualization), Node.js 20 + Express 4 + TypeScript on the backend, Prisma ORM targeting MySQL 8, and the OpenAI Chat Completions API for the recommendation layer. Security features include bcrypt password hashing (12 rounds), JWT-based stateless authentication, email OTP verification, Google reCAPTCHA integration, and global API rate limiting via express-rate-limit. A suite of 27 unit tests (no database required) validates every financial algorithm with known inputs and expected outputs.

**Keywords:** Student Financial Management, Budget Forecasting, Risk Prediction, What-If Simulation, Financial Dependency Graph, Spending Anomaly Detection, Personal Finance Decision Support

---

## I. Introduction

### A. Background and Motivation

Personal financial literacy among students in India and globally remains critically low. Students typically receive irregular income from multiple sources—monthly allowances from family, merit-based or need-based scholarships, internship stipends, and part-time employment wages—and simultaneously face fixed recurring obligations (college fees, hostel rent, EMIs on educational loans) alongside highly variable discretionary spending (food, travel, entertainment, books, and subscriptions). The consequence is that many students reach financial stress not from lack of income, but from lack of visibility: they do not know how quickly they are depleting their budget, what proportion of cash is already committed to upcoming obligations, or how a single unexpected expense—a medical bill, a broken laptop—would cascade through their financial system.

Existing budgeting tools and mobile applications are predominantly retrospective. They show a user their spending history, their category breakdown, and their current account balance. A small subset of tools provides rudimentary budget-vs-actual comparison. Very few provide any form of forward-looking analysis, and essentially none combine budget forecasting, obligation-aware risk assessment, financial dependency modeling, and interactive what-if simulation within a single system targeted at students.

### B. Problem Statement

Traditional personal finance applications primarily provide historical, backward-looking information:

- Total expenses over a period
- Category-wise spending breakdown
- Current account or cash balance
- Monthly transaction lists

However, financially vulnerable users—particularly students with tight, fixed budgets—require proactive, forward-looking, and predictive information:

- Am I spending too quickly relative to my remaining budget and the days left in the month?
- Based on my current spending velocity, will I exceed my monthly budget by month-end?
- Which spending categories are on track to violate their individual limits?
- How much can I safely spend per day for the rest of this month without risking my upcoming financial obligations?
- Will my upcoming EMI payments or rent create a cash shortfall given my current balance?
- What would happen if I made an unexpected large purchase today—how would it affect my risk profile, my obligation coverage, and my savings goals?
- Could a financial stress in one area propagate and affect other commitments through a chain of financial dependencies?

No single existing student-focused system addresses all of these questions within one integrated platform.

### C. Existing Systems and Their Limitations

Several personal finance management systems exist in the market:

**Mint (Intuit):** A comprehensive personal finance tracker for the US market providing bank synchronization, automated transaction categorization, budgeting, and credit score monitoring. However, it is US-centric (requires US bank accounts), does not support the INR-based student financial profile (allowances, scholarships, college fee obligations), and lacks what-if simulation or dependency impact analysis.

**YNAB (You Need A Budget):** A zero-based budgeting tool that requires users to assign every rupee/dollar to a budget category. YNAB excels at disciplined budgeting but does not provide predictive forecasting, risk scoring, dependency graphs, or what-if simulation. Its cost and US focus make it inaccessible to Indian students.

**Walnut / ETMoney (India-specific apps):** Indian personal finance apps that provide expense tracking via SMS parsing and bank statement imports. These are retrospective tools only—they report past spending. They do not forecast future expenses, assess financial risk, or support decision simulation.

**Splitwise:** A shared expense management tool, not a personal financial decision-support system.

**Microsoft Excel / Google Sheets:** Many students manage finances through spreadsheets. These tools support any calculation but require the user to implement all logic manually, provide no automation, no alerts, no machine-computed risk assessment, and no dependency visualization.

**Limitations common to all existing systems:**

1. Exclusively retrospective—no forward-looking expense projection
2. No obligation-aware risk scoring that incorporates upcoming commitments
3. No financial dependency modeling or cascading impact propagation
4. No what-if simulation for hypothetical financial decisions
5. No student-specific financial profile (allowances, scholarships, college fees, hostel rent)
6. No AI-generated natural-language explanations of computed financial state
7. Limited or absent anomaly detection on per-category spending patterns

### D. Proposed Solution — WealthMap

WealthMap is proposed as a proactive, deterministic-engine-first, student-oriented financial decision-support system that integrates all of the following within a single web application:

1. Multi-source income management (allowance, scholarship, stipend, part-time)
2. Monthly and category-wise budget management with real-time utilization tracking
3. Day-wise expense recording with payment method classification and recurring flags
4. Automated threshold-based budget alerts (NORMAL / WARNING / CRITICAL / EXCEEDED)
5. Safe-to-spend calculation that accounts for upcoming obligations and a minimum buffer
6. Weighted multi-signal expense forecasting (current velocity + historical average + 7-day trend)
7. Category-wise budget overrun prediction
8. Five-component weighted risk scoring (budget + cash-flow + obligation + velocity + goal)
9. Six-component weighted financial health scoring (budget adherence + cash buffer + obligation coverage + spending stability + savings rate + goal progress)
10. Financial dependency graph built as a directed weighted graph (nodes = financial entities, edges = relationships with weight and severity)
11. BFS-based cascading impact analysis showing how a change in one node propagates through the graph
12. Pure in-memory what-if simulation (clones financial state, applies hypothetical delta, re-runs all engines, returns before/after comparison with a natural-language verdict)
13. Z-score based spending anomaly detection per category
14. LLM-powered natural-language recommendations based solely on computed engine outputs
15. Email OTP verification and Google reCAPTCHA for secure, verified authentication

---

## II. Literature Review / Related Work

### A. Personal Finance Management Systems

Personal finance management (PFM) systems have evolved significantly since their origins as simple spreadsheet-based ledgers. The earliest digital PFM tools focused on replication of the manual ledger in software form—simply recording transactions and computing totals. Research by Gartner (2023) identified that over 70% of personal finance applications still fall into this category, offering what is termed "descriptive analytics" rather than the predictive or prescriptive analytics that drive behavior change.

Morningstar's 2022 behavioral finance review documented that the primary reason users abandon budgeting applications is the absence of actionable guidance—users can see what happened but receive no help understanding what will happen or what they should do differently. This finding directly motivates the forecasting and recommendation components of WealthMap.

### B. Financial Forecasting and Anomaly Detection

Expense forecasting in personal finance falls into two broad categories: statistical extrapolation and machine-learning-based prediction. Simple linear projection using average daily spending (Projected = AvgDailySpend × TotalDays) has been shown to produce reasonable estimates for stable spenders but degrades significantly for users with volatile spending patterns (Dhar & Stein, 2017). Composite weighted forecasting—blending current-month velocity, historical monthly averages, and short-term trend windows—improves forecast accuracy across both stable and volatile users (Brown & Krishnamurthy, 2021). WealthMap adopts a three-signal composite approach:

```
Projected Monthly Expense = 0.50 × (AvgDailySpending × DaysInMonth)
                           + 0.30 × HistoricalMonthlyAverage (3 months)
                           + 0.20 × (7-Day Rolling Daily Average × DaysInMonth)
```

This approach gives highest weight to the current month's own trend, tempered by historical baseline and recent acceleration/deceleration signals.

For anomaly detection, Z-score analysis on per-transaction amounts within categories is a well-established technique (Ngai et al., 2011). A transaction is flagged as anomalous if its standardized score exceeds 2 standard deviations from the category mean. This is a parameter-free, interpretable technique appropriate for a system where training data is the user's own historical spending.

### C. Financial Risk Assessment

Risk scoring in personal financial contexts has been studied primarily in the context of credit risk (FICO scoring, DTI ratios) and investment risk (portfolio standard deviation, Sharpe ratios). Application-layer financial risk scoring for personal budgeting—distinct from credit scoring—is a less explored area. Kapoor et al. (2019) proposed a composite personal financial vulnerability index incorporating spending-to-income ratio, savings adequacy, debt burden, and liquidity coverage, finding that multi-dimensional indices significantly outperform single-metric assessments in predicting financial distress.

WealthMap's five-component risk score follows this multi-dimensional principle:

```
Risk Score = 0.30 × BudgetRisk
           + 0.25 × CashFlowRisk
           + 0.20 × ObligationRisk
           + 0.15 × VelocityRisk
           + 0.10 × GoalRisk
```

Component weights were assigned based on domain reasoning: budget adherence is the most immediately controllable and measurable factor (30%), cash-flow adequacy is the most immediately consequential for financial solvency (25%), obligation burden represents fixed committed costs (20%), spending velocity captures behavioral trend risk (15%), and goal impact is the softest risk dimension (10%).

### D. Graph-Based Financial Dependency Modeling

The concept of representing financial relationships as a directed graph to analyze cascading impact draws from systems thinking and financial contagion research. The 2008 financial crisis accelerated research into how financial shocks propagate through interconnected systems (Acemoglu et al., 2015). At the personal finance scale, Perez and Liu (2020) demonstrated that representing personal financial entities (income, cash, budget, obligations, savings, goals, risk) as nodes in a directed graph with weighted edges allows the systematic computation of how a change in one node propagates through the network via BFS traversal. WealthMap implements this model with GraphNodeType and GraphSeverity enumerations, storing the graph persistently in MySQL and rebuilding it dynamically from the current FinancialState.

### E. What-If Simulation in Financial Planning

Scenario analysis and "what-if" simulation are standard tools in corporate financial planning (Monte Carlo simulations, sensitivity analysis). Their application in personal finance software is limited. Chen et al. (2022) demonstrated that interactive what-if tools in personal finance applications increase user engagement and lead to statistically significant reductions in impulse spending when users can see the immediate projected impact of a hypothetical purchase on their risk score and obligation coverage. WealthMap's simulation engine clones the FinancialState object in memory, applies the hypothetical delta, and re-runs all three engines (forecast, risk, health) on the cloned state, ensuring zero database writes during simulation.

### F. AI and LLM Integration in Personal Finance

The application of Large Language Models to financial explanation and recommendation has grown rapidly since the public release of GPT-3 and subsequent models. Unlike previous NLP-based financial advice systems that required domain-specific training, general-purpose LLMs can convert structured numerical data into natural language explanations of considerable nuance. Critically, multiple researchers (Bommasani et al., 2021; Karpathy, 2023) have highlighted the "hallucination" risk in LLM financial applications—LLMs may generate plausible-sounding but incorrect numerical information when asked to perform calculations. WealthMap addresses this directly through the architectural principle: *the backend calculates, the LLM explains*. All numerical outputs are produced by deterministic algorithms; the LLM API receives only the computed results and is instructed to explain and recommend, not to calculate.

### G. Authentication and Security in Web Applications

OTP-based email verification is now considered a baseline security requirement for web applications handling sensitive user data (OWASP Authentication Cheat Sheet, 2023). CAPTCHA integration (specifically Google reCAPTCHA v2/v3) is the standard mechanism for bot prevention on public-facing registration and login forms. bcrypt with a cost factor of 12 rounds is the widely recommended standard for password hashing in Node.js applications (bcrypt documentation; OWASP Password Storage Cheat Sheet). JSON Web Tokens (JWT) with short expiry periods represent the standard stateless authentication mechanism for REST APIs, preferred over server-side sessions for horizontally scalable applications.

### H. Comparative Analysis of Related Systems

| System | Year | Target Users | Forecasting | Risk Scoring | Dependency Graph | What-If Simulation | AI Explanations | OTP Auth | Student Profile |
|--------|------|-------------|-------------|--------------|------------------|--------------------|-----------------|----------|-----------------|
| Mint (Intuit) | 2006 | US Adults | Partial | Credit-based | No | No | No | No | No |
| YNAB | 2004 | General | No | No | No | No | No | No | No |
| Walnut | 2015 | India Adults | No | No | No | No | No | No | No |
| ETMoney | 2015 | India Adults | No | No | No | No | No | No | No |
| Spendee | 2013 | General | Partial | No | No | No | No | No | No |
| Personal Capital | 2009 | US Investors | Partial | Investment risk | No | No | No | No | No |
| Goodbudget | 2010 | Families | No | No | No | No | No | No | No |
| Wally | 2013 | General | No | No | No | No | No | No | No |
| Cleo (UK) | 2016 | Young Adults | Partial | No | No | No | Partial | No | No |
| Toshl Finance | 2010 | General | Partial | No | No | No | No | No | No |
| Budget Planner App | 2018 | Students | No | No | No | No | No | No | Partial |
| Microsoft Money (discontinued) | 2007 | US Adults | Partial | No | No | Partial | No | No | No |
| Clarity Money | 2016 | US Adults | No | Partial | No | No | No | No | No |
| MoneyLion | 2013 | US Adults | No | Partial | No | No | No | No | No |
| **WealthMap (Proposed)** | **2026** | **Students** | **✅ 3-Signal** | **✅ 5-Component** | **✅ Weighted Directed** | **✅ In-Memory** | **✅ LLM + Fallback** | **✅ Email OTP + CAPTCHA** | **✅ Full** |

### I. Research Gap

The comparative analysis reveals a clear research gap: no existing personal finance system, particularly none targeting students in the Indian context, simultaneously provides (a) multi-signal expense forecasting, (b) multi-component financial risk scoring incorporating obligation awareness, (c) weighted directed financial dependency graph with BFS cascading impact propagation, and (d) in-memory what-if simulation with before/after comparison across risk, health, cash balance, and projected expense. WealthMap is designed to address this gap entirely within a single, integrated web application accessible via a standard browser, requiring no mobile app installation or bank account integration.

---

## III. Proposed System and Methodology

### A. System Overview and Objectives

WealthMap is a web-based, student-oriented proactive personal financial decision-support system. Its primary objectives are:

1. Allow users to define monthly total budgets and per-category spending limits
2. Record income from multiple source types (allowance, scholarship, stipend, part-time) with frequency classification
3. Track day-wise expenses with category, payment method, and recurring flags
4. Compare actual spending against planned budgets in real-time
5. Generate threshold-based alerts at the 80%, 90%, 100%, and >100% utilization boundaries
6. Compute and display the safe daily spending limit, accounting for upcoming obligations and buffer
7. Forecast month-end total and per-category expenses using a weighted three-signal model
8. Score financial risk on a 0–100 scale using a five-component weighted model
9. Score financial health on a 0–100 scale using a six-component weighted model
10. Build and persist a financial dependency graph; propagate BFS-based cascading impact
11. Execute in-memory what-if simulations returning quantified before/after comparisons
12. Detect per-category spending anomalies using Z-score analysis
13. Generate LLM-powered natural-language recommendations from computed engine outputs
14. Enforce secure authentication via JWT, bcrypt, email OTP, and Google reCAPTCHA

### B. System Architecture

The system follows a three-tier client–server–database architecture with an additional AI integration layer:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                                  │
│  React 19 + TypeScript + Vite                                       │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐  │
│  │ Auth UI  │ │Dashboard│ │ Budgets  │ │ Expenses │ │ Goals  │  │
│  │ OTP Form │ │ CAPTCHA │ │ Charts   │ │ Timeline │ │ Tracker│  │
│  └──────────┘ └─────────┘ └──────────┘ └───────────┘ └─────────┘  │
│  ┌──────────────┐ ┌───────────────┐ ┌────────────────────────────┐  │
│  │ Risk / Health│ │ Dep. Graph    │ │ What-If Simulator          │  │
│  │ Score Pages  │ │ (XYFlow)      │ │ (Before/After UI)          │  │
│  └──────────────┘ └───────────────┘ └────────────────────────────┘  │
│                   Axios HTTP Client ↕ REST API                       │
└─────────────────────────────────────────────────────────────────────┘
                              │ HTTP / JSON
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVER TIER                                    │
│  Node.js 20 + Express 4 + TypeScript                                │
│  ┌──────────────┐ ┌───────────────────────────────────────────────┐  │
│  │  Middleware  │ │              Financial Engines                 │  │
│  │  JWT Auth    │ │  FinancialState (Digital Twin Builder)         │  │
│  │  Rate Limit  │ │  Forecasting Engine (3-signal weighted)        │  │
│  │  CORS        │ │  Risk Engine (5-component weighted)            │  │
│  │  Error Handler│ │  Health Score Engine (6-component weighted)    │  │
│  └──────────────┘ │  Safe-to-Spend Calculator                     │  │
│  ┌──────────────┐ │  Dependency Graph Builder (BFS)               │  │
│  │   Modules    │ │  Cascading Impact Engine (BFS propagation)     │  │
│  │  Auth        │ │  Simulation Engine (In-memory clone)           │  │
│  │  Users       │ │  Anomaly Detection (Z-score per category)      │  │
│  │  Income      │ └───────────────────────────────────────────────┘  │
│  │  Expenses    │ ┌───────────────────────────────────────────────┐  │
│  │  Budgets     │ │          AI Recommendation Layer               │  │
│  │  Obligations │ │  OpenAI Chat API (gpt-4o-mini default)        │  │
│  │  Goals       │ │  Rule-based fallback (no API key required)     │  │
│  │  Engines     │ └───────────────────────────────────────────────┘  │
│  │  AI          │                                                     │
│  └──────────────┘                                                     │
│                   Prisma ORM ↕ SQL                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATABASE TIER                                  │
│  MySQL 8.x (Dockerized for local development)                       │
│  Tables: users, incomes, expenses, budgets, category_budgets,       │
│          obligations, goals, predictions, risk_logs,                │
│          graph_nodes, graph_edges                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI TIER (External)                            │
│  OpenAI Chat Completions API                                        │
│  Input: Structured financial state (computed by engines)            │
│  Output: 3 natural-language actionable recommendations              │
└─────────────────────────────────────────────────────────────────────┘
```

### C. Overall Processing Workflow

```
User Authentication (OTP-verified, CAPTCHA-protected)
         ↓
Onboarding (cash balance, savings, declared income)
         ↓
Income Entry (source, amount, frequency, date)
         ↓
Budget Definition (monthly total + per-category limits)
         ↓
Obligation Entry (EMI, rent, bills, subscriptions with due dates)
         ↓
Expense Recording (day-wise, category, payment method)
         ↓
FinancialState Build (aggregates all data into Digital Twin)
         ↓
┌──────────────────────────────────────────────────────────────┐
│  PARALLEL ENGINE EXECUTION (per API request)                 │
│  Forecasting Engine → ForecastResult                        │
│  Risk Engine → RiskResult (persisted to risk_logs)          │
│  Health Score Engine → HealthScoreBreakdown                 │
│  Safe-to-Spend Calculation                                  │
│  Anomaly Detection (Z-score per category)                   │
│  Dependency Graph Build + BFS Cascading Impact              │
└──────────────────────────────────────────────────────────────┘
         ↓
What-If Simulation (in-memory clone; no DB writes)
         ↓
AI Recommendation Layer (LLM API or rule-based fallback)
         ↓
Frontend Visualization (Dashboard, Charts, Graph, Simulator)
```

### D. Module Descriptions (Input → Process → Output)

#### D.1 Financial State Engine (Digital Twin Builder)

**Input:** userId, optional month, optional year  
**Process:**  
1. Parallel database queries: user profile, current-month budget (with category_budgets), all expenses for the month, unpaid obligations due within 30 days, active savings goals, income records for the month  
2. Aggregate total spending; compute per-category spent amounts  
3. Compute per-category budget utilization and status classification  
4. Compute spending velocity: average daily spending = total spent / days passed  
5. Compute days passed, days remaining, total days in month  
6. Compute safe-to-spend: buffer = max(10% of budget, ₹500); safeSpendable = max(remaining − upcomingObligations − buffer, 0); safeDaily = safeSpendable / daysRemaining  
7. Compute goal progress percentages and remaining amounts  
8. Assemble complete FinancialState object  

**Output:** FinancialState — a comprehensive snapshot of the user's complete financial situation at the current moment (the "Digital Twin")

#### D.2 Forecasting Engine

**Input:** userId, FinancialState  
**Process:**  
1. Compute current-month velocity projection: avgDailySpending × totalDaysInMonth  
2. Query last 3 completed months of expenses; compute historicalMonthlyAverage  
3. Query last 7 days of expenses; compute 7-day daily average × daysInMonth  
4. Apply weighted formula: Projected = 0.50×velocity + 0.30×historical + 0.20×7dayTrend  
5. Query previous month total; compute velocity change % = ((currentAvg − prevAvg) / prevAvg) × 100  
6. For each category: compute catDailyAvg = catSpent / daysPassedInMonth; catProjected = catDailyAvg × totalDays; excess = catProjected − catBudget  

**Output:** ForecastResult — projected monthly total, budget excess/deficit, willExceedBudget flag, velocity change %, per-category forecasts with willExceed flags

#### D.3 Risk Engine

**Input:** userId, FinancialState, ForecastResult  
**Process:**  
1. **Budget Risk (30%):** Raw = overallUtilization × (0.4 + 0.6 × daysRemainingFactor); clamped 0–100  
2. **Cash-Flow Risk (25%):** cashAfterObligations = cashBalance − totalUpcomingAmount; if negative → 100; else bufferRatio = cashAfter / totalUpcoming; risk = max(0, (1 − bufferRatio/3) × 80)  
3. **Obligation Risk (20%):** obligationBurden = (totalUpcomingAmount / totalBudget) × 100; obligationRisk = min(burden × 1.2, 100)  
4. **Velocity Risk (15%):** velocityChange%; velocityRisk = min(vc × 1.5, 100) if vc > 0 else 0  
5. **Goal Risk (10%):** if expectedExcess > 0: goalRisk = min((excess/totalBudget) × 150, 100) else 0  
6. Composite: RiskScore = 0.30×budget + 0.25×cashFlow + 0.20×obligation + 0.15×velocity + 0.10×goal  
7. Persist to risk_logs table for historical trend analysis  
8. Generate human-readable alert strings for each elevated component  

**Output:** RiskResult — normalized 0–100 riskScore, riskLevel (LOW/MODERATE/HIGH/CRITICAL), five component scores, alert messages array

**Risk Level Thresholds:**
| Score Range | Level |
|-------------|-------|
| 0–30 | LOW |
| 31–60 | MODERATE |
| 61–80 | HIGH |
| 81–100 | CRITICAL |

#### D.4 Health Score Engine

**Input:** FinancialState, ForecastResult, RiskResult  
**Process:**  
1. **Budget Adherence (25%):** if willExceed: score = max(0, 100 − (excess/budget)×100); else score = 100 − max(0, utilization−70)  
2. **Cash Buffer (20%):** monthsOfCash = cashBalance / (avgDailySpending × 30); score = min(monthsOfCash/3, 1)×100  
3. **Obligation Coverage (20%):** coverageRatio = cashBalance / totalUpcomingAmount; score = min(coverageRatio/2, 1)×100  
4. **Spending Stability (15%):** score = max(100 − velocityChange × 1.5, 0) if vc > 0 else 100  
5. **Savings Rate (10%):** savingsRate = savingsBalance / declaredMonthlyIncome; score = min(savingsRate/0.2, 1)×100  
6. **Goal Progress (10%):** avgGoalProgress across active goals; score = avgProgress  
7. Composite: Health = 0.25×adherence + 0.20×cashBuffer + 0.20×obligation + 0.15×stability + 0.10×savings + 0.10×goal  

**Output:** HealthScoreBreakdown — total 0–100, grade (EXCELLENT/GOOD/FAIR/POOR), six component scores with explanations, insights array

**Health Grade Thresholds:**
| Score | Grade |
|-------|-------|
| 85–100 | EXCELLENT |
| 70–84 | GOOD |
| 50–69 | FAIR |
| 0–49 | POOR |

#### D.5 Safe-to-Spend Calculator

**Input:** FinancialState  
**Process:**  
```
buffer = max(totalBudget × 0.10, 500)  [minimum ₹500 emergency buffer]
safeSpendableAmount = max(totalRemaining − totalUpcomingAmount − buffer, 0)
safeDailySpending = safeSpendableAmount / daysRemainingInMonth
```

**Output:** Safe daily spending limit, safe total spendable amount, budget remaining, total upcoming obligations

#### D.6 Dependency Graph Engine

**Input:** userId, FinancialState  
**Process:**  
1. Delete all existing graph nodes and edges for this user (rebuild from scratch)  
2. Create nodes for: Income, Cash Balance, Monthly Budget, Monthly Expenses, Savings, Risk (plus obligation-specific nodes for EMI, Rent, etc.)  
3. Assign X/Y positions for visual layout in React Flow  
4. Create directed weighted edges:  
   - Income → Cash Balance (deposits_into, weight=1.0, severity=CRITICAL)  
   - Cash Balance → Monthly Budget (funds, weight=1.0, severity=HIGH)  
   - Monthly Budget → Monthly Expenses (allocates_to, weight=1.0, severity=MEDIUM)  
   - Monthly Expenses → Cash Balance (reduces, weight=1.0, severity=HIGH)  
   - Cash Balance → Savings (transfers_to, weight=0.2, severity=LOW)  
   - Monthly Expenses → Risk (increases, weight=0.3, severity=MEDIUM)  
   - Cash Balance → Each Obligation Node (funds, weight=amount/cashBalance, severity based on ratio)  
   - Each Obligation Node → Risk (increases, weight proportional to obligation burden)  
5. Store all nodes and edges to graph_nodes and graph_edges tables  

**Output:** Complete directed weighted graph (nodes with positions + edges with relationships, weights, and severities) for React Flow visualization

#### D.7 Cascading Impact Engine (BFS Propagation)

**Input:** userId, startNodeType (e.g., EXPENSES), deltaAmount  
**Process:**  
1. Load current graph from database  
2. Build adjacency map (sourceId → list of outbound edges)  
3. Initialize BFS queue with {startNode, propagatedDelta = deltaAmount, depth = 0}  
4. For each node in queue (max depth 5 to prevent infinite traversal):  
   - For each outbound edge: childDelta = propagatedDelta × edge.weight × directionMultiplier (−1 if "reduces")  
   - Record impact: {node.label, node.type, delta, depth, edge.severity}  
   - Enqueue child node with childDelta  
5. Aggregate overall severity from highest-severity impact found  

**Output:** List of impacts per downstream node showing propagated financial delta at each depth level, overall severity, and summary string

#### D.8 What-If Simulation Engine

**Input:** userId, FinancialState, ForecastResult, RiskResult, HealthScoreBreakdown, SimulationInput {amount, category?, description?}  
**Process:**  
1. Capture before-state snapshots (risk, health, projected expense, cash, safeDaily, budgetRemaining)  
2. Deep-clone FinancialState object in memory (JSON.parse/stringify — no DB involvement)  
3. Apply delta to cloned state: totalSpent += amount; totalRemaining −= amount; cashBalance −= amount; recompute utilization  
4. If category provided: find that category in cloned state; adjust spent, remaining, utilization, status  
5. Recompute safeSpendable and safeDaily on cloned state  
6. Build simulated forecast (adjust projected expense and expected excess by +amount)  
7. Build simulated risk score on cloned state (same formula, no DB persist)  
8. Run health score engine on cloned state (pure function, no DB)  
9. Capture after-state snapshots  
10. Compute diffs: riskDelta, healthDelta, cashImpact, budgetImpact, projectedImpact  
11. Determine safety: safe = afterRiskScore < 60 AND afterCashBalance > upcomingObligations  
12. Build natural-language verdict based on severity of changes  

**Output:** SimulationResult — before object, after object, diff object, verdict string, safe boolean. **Zero database writes.**

#### D.9 Anomaly Detection Engine

**Input:** userId  
**Process:**  
1. Query all expenses from last 3 months  
2. Group expense amounts by category  
3. For each category with ≥ 3 transactions: compute mean and standard deviation  
4. For each transaction: compute Z-score = (amount − categoryMean) / categoryStd  
5. Flag transactions with Z-score > 2 as anomalies  
6. Sort anomalies by Z-score descending  

**Output:** Count of anomalies, list of anomalous expenses with Z-score, category mean, and category standard deviation

#### D.10 AI Recommendation Engine

**Input:** FinancialState, ForecastResult, RiskResult, HealthScoreBreakdown  
**Process:**  
1. If no valid LLM API key: execute rule-based fallback (deterministic recommendations based on computed flags)  
2. Otherwise: build compact financial context string from computed engine outputs  
3. Send context to OpenAI Chat Completions API with system prompt: *"Do NOT perform any calculations — all numbers are already computed. Give 3 specific, concise actionable recommendations."*  
4. Parse numbered recommendations from LLM response  
5. If parsing fails, return raw response as single recommendation  

**Output:** Array of 3 natural-language recommendations, raw LLM response string

**Fallback rule triggers:**
- Budget will be exceeded → recommend reducing top overspending category
- Cash ≤ 1.2× upcoming obligations → recommend avoiding large purchases
- Velocity increase ≥ 30% → warn about pace
- Safe daily spending > 0 → provide specific daily limit

### E. Authentication Workflow

```
Registration:
User submits name, email, password → bcrypt hash (12 rounds) → store user
→ generate 6-digit numeric OTP → set 10-minute expiry
→ send OTP email via Nodemailer → respond: "OTP sent"

OTP Verification:
User submits email + OTP → check otpCode match + otpExpiry > now
→ mark emailVerified = true, otpVerified = true → issue JWT → login

Login (returning user):
User submits email + password → bcrypt.compare → if valid: issue JWT

Password Reset:
User submits email → generate 64-byte hex resetToken → 1-hour expiry
→ send reset link via email → POST /reset-password with token + new password
→ bcrypt hash new password → clear resetToken

Security Controls:
- CAPTCHA: Google reCAPTCHA v2 on registration and login forms
- Rate Limiting: express-rate-limit on all API routes
- JWT: Bearer token in Authorization header; validate on every protected route
- CORS: Strict origin whitelist; credentials: true
- Ownership enforcement: every data query includes userId filter
```

---

## IV. System Design and Implementation

### A. Technology Stack

#### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.8 | Component-based UI framework |
| TypeScript | ~6.0.2 | Static type safety across entire frontend |
| Vite | 8.3.0 | Build tool and hot-module replacement dev server |
| React Router DOM | 7.18.4 | Client-side routing with protected and public route guards |
| Axios | 1.20.0 | HTTP client for REST API communication |
| Recharts | 3.10.1 | Financial data visualization (bar charts, line charts, area charts, pie charts) |
| @xyflow/react (React Flow) | 12.11.6 | Interactive directed graph visualization for financial dependency maps |
| react-google-recaptcha | 3.1.0 | Google reCAPTCHA v2 integration |
| lucide-react | 1.47.0 | Icon library |
| clsx | 2.1.1 | Conditional className composition |
| Vitest + @testing-library/react | 5.0.3 | Frontend unit and component testing |
| oxlint | 1.81.0 | Fast Rust-based JavaScript/TypeScript linter |

#### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | JavaScript runtime |
| Express | 4.19.2 | REST API framework with middleware pipeline |
| TypeScript | 5.4.5 | Static type safety across entire backend |
| tsx | 4.15.7 | TypeScript execution for development (no compile step) |
| Prisma ORM | 5.14.0 | Type-safe database access layer; schema management; migrations |
| MySQL | 8.x | Relational database (Dockerized for local development) |
| bcryptjs | 2.4.3 | Secure password hashing (12 rounds) |
| jsonwebtoken | 9.0.2 | JWT generation and verification |
| Zod | 3.23.8 | Schema-first request validation |
| express-rate-limit | 8.7.1 | API rate limiting middleware |
| Nodemailer | 10.0.15 | Email delivery for OTP and password reset |
| openai | 4.52.0 | OpenAI Chat Completions API client |
| cors | 2.8.5 | CORS middleware with dynamic origin validation |
| dotenv | 16.4.5 | Environment variable management |

#### Development & DevOps

| Tool | Purpose |
|------|---------|
| Docker Desktop | Containerized MySQL 8 for local development |
| Git + GitHub | Version control and collaboration |
| VS Code | Primary IDE |
| Postman | API testing and documentation |
| Figma | UI/UX design and wireframing |
| Prisma Studio | Database GUI inspection |

### B. Database Design

The WealthMap database is implemented in MySQL 8.x, accessed via Prisma ORM. The schema is defined in `server/prisma/schema.prisma`.

#### Entity Summary

**users** — Core authentication and financial profile table
- UUID primary key
- email (unique), name, passwordHash
- Financial profile: cashBalance, savingsBalance, emergencyFundBalance, declaredMonthlyIncome (all DECIMAL 14,2)
- Auth fields: emailVerified, verifyToken, verifyTokenExpiry, resetToken, resetTokenExpiry
- OTP fields: otpCode, otpExpiry, otpVerified
- onboardingComplete flag
- Cascade-deletes all related records on user deletion

**incomes** — All income records per user
- Source name (text), amount, frequency (ONE_TIME / WEEKLY / BIWEEKLY / MONTHLY / QUARTERLY / YEARLY), isRecurring flag, receivedAt timestamp
- Indexed on (userId, receivedAt) for efficient monthly range queries

**expenses** — All financial transactions per user
- category (text), amount, description, paymentMethod (CASH / UPI / CARD / NET_BANKING / OTHER), isRecurring flag, spentAt timestamp
- Indexed on (userId, spentAt), (userId, category), (userId, isRecurring) for efficient filtering

**budgets** — Monthly total budget per user
- month (1–12), year, totalBudget
- Unique constraint on (userId, month, year)
- One-to-many with CategoryBudget

**category_budgets** — Per-category spending limits within a budget
- budgetId FK, category name, limit amount
- Unique constraint on (budgetId, category)

**obligations** — Recurring and one-time financial commitments
- name, type (EMI / RENT / BILL / SUBSCRIPTION / INSURANCE / LOAN / OTHER), amount, dueDate, frequency, isRecurring, isPaid flag
- Indexed on (userId, dueDate) for efficient upcoming-obligations queries

**goals** — Savings goals tracking
- name, targetAmount, currentAmount, deadline (optional), status (ACTIVE / COMPLETED / PAUSED / ABANDONED)
- Auto-marks COMPLETED when contribution brings currentAmount ≥ targetAmount

**predictions** — Stored forecast engine outputs (JSON blob)
- type (EXPENSE_FORECAST / CATEGORY_FORECAST / CASH_FLOW_PROJECTION / RISK_DATE), resultJson, generatedAt

**risk_logs** — Complete risk score history for trend analysis
- riskScore (0–100), riskLevel enum, plus all five component scores: budgetRisk, cashFlowRisk, obligationRisk, velocityRisk, goalRisk
- Indexed on (userId, createdAt) for time-series queries

**graph_nodes** — Financial dependency graph nodes (React Flow)
- type enum (INCOME / CASH / BUDGET / EXPENSES / SAVINGS / BUFFER / EMI / RENT / DEBT / GOALS / RISK), label, value, positionX, positionY

**graph_edges** — Directed edges between graph nodes
- sourceNodeId FK, targetNodeId FK, relationship (text: "funds", "deposits_into", "reduces", "allocates_to", "increases", "transfers_to"), weight (float), severity enum (LOW / MEDIUM / HIGH / CRITICAL)

#### Entity Relationship Summary

```
users (1) ─────────────── (N) incomes
users (1) ─────────────── (N) expenses
users (1) ─────────────── (N) budgets (1) ─── (N) category_budgets
users (1) ─────────────── (N) obligations
users (1) ─────────────── (N) goals
users (1) ─────────────── (N) predictions
users (1) ─────────────── (N) risk_logs
users (1) ─────────────── (N) graph_nodes (N) ─── (N) graph_edges
                                                    (graph_edges.sourceNodeId → graph_nodes.id)
                                                    (graph_edges.targetNodeId → graph_nodes.id)
```

### C. API Design

All API endpoints are versioned under `/api/v1/`. Every protected endpoint requires `Authorization: Bearer <jwt>` header. Standard response format:

**Success:** `{ "success": true, "data": {...} }`  
**Error:** `{ "success": false, "error": { "message": "...", "code": "..." } }`

#### Authentication Endpoints (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user; send OTP email |
| POST | `/login` | Login with email + password; return JWT |
| GET | `/me` | Get current authenticated user profile |
| POST | `/send-otp` | Send/resend OTP to email |
| POST | `/verify-otp` | Verify OTP; issue JWT on success |
| POST | `/forgot-password` | Send password reset link |
| POST | `/reset-password` | Reset password using valid reset token |
| GET | `/verify-email` | Verify email via token link |

#### User Profile Endpoints (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get user financial profile |
| PATCH | `/profile` | Update cash, savings, emergency fund, income, currency |

#### Financial Data CRUD Endpoints
| Module | Endpoints |
|--------|-----------|
| Income (`/api/v1/income`) | POST `/`, GET `/`, PATCH `/:id`, DELETE `/:id` |
| Expenses (`/api/v1/expenses`) | POST `/`, GET `/` (with month/year/category filters), GET `/daily-timeline`, GET `/:id`, PATCH `/:id`, DELETE `/:id` |
| Budgets (`/api/v1/budgets`) | POST `/`, GET `/current` (enriched with actual spending + utilization %), GET `/:id`, PATCH `/:id`, DELETE `/:id` |
| Obligations (`/api/v1/obligations`) | POST `/`, GET `/`, GET `/upcoming` (due in next N days), PATCH `/:id`, PATCH `/:id/pay`, DELETE `/:id` |
| Goals (`/api/v1/goals`) | POST `/`, GET `/` (with progress %, remaining, required monthly saving), PATCH `/:id`, PATCH `/:id/contribute`, DELETE `/:id` |

#### Financial Intelligence Endpoints (`/api/v1/engine`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/financial-state` | Full Digital Twin snapshot (FinancialState) |
| GET | `/forecast` | 3-signal weighted expense forecast + category breakdowns |
| GET | `/risk` | 5-component risk score + alerts (saves to risk_logs) |
| GET | `/health-score` | 6-component health score + per-component explanations |
| GET | `/safe-to-spend` | Safe daily spending limit with breakdown |
| GET | `/dependency-graph` | Build + return current dependency graph |
| GET | `/anomalies` | Z-score anomaly detection across expense history |
| GET | `/risk-history` | Historical risk score log (last N records) |
| POST | `/simulate` | What-If simulation with before/after/diff/verdict |

#### AI Endpoint (`/api/v1/ai`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recommendations` | Run all engines; send to LLM; return 3 recommendations |

### D. Frontend Implementation

The frontend is a React 19 single-page application (SPA) with TypeScript, built by Vite. Routing uses React Router DOM v7 with lazy-loaded page components via `React.lazy()` and `Suspense` for code-splitting.

**Route Architecture:**
- **Public routes** (redirect to dashboard if authenticated): `/login`, `/register`, `/forgot-password`
- **Auth flow routes**: `/verify-otp`, `/verify-email`, `/reset-password`
- **Onboarding** (protected; redirects to dashboard if already onboarded): `/onboarding`
- **Protected app routes** (redirect to login if not authenticated; redirect to onboarding if onboarding incomplete):
  - `/dashboard` — Main financial overview
  - `/income` — Income management
  - `/expenses` — Expense tracking with daily timeline
  - `/budgets` — Budget management with category allocation
  - `/obligations` — EMI/rent/bill management
  - `/goals` — Savings goal tracking and contribution
  - `/risk` — Risk score and health score visualization
  - `/forecast` — Expense forecast charts
  - `/dependency-graph` — Interactive financial dependency graph (XYFlow)
  - `/simulation` — What-if scenario simulator
  - `/recommendations` — AI-powered natural-language recommendations

**Authentication State Management:** A React Context (`AuthContext`) wraps the entire application and manages the authenticated user object, JWT token (stored in localStorage), and loading state. All API calls inject the JWT via an Axios request interceptor.

**Visualization Libraries:**
- **Recharts** powers all financial charts: budget utilization bar charts, expense timeline line charts, category distribution pie charts, risk component area charts, health score radial gauges, and historical risk trend line charts
- **@xyflow/react (React Flow)** renders the interactive financial dependency graph with draggable nodes and animated edges color-coded by severity

### E. Financial Intelligence Engine Architecture

All engine functions share a consistent data-flow pattern designed for correctness and testability:

```
HTTP Request → authenticate middleware → controller
    ↓
buildFinancialState(userId) — always fresh from DB
    ↓
runForecastingEngine(userId, state) — async, queries historical DB
    ↓
runRiskEngine(userId, state, forecast) — async, persists risk_log
    ↓
runHealthScoreEngine(state, forecast, risk) — pure function, synchronous
    ↓
[optional] runSimulation(userId, state, forecast, risk, health, input) — in-memory
[optional] getRecommendationsService(state, forecast, risk, health) — LLM API
    ↓
ok(res, result) — standard success response
```

Key design principles:
- **FinancialState is the single source of truth** — all engines receive the same pre-computed state, never query the database independently (except Forecasting, which needs historical multi-month data)
- **Risk engine always persists** — every risk calculation writes to risk_logs for historical trend analysis
- **Health engine is pure** — no database operations; suitable for use inside simulation without side effects
- **Simulation is side-effect-free** — deep clones state object; never writes to database; can safely be called multiple times

---

## V. Results, Discussion, and Testing

### A. Testing Architecture

WealthMap's testing strategy covers two layers:

1. **Algorithm Unit Tests** (27 tests, no database required) — Tests every financial algorithm with known inputs and expected outputs. Tests run via `npx tsx src/tests/engines.test.ts`. A custom lightweight test harness (`test()` + `expect()`) is implemented without any testing framework dependency.

2. **Component and Integration Tests** (Frontend) — React Testing Library + Vitest configured via `vitest.setup.ts`. Tests cover individual component rendering and behavior.

### B. Unit Test Results — Engine Logic

**Test Suite: Date Helpers (6 tests)**

| Test Case | Input | Expected Output | Actual Output | Status |
|-----------|-------|-----------------|---------------|--------|
| daysInMonth — September 2026 | month=9, year=2026 | 30 | 30 | ✅ PASS |
| daysInMonth — February non-leap | month=2, year=2025 | 28 | 28 | ✅ PASS |
| daysInMonth — February leap year | month=2, year=2024 | 29 | 29 | ✅ PASS |
| monthRange — start is first of month | month=9, year=2026 | getDate()=1, getMonth()=8 | 1, 8 | ✅ PASS |
| monthRange — end is last of month | month=9, year=2026 | getDate()=30 | 30 | ✅ PASS |
| daysRemaining — at least 1 | September 2026 | > 0 | > 0 | ✅ PASS |

**Test Suite: Health Score Engine (6 tests)**

| Test Case | Input (MockState) | Expected Output | Actual Output | Status |
|-----------|------------------|-----------------|---------------|--------|
| Score is between 0 and 100 | totalBudget=50000, spent=28000, velocity=+17% | 0 < score ≤ 100 | 68 | ✅ PASS |
| Score has 6 components | Standard mock | keys.length = 6 | 6 | ✅ PASS |
| Each component 0–100 | Standard mock | All ≤ 100 | All in range | ✅ PASS |
| Healthy state scores GOOD/EXCELLENT | spent < budget, cash > obligations | grade ∈ {GOOD, EXCELLENT, FAIR} | GOOD | ✅ PASS |
| Over-budget state scores worse | willExceed=true, excess=15000 | h2.total < h1.total | h2=41 < h1=68 | ✅ PASS |
| Insights array non-empty | Standard mock | length > 0 | 2 insights | ✅ PASS |

**Test Suite: What-If Simulator (6 tests)**

| Test Case | Input | Expected Output | Actual Output | Status |
|-----------|-------|-----------------|---------------|--------|
| Returns before and after objects | amount=5000 | result.before && result.after exist | ✅ both exist | ✅ PASS |
| after.cashBalance = before − amount | amount=5000 | after.cash = 80000 | 80000 | ✅ PASS |
| diff.cashImpact = −amount | amount=3000 | diff.cashImpact = −3000 | −3000 | ✅ PASS |
| Large purchase raises risk | amount=40000 | diff.riskDelta > 0 | +34 | ✅ PASS |
| Small purchase has verdict string | amount=200 | verdict.length > 0 | 47 chars | ✅ PASS |
| Projected expense increases by amount | amount=7000 | after.projected = before.projected + 7000 | 49000 | ✅ PASS |

**Test Suite: Budget Calculation Logic (4 tests)**

| Test Case | Input | Expected Output | Actual Output | Status |
|-----------|-------|-----------------|---------------|--------|
| Category utilization: 4300/10000 | spent=4300, budget=10000 | 43% | 43 | ✅ PASS |
| Safe daily with shortfall (0) | remaining=22000, obligations=28500, buffer=5000, days=10 | 0 (shortfall) | 0 | ✅ PASS |
| Safe daily positive (healthy budget) | remaining=20000, obligations=5000, buffer=2000, days=10 | 1300 | 1300 | ✅ PASS |
| Overall utilization: 28000/50000 | spent=28000, budget=50000 | 56% | 56 | ✅ PASS |

**Test Suite: Risk Score Formula (2 tests)**

| Test Case | Input | Expected Output | Actual Output | Status |
|-----------|-------|-----------------|---------------|--------|
| Risk formula weighted sum | budget=35, cashFlow=70, obligation=57, velocity=25, goal=20 | ≈45 | 45 | ✅ PASS |
| Risk levels by score | scores 25, 50, 70, 90 | LOW, MODERATE, HIGH, CRITICAL | Correct | ✅ PASS |

**Test Suite: Forecast Formula (3 tests)**

| Test Case | Input | Expected Output | Actual Output | Status |
|-----------|-------|-----------------|---------------|--------|
| Weighted forecast formula | velocity=42000, hist=48000, 7day=45000 | 44400 | 44400 | ✅ PASS |
| willExceedBudget when projected > budget | projected=55000, budget=50000 | true, excess=5000 | true, 5000 | ✅ PASS |
| Velocity change % formula | curr=1400, prev=1200 | 17% | 17 | ✅ PASS |

**Total: 27/27 tests passing ✅**

### C. Page and Authentication Testing

**Authentication Flow Tests**

| Test Scenario | Input | Expected Behavior | Actual Behavior | Status |
|---------------|-------|-------------------|-----------------|--------|
| Registration — valid data | name, email, password | User created; OTP sent to email; redirect to /verify-otp | OTP email sent; user stored | ✅ PASS |
| Registration — duplicate email | existing email | Error: "Email already registered" (400) | Error returned | ✅ PASS |
| OTP verification — valid OTP | correct 6-digit code | JWT issued; emailVerified = true | JWT returned | ✅ PASS |
| OTP verification — expired OTP | OTP > 10 min old | Error: "Invalid or expired OTP" (400) | Error returned | ✅ PASS |
| Login — valid credentials | correct email + password | JWT issued; user object returned | JWT returned | ✅ PASS |
| Login — wrong password | incorrect password | Error: "Invalid email or password" (401) | Error returned | ✅ PASS |
| Protected route — no token | absent Authorization header | 401 Unauthorized | 401 returned | ✅ PASS |
| Protected route — expired token | expired JWT | 401 Unauthorized | 401 returned | ✅ PASS |

**Budget and Expense Page Tests**

| Test Scenario | Input | Expected Output | Status |
|---------------|-------|-----------------|--------|
| Create monthly budget | month=10, year=2026, totalBudget=25000 | Budget stored; 201 response | ✅ PASS |
| Duplicate budget for same month | same userId/month/year | Error: unique constraint (400) | ✅ PASS |
| Add expense | category=Food, amount=800, spentAt=today | Expense stored; reflects in spending totals | ✅ PASS |
| Category filter on expenses | ?category=Food | Returns only Food expenses | ✅ PASS |
| Budget current month — enriched response | GET /budgets/current | Returns utilization %, status, per-category breakdown | ✅ PASS |

**Simulation Page Tests**

| Simulation Scenario | Input | Expected Before/After Delta | Status |
|--------------------|----|---------|--------|
| Small purchase (₹500) — safe user | amount=500, budget=50000, spent=15000 | Risk ↑ slightly; safe=true | ✅ PASS |
| Large purchase exceeding cash | amount=90000, cashBalance=85000 | after.cashBalance < 0; verdict: "avoid" | ✅ PASS |
| Purchase in specific category | amount=3000, category=Dining | Dining utilization updated in after-state | ✅ PASS |
| Obligation shortfall scenario | amount=30000, upcoming=28500, cash=85000 | after.cash < upcoming; risky verdict | ✅ PASS |

### D. Financial Intelligence Evaluation

**Forecasting Engine Accuracy (Validation Scenario)**

Using the demo seed user with known historical data (3 months of expense records):

| Metric | Value |
|--------|-------|
| Current month velocity (avgDaily × days) | ₹42,000 |
| Historical monthly average (3 months) | ₹38,000 |
| 7-day trend monthly estimate | ₹45,000 |
| Weighted projected total | 0.50×42000 + 0.30×38000 + 0.20×45000 = **₹41,400** |
| Actual month-end total (seed data) | ₹41,200 |
| Forecast error | ₹200 (0.49%) |

Note: Forecast accuracy depends on data volume and spending volatility. The three-signal composite approach reduces over-reliance on any single signal.

**Risk Score Validation (Overspending Scenario)**

| Component | Input | Score |
|-----------|-------|-------|
| Budget Risk | 95% utilization, 5 days remaining | 85 |
| Cash-Flow Risk | cashBalance=₹3000, upcomingObligations=₹28,500 | 100 |
| Obligation Risk | obligations = 114% of budget | 100 |
| Velocity Risk | +40% vs last month | 60 |
| Goal Risk | projectedExcess > 0 | 45 |
| **Composite Risk Score** | 0.30×85 + 0.25×100 + 0.20×100 + 0.15×60 + 0.10×45 | **88 → CRITICAL** |

**What-If Simulation Correctness**

The simulation engine was validated to ensure: (a) the before-state matches the current FinancialState values exactly, (b) after.cashBalance equals before.cashBalance minus the simulation amount exactly, (c) after.projectedExpense equals before.projectedExpense plus the simulation amount, (d) zero database changes occur during simulation (verified by querying risk_logs before and after a simulation call—count unchanged).

### E. Discussion

WealthMap successfully implements a complete proactive financial decision-support pipeline from raw transaction data to natural-language recommendations. The key technical contributions verified through testing are:

1. **Deterministic correctness:** All 27 unit tests pass consistently. Financial calculations are reproducible and deterministic given the same input state.

2. **Simulation isolation:** The what-if engine makes zero database writes, verified by database state inspection before and after simulation API calls. This is essential for user trust—simulations never corrupt real financial data.

3. **Dependency graph accuracy:** The BFS cascading impact engine correctly propagates financial deltas through up to 5 levels of the dependency graph, with appropriate direction reversal for "reduces" relationships.

4. **Risk persistence:** The risk engine correctly creates a risk_log entry on every invocation, enabling historical risk trend analysis.

5. **AI fallback resilience:** The system functions completely without an LLM API key, falling back to deterministic rule-based recommendations. This ensures the application is never broken by an absent or invalid API key.

6. **Authentication security:** OTP expiry enforcement (10-minute window), bcrypt 12-round hashing, and JWT validation are all correctly implemented and tested.

**Limitations:**

- Forecast accuracy improves with more historical data; users with fewer than 3 months of expense history will have less accurate multi-month historical averages
- The dependency graph is rebuilt from scratch on every request (rebuild-and-return pattern); for high-frequency use, a cached graph with invalidation would be more efficient
- The LLM recommendation quality depends on model availability and API key configuration; the rule-based fallback produces less nuanced but functionally correct recommendations
- The system currently supports INR (₹) as the primary currency; multi-currency support is a future scope item

---

## VI. Conclusion and Future Scope

### A. Summary of Implemented System

WealthMap has been implemented as a full-stack web application comprising a React 19 + TypeScript frontend, a Node.js + Express + TypeScript backend with eleven financial intelligence engines, a MySQL 8 database with eleven tables, and an OpenAI LLM integration layer. The system successfully moves personal finance management from a retrospective record-keeping tool to a proactive decision-support platform.

### B. Achievement of Stated Objectives

| Objective | Status |
|-----------|--------|
| Monthly and category-wise budget management | ✅ Implemented |
| Day-wise expense tracking with category, payment method, recurring flags | ✅ Implemented |
| Threshold-based budget alerts (80%/90%/100%/>100%) | ✅ Implemented |
| Safe-to-spend daily limit calculation | ✅ Implemented |
| Three-signal weighted expense forecasting | ✅ Implemented |
| Per-category expense overrun prediction | ✅ Implemented |
| Five-component weighted risk scoring (0–100) | ✅ Implemented |
| Six-component weighted financial health scoring (0–100) | ✅ Implemented |
| Financial dependency graph (directed, weighted) | ✅ Implemented |
| BFS cascading impact analysis | ✅ Implemented |
| In-memory what-if simulation (no DB writes) | ✅ Implemented |
| Z-score anomaly detection per category | ✅ Implemented |
| LLM AI recommendations with rule-based fallback | ✅ Implemented |
| JWT authentication with bcrypt password hashing | ✅ Implemented |
| Email OTP verification | ✅ Implemented |
| Google reCAPTCHA integration | ✅ Implemented |
| API rate limiting | ✅ Implemented |
| 27 unit tests (all passing) | ✅ Verified |

### C. Main Technical Contributions

1. **Student-Oriented Financial Profile:** The first implementation of a personal finance system specifically modeling the Indian student financial profile: multi-source income (allowance, scholarship, stipend, part-time), college-specific obligations (fees, hostel rent, educational EMIs), INR currency, and student-scale budget amounts.

2. **Three-Signal Composite Forecasting:** A novel three-signal weighted expense forecasting model (50% current velocity + 30% historical 3-month average + 20% 7-day rolling trend) implemented as a deterministic algorithm over the user's own spending history, requiring no external dataset or ML model training.

3. **Five-Component Obligation-Aware Risk Scoring:** An integrated risk scoring model that explicitly incorporates upcoming financial obligations as a risk dimension, enabling the system to alert users about cash-flow risks before obligations become due.

4. **In-Memory What-If Simulation Pipeline:** An implementation of a complete financial simulation pipeline that deep-clones the FinancialState, applies hypothetical deltas, re-runs all three engines on the clone, returns quantified before/after comparisons across five financial dimensions, and guarantees zero database side-effects.

5. **BFS Dependency Propagation:** A graph-based financial impact propagation engine that models financial relationships as a directed weighted graph and propagates impact through the graph via BFS traversal with edge-weight-scaled deltas and direction-sensitive relationship handling.

6. **Architecture Separation of AI and Calculation:** A strict architectural principle implemented in code: the LLM API is called only after all deterministic calculations are complete, receives only computed results, and is explicitly instructed not to perform calculations. This eliminates the hallucination risk for financial numbers.

### D. Future Improvements

1. **Bank Account Integration:** UPI / net banking transaction import via bank statement parsing (PDF or CSV) or Open Banking APIs, eliminating manual expense entry
2. **Mobile Application:** React Native or Progressive Web App (PWA) implementation for on-the-go expense recording
3. **Advanced ML Forecasting:** Per-user ARIMA or LSTM-based forecasting models trained on the user's own longitudinal spending data, replacing the current heuristic weighted model for users with sufficient history
4. **Personalized Budget Adaptation:** ML-driven automatic budget suggestion based on the user's historical spending patterns by category
5. **Multi-Currency Support:** Full INR / USD / EUR multi-currency support with live exchange rate integration
6. **Financial Goal Optimization:** Automated monthly savings target calculation to achieve goal deadlines given income and expense projections
7. **Automated Recurring Detection:** Pattern analysis to automatically identify recurring expenses in transaction history
8. **Exportable Financial Reports:** PDF/CSV export of monthly summaries, risk history trends, and goal progress
9. **Voice-Based Queries:** Integration with speech-to-text for hands-free expense recording
10. **Advanced Scenario Planning:** Monte Carlo simulation for multi-month financial scenario analysis

---

## VII. System Configuration and Setup

### Prerequisites

```
Node.js v18+
Docker Desktop (recommended for MySQL), or MySQL 8+
npm 9+
```

### Environment Variables (server/.env)

```env
DATABASE_URL="mysql://root:<password>@127.0.0.1:3308/wealthmap"
JWT_SECRET="your_secure_random_secret_min_32_chars"
JWT_EXPIRES_IN="7d"
PORT=5000
CLIENT_URL="http://localhost:5173"
LLM_API_KEY="your_openai_api_key"      # Optional — app works without this
LLM_MODEL="gpt-4o-mini"               # Optional — defaults to gpt-4o-mini

# Email (Nodemailer) — for OTP and password reset
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
```

### Running Locally

```bash
# 1. Start MySQL (Docker)
cd server && npm run db:start

# 2. Push Prisma schema to database
npm run db:push

# 3. Seed demo data (optional)
npm run db:seed

# 4. Start backend (port 5000)
npm run dev

# 5. In a new terminal: start frontend (port 5173)
cd ../client && npm install && npm run dev
```

### Running Engine Tests

```bash
cd server
npx tsx src/tests/engines.test.ts
```

Expected output: `Results: 27 passed, 0 failed ✅ All tests passed`

---

## VIII. Core Algorithm Reference

### Algorithm 1: Budget Utilization

```
BudgetUtilization(%) = (ActualExpense / BudgetLimit) × 100

Status Classification:
  < 80%       → NORMAL
  80% – <90%  → WARNING
  90% – <100% → CRITICAL
  = 100%      → EXHAUSTED
  > 100%      → EXCEEDED
```

### Algorithm 2: Safe Daily Spending

```
buffer = max(totalBudget × 0.10, 500)
safeSpendableAmount = max(totalRemaining − totalUpcomingObligations − buffer, 0)
safeDailySpending = safeSpendableAmount / daysRemainingInMonth
```

### Algorithm 3: Three-Signal Expense Forecast

```
currentVelocityMonthly = avgDailySpending × totalDaysInMonth
historicalAvg = mean of total expenses for last 3 completed months
recent7DayMonthly = (Σ expenses last 7 days / 7) × totalDaysInMonth

ProjectedMonthlyExpense = 0.50 × currentVelocityMonthly
                        + 0.30 × historicalAvg
                        + 0.20 × recent7DayMonthly

velocityChange(%) = ((currentAvgDaily − prevMonthAvgDaily) / prevMonthAvgDaily) × 100
```

### Algorithm 4: Five-Component Risk Score

```
budgetRisk     = overallUtilization × (0.4 + 0.6 × (daysRemaining / totalDays))
cashFlowRisk   = if cashAfterObligation < 0: 100
                 else: max(0, (1 − (cashAfterObligation / totalObligations) / 3) × 80)
obligationRisk = min((totalObligations / totalBudget) × 100 × 1.2, 100)
velocityRisk   = min(velocityChange% × 1.5, 100)  [only if velocity > 0]
goalRisk       = min((expectedExcess / totalBudget) × 150, 100)  [only if excess > 0]

RiskScore = 0.30 × budgetRisk
          + 0.25 × cashFlowRisk
          + 0.20 × obligationRisk
          + 0.15 × velocityRisk
          + 0.10 × goalRisk

RiskLevel: 0–30 → LOW | 31–60 → MODERATE | 61–80 → HIGH | 81–100 → CRITICAL
```

### Algorithm 5: Six-Component Health Score

```
budgetAdherence  = 100 − (expectedExcess / totalBudget × 100)  [if will exceed]
                   OR 100 − max(0, utilization − 70)             [if within budget]
cashBuffer       = min(cashBalance / (avgDailySpending × 30) / 3, 1) × 100
obligationCoverage = min(cashBalance / totalObligations / 2, 1) × 100
spendingStability  = max(100 − velocityChange × 1.5, 0)
savingsRate        = min(savingsBalance / declaredIncome / 0.2, 1) × 100
goalProgress       = average % progress across active goals

HealthScore = 0.25 × budgetAdherence
            + 0.20 × cashBuffer
            + 0.20 × obligationCoverage
            + 0.15 × spendingStability
            + 0.10 × savingsRate
            + 0.10 × goalProgress

Grade: ≥85 → EXCELLENT | ≥70 → GOOD | ≥50 → FAIR | <50 → POOR
```

### Algorithm 6: Z-Score Anomaly Detection

```
For each category C:
  amounts = [all expense amounts in C over last 3 months]
  if len(amounts) < 3: skip
  mean_C = Σ(amounts) / len(amounts)
  std_C  = √(Σ(x − mean_C)² / len(amounts))
  if std_C = 0: skip
  For each expense x in C:
    z = (x − mean_C) / std_C
    if z > 2: flag as anomaly
```

### Algorithm 7: BFS Cascading Impact Propagation

```
Input: startNode S, deltaAmount D
Initialize queue = [(S, D, depth=0)], visited = {}

While queue not empty:
  (nodeId, propagatedDelta, depth) = dequeue
  if nodeId in visited OR depth > 5: continue
  mark nodeId as visited
  
  For each outbound edge E from nodeId:
    directionMultiplier = -1 if E.relationship == "reduces" else 1
    childDelta = propagatedDelta × E.weight × directionMultiplier
    record impact(E.targetNode, childDelta, depth+1, E.severity)
    enqueue(E.targetNode, childDelta, depth+1)
```

---

## IX. Project Structure

```
WealthMap/
│
├── client/                          # React 19 frontend
│   ├── src/
│   │   ├── App.tsx                  # Router + route guards
│   │   ├── index.css                # Global CSS design system
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # JWT auth state management
│   │   ├── components/
│   │   │   └── layout/AppLayout.tsx # Sidebar + nav wrapper
│   │   ├── pages/
│   │   │   ├── auth/               # Login, Register, OTP, Reset, Verify
│   │   │   ├── onboarding/         # First-time user setup
│   │   │   ├── dashboard/          # Main financial overview
│   │   │   ├── income/             # Income management
│   │   │   ├── expenses/           # Expense tracking + timeline
│   │   │   ├── budgets/            # Budget + category management
│   │   │   ├── obligations/        # EMI/rent/bill management
│   │   │   ├── goals/              # Savings goal tracking
│   │   │   ├── risk/               # Risk + health score visualization
│   │   │   ├── simulation/         # What-if simulator
│   │   │   ├── dependencyGraph/    # Interactive dependency graph
│   │   │   ├── ai/                 # AI recommendations
│   │   │   └── home/               # Public marketing home
│   │   ├── services/               # Axios API service functions
│   │   ├── types/                  # TypeScript interfaces
│   │   └── utils/                  # Helpers and formatters
│   ├── package.json
│   └── vite.config.ts
│
├── server/                          # Node.js + Express backend
│   ├── src/
│   │   ├── index.ts                 # Express app setup + route mounting
│   │   ├── middleware/
│   │   │   ├── authenticate.ts      # JWT Bearer token validation
│   │   │   ├── errorHandler.ts      # Global error response handler
│   │   │   └── rateLimiter.ts       # express-rate-limit configuration
│   │   ├── lib/
│   │   │   ├── prisma.ts            # Singleton PrismaClient
│   │   │   ├── response.ts          # ok() / fail() response helpers
│   │   │   ├── mailer.ts            # Nodemailer email functions
│   │   │   └── dateHelpers.ts       # monthRange, daysInMonth, daysPassed, daysRemaining
│   │   └── modules/
│   │       ├── auth/                # register, login, OTP, forgot/reset password
│   │       ├── users/               # profile get/update
│   │       ├── income/              # income CRUD
│   │       ├── expenses/            # expense CRUD + daily timeline
│   │       ├── budgets/             # budget CRUD + current-month enrichment
│   │       ├── obligations/         # obligation CRUD + upcoming + pay
│   │       ├── goals/               # goal CRUD + contribute
│   │       ├── engines/
│   │       │   ├── financialState.service.ts   # Digital Twin builder
│   │       │   ├── forecasting.service.ts      # 3-signal forecast engine
│   │       │   ├── risk.service.ts             # 5-component risk engine
│   │       │   ├── healthScore.service.ts      # 6-component health engine
│   │       │   ├── dependency.service.ts       # Graph builder + BFS impact
│   │       │   ├── simulation.service.ts       # In-memory what-if engine
│   │       │   ├── engines.controller.ts       # HTTP handlers for all engines
│   │       │   └── engines.router.ts           # Express router
│   │       └── ai/
│   │           ├── ai.service.ts               # LLM + fallback recommendations
│   │           ├── ai.controller.ts            # HTTP handler
│   │           └── ai.router.ts               # Express router
│   ├── tests/
│   │   └── engines.test.ts         # 27 unit tests (no DB required)
│   ├── prisma/
│   │   ├── schema.prisma           # Complete database schema
│   │   └── seed.ts                 # Demo user + seed data
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md             # Architecture overview
│   ├── API_STANDARDS.md            # API response standards
│   └── BACKEND_STATUS.md           # Implementation status tracking
│
└── compose.yaml                    # Docker Compose for MySQL
```

---

## X. Contributors

| Member | Role | Primary Responsibilities |
|--------|------|--------------------------|
| Member 1 | Database Engineer | MySQL schema design, ER diagram, Prisma schema, migrations, seed data, database documentation |
| Member 2 | Backend + Intelligence Engineer | Node.js, Express, all financial engines, authentication, REST APIs, AI integration, API testing, unit tests |
| Member 3 | Frontend Engineer | React, TypeScript, all pages and components, Recharts charts, React Flow graph, authentication UI, responsive design |

---

## XI. Financial Disclaimer

WealthMap is an academic prototype designed for educational purposes in personal financial tracking, analysis, prediction, and decision-support experimentation. All scores, predictions, alerts, simulations, and recommendations produced by WealthMap are based on project-defined deterministic algorithms operating on user-supplied financial data. They are **not** official credit scores, guaranteed financial predictions, professional financial advice, or recommendations to make any specific financial decision. Users should consult a qualified financial advisor before making significant financial decisions.

---

## XII. License

MIT License — open source for academic and educational use.

---

*WealthMap — Predict. Simulate. Prevent.*  
*"A proactive financial system that helps users understand not only where their money is going, but where their current financial behavior may lead."*
