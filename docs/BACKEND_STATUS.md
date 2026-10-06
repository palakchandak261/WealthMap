# 📋 WealthMap — Backend & Database Status Document

> Last updated: October 2026  
> Purpose: Clear record of what is implemented, what is pending, and what needs to be built next.

---

## 🗄️ DATABASE STATUS

### ✅ Implemented

| Table | Fields | Notes |
|-------|--------|-------|
| `users` | id, name, email, passwordHash, currency, cashBalance, savingsBalance, emergencyFundBalance, declaredMonthlyIncome, onboardingComplete, createdAt, updatedAt | Core user + financial profile |
| `incomes` | id, userId, source, amount, frequency, isRecurring, receivedAt, createdAt, updatedAt | All income sources |
| `expenses` | id, userId, category, amount, description, paymentMethod, isRecurring, spentAt, createdAt, updatedAt | All transactions with payment method + recurring flag |
| `budgets` | id, userId, month, year, totalBudget, createdAt, updatedAt | Monthly budget, unique per user+month+year |
| `category_budgets` | id, budgetId, category, limit, createdAt, updatedAt | Per-category spending limits |
| `obligations` | id, userId, name, type, amount, dueDate, frequency, isRecurring, isPaid, createdAt, updatedAt | EMIs, rent, bills, subscriptions |
| `goals` | id, userId, name, targetAmount, currentAmount, deadline, status, createdAt, updatedAt | Savings goals with GoalStatus enum |
| `predictions` | id, userId, type, resultJson, generatedAt | Stored forecast results as JSON |
| `risk_logs` | id, userId, riskScore, riskLevel, budgetRisk, cashFlowRisk, obligationRisk, velocityRisk, goalRisk, createdAt | Full risk score history with all 5 components |
| `graph_nodes` | id, userId, type, label, value, positionX, positionY, createdAt, updatedAt | React Flow dependency graph nodes |
| `graph_edges` | id, sourceNodeId, targetNodeId, relationship, weight, severity, createdAt | Directed weighted edges |

**Enums defined:** `Frequency`, `ObligationType`, `GoalStatus`, `PredictionType`, `RiskLevel`, `GraphNodeType`, `GraphSeverity`, `PaymentMethod`

**Indexes:** On all `userId`, `(userId, spentAt)`, `(userId, category)`, `(userId, isRecurring)`, `(userId, dueDate)`, `(userId, createdAt)`, `(sourceNodeId)`, `(targetNodeId)`

**Unique constraints:** `(userId, month, year)` on budgets, `(budgetId, category)` on category_budgets

**Seed file:** Demo user with income, 7 expenses, 3 obligations, 1 goal, 1 risk log, 1 prediction, 7-node dependency graph

---

### ❌ Missing from Database

| Missing Field / Table | Required For | Action Needed |
|-----------------------|-------------|---------------|
| `emailVerified Boolean @default(false)` on User | Email verification flow | Add field + migration |
| `verifyToken String?` on User | Email verification token | Add field + migration |
| `verifyTokenExpiry DateTime?` on User | Token expiry check | Add field + migration |
| `resetToken String?` on User | Password reset flow | Add field + migration |
| `resetTokenExpiry DateTime?` on User | Reset token expiry | Add field + migration |

**Migration command needed after adding fields:**
```bash
npx prisma migrate dev --name add-auth-verification-fields
```

---

## 🖥️ BACKEND STATUS

### ✅ Implemented Modules

---

#### 1. Auth Module (`/api/v1/auth`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/register` | POST | ✅ Done | Register with name, email, password. Returns JWT. |
| `/login` | POST | ✅ Done | Login with email + password. Returns JWT. |
| `/me` | GET | ✅ Done | Get current authenticated user profile. |

**What works:**
- Password hashing with bcrypt (12 rounds)
- JWT generation and verification
- Duplicate email check on register
- `authenticate` middleware protects all private routes
- Every service checks `userId` ownership — user A cannot access user B's data

---

#### 2. Users Module (`/api/v1/users`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/profile` | GET | ✅ Done | Get full user financial profile |
| `/profile` | PATCH | ✅ Done | Update cash, savings, emergency fund, income, currency |

---

#### 3. Income Module (`/api/v1/income`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/` | POST | ✅ Done | Add income source |
| `/` | GET | ✅ Done | List incomes (optional year filter) |
| `/:id` | PATCH | ✅ Done | Update income record |
| `/:id` | DELETE | ✅ Done | Delete income record |

---

#### 4. Expenses Module (`/api/v1/expenses`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/` | POST | ✅ Done | Add expense with category, amount, paymentMethod, isRecurring |
| `/` | GET | ✅ Done | List expenses (filter by month, year, category) |
| `/daily-timeline` | GET | ✅ Done | Day-wise grouped expense timeline |
| `/:id` | GET | ✅ Done | Get single expense |
| `/:id` | PATCH | ✅ Done | Update expense |
| `/:id` | DELETE | ✅ Done | Delete expense |

---

#### 5. Budgets Module (`/api/v1/budgets`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/` | POST | ✅ Done | Create/upsert monthly budget with category limits |
| `/current` | GET | ✅ Done | Get current month budget enriched with actual spending, utilization %, and status (NORMAL/WARNING/CRITICAL/EXCEEDED) |
| `/:id` | GET | ✅ Done | Get budget by ID |
| `/:id` | PATCH | ✅ Done | Update budget total or category limits |
| `/:id` | DELETE | ✅ Done | Delete budget |

---

#### 6. Obligations Module (`/api/v1/obligations`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/` | POST | ✅ Done | Add EMI / rent / bill |
| `/` | GET | ✅ Done | List all obligations (filter by isPaid) |
| `/upcoming` | GET | ✅ Done | Get obligations due in next N days (default 30) |
| `/:id` | PATCH | ✅ Done | Update obligation |
| `/:id/pay` | PATCH | ✅ Done | Mark obligation as paid |
| `/:id` | DELETE | ✅ Done | Delete obligation |

---

#### 7. Goals Module (`/api/v1/goals`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/` | POST | ✅ Done | Create savings goal |
| `/` | GET | ✅ Done | List goals with progress %, remaining amount, required monthly saving |
| `/:id` | PATCH | ✅ Done | Update goal name/deadline/status |
| `/:id/contribute` | PATCH | ✅ Done | Add contribution, auto-marks COMPLETED when target hit |
| `/:id` | DELETE | ✅ Done | Delete goal |

---

#### 8. Engine Module (`/api/v1/engine`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/financial-state` | GET | ✅ Done | Full Financial Digital Twin snapshot |
| `/forecast` | GET | ✅ Done | Weighted 3-signal expense projection (0.5×velocity + 0.3×history + 0.2×7day trend) |
| `/risk` | GET | ✅ Done | 5-component risk score (0.30×budget + 0.25×cashflow + 0.20×obligation + 0.15×velocity + 0.10×goal) |
| `/health-score` | GET | ✅ Done | 6-component explainable health score (0–100) with per-component explanation |
| `/safe-to-spend` | GET | ✅ Done | Safe daily spending = (remaining − obligations − buffer) / days left |
| `/dependency-graph` | GET | ✅ Done | Rebuilds + returns React Flow graph (nodes + edges) |
| `/anomalies` | GET | ✅ Done | Z-score anomaly detection per category |
| `/risk-history` | GET | ✅ Done | Historical risk log (last N records) |
| `/simulate` | POST | ✅ Done | What-If simulator — clones financial state, applies hypothetical expense, returns before/after diff + verdict |

**Algorithms implemented:**
- Budget utilization % and status (NORMAL / WARNING / CRITICAL / EXHAUSTED / EXCEEDED)
- Average daily spending rate
- Safe-to-spend with buffer (10% of budget, min ₹500)
- Weighted 3-signal expense forecast
- Per-category expense forecast
- Spending velocity change % vs previous month
- 5-component weighted risk score (normalized 0–100)
- 6-component weighted health score (normalized 0–100)
- BFS cascading impact propagation on dependency graph
- Z-score anomaly detection (flags z-score > 2)
- Pure in-memory What-If simulation (no DB writes)

---

#### 9. AI Module (`/api/v1/ai`)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/recommendations` | POST | ✅ Done | Runs all engines, sends structured results to LLM, returns 3 natural-language recommendations |

**Fallback:** If no API key is configured, returns rule-based recommendations automatically. App never breaks without an LLM key.

---

#### 10. Shared Infrastructure

| Component | Status | Description |
|-----------|--------|-------------|
| `authenticate` middleware | ✅ Done | Validates JWT Bearer token, attaches userId to request |
| `errorHandler` middleware | ✅ Done | Catches all thrown errors, returns standard error JSON |
| `prisma.ts` (shared client) | ✅ Done | Single PrismaClient instance for entire app |
| `response.ts` (ok/fail helpers) | ✅ Done | Consistent success/error response format |
| `dateHelpers.ts` | ✅ Done | monthRange, daysInMonth, daysPassed, daysRemaining |
| Engine logic tests | ✅ Done | 27 tests — all passing, no DB required |
| `.gitignore` | ✅ Done | node_modules and dist excluded |
| `.env.example` | ✅ Done | Template for all environment variables |

---

### ❌ Missing from Backend (Security & Validation)

---

#### Security — Not Yet Implemented

| Feature | Rubric Item | What's Needed |
|---------|-------------|---------------|
| Input validation on all routes | Required Field, Range, Email, Number, Compare validators | Add Zod schemas to every POST/PATCH route |
| Email verification | Email Verification | `POST /auth/verify-email/:token` endpoint + send verification email on register |
| Password reset / OTP flow | OTP Verification | `POST /auth/forgot-password` + `POST /auth/reset-password` endpoints |
| HttpOnly cookie support | Cookies | Option to set JWT in `Set-Cookie` header alongside Bearer token |
| CAPTCHA token validation | CAPTCHA | `POST /auth/verify-captcha` — validates Google reCAPTCHA token from frontend |
| Rate limiting | Security best practice | Add `express-rate-limit` on auth routes (login, register, forgot-password) |

---

#### Validation — Not Yet Implemented (Per Route)

| Route | Missing Validation |
|-------|--------------------|
| `POST /auth/register` | name (required, min 2 chars), email (valid format), password (min 8 chars, strength), confirmPassword (must match password) |
| `POST /auth/login` | email (required, valid format), password (required) |
| `POST /income` | source (required), amount (positive number, max 10,000,000), receivedAt (valid date) |
| `POST /expenses` | category (required), amount (positive, > 0), spentAt (valid date), paymentMethod (valid enum value) |
| `POST /budgets` | month (1–12), year (2020–2030), totalBudget (positive), categoryBudgets array (each limit > 0) |
| `POST /obligations` | name (required), amount (positive), dueDate (future date), type (valid enum) |
| `POST /goals` | name (required), targetAmount (positive), deadline (future date if provided) |
| `POST /engine/simulate` | amount (required, positive number), category (optional string) |

---

#### New Endpoints Needed

| Endpoint | Method | Priority | Description |
|----------|--------|----------|-------------|
| `/auth/verify-email/:token` | GET | HIGH | Verify email ownership via token sent on register |
| `/auth/forgot-password` | POST | HIGH | Send password reset token to user's email |
| `/auth/reset-password` | POST | HIGH | Reset password using valid reset token |
| `/auth/resend-verification` | POST | MEDIUM | Resend verification email |
| `/auth/logout` | POST | LOW | Invalidate token (for cookie-based sessions) |

---

#### Packages to Install for Missing Features

```bash
npm install nodemailer @types/nodemailer    # for sending verification + reset emails
npm install express-rate-limit              # for rate limiting auth routes
npm install @types/express-rate-limit
```

---

## 📊 Overall Completion Summary

| Area | Done | Remaining | % Complete |
|------|------|-----------|------------|
| Database schema | 11/11 tables | 5 fields needed | 95% |
| CRUD modules (income, expenses, budgets, obligations, goals, users) | 6/6 modules | — | 100% |
| Financial engine algorithms | 11/11 algorithms | — | 100% |
| Auth core (register/login/JWT) | ✅ | — | 100% |
| Input validation (Zod) | 0/8 routes | All routes need schemas | 0% |
| Email verification | ❌ | Full flow needed | 0% |
| Password reset / OTP | ❌ | Full flow needed | 0% |
| Cookie/session support | ❌ | HttpOnly cookie option | 0% |
| CAPTCHA backend validation | ❌ | Token verify endpoint | 0% |
| Rate limiting | ❌ | Auth routes | 0% |
| AI recommendations | ✅ | — | 100% |
| Engine tests | 27/27 passing | — | 100% |

**Overall backend completion: ~72%**  
The financial intelligence core (which is the unique part of WealthMap) is 100% done.  
The remaining 28% is the security & validation layer required by the rubric.

---

## 🔧 Next Steps (In Priority Order)

1. **Add Zod validation** to all 8 routes — 1–2 hours of work
2. **Add 5 fields** to User schema + run migration — 10 minutes
3. **Build email verification flow** — verify-email endpoint + nodemailer
4. **Build password reset flow** — forgot-password + reset-password endpoints
5. **Add rate limiting** on auth routes — 15 minutes
6. **Add HttpOnly cookie** option to login response — 20 minutes
7. **CAPTCHA validation** endpoint — 20 minutes (frontend sends token, backend verifies with Google)
