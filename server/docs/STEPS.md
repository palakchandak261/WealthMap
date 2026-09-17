1
Place the files in your repo
Drop schema.prisma, seed.ts, and .env.example into server/prisma/ and server/ exactly as shown in the repo tree below. If server/prisma/ already has files from earlier experiments, replace them — this schema is the complete, final version of all 11 tables.
2
Add the prisma seed config
Add the "prisma": { "seed": "ts-node prisma/seed.ts" } block to server/package.json, and make sure prisma, ts-node, typescript, @types/node (dev) and @prisma/client (regular dependency) are installed.
3
Point .env at a real MySQL database
Copy .env.example to .env and fill in DATABASE_URL with your actual MySQL 8 host, user, password and database name. Create the database itself first (CREATE DATABASE wealthmap;) if it doesn't exist.
4
Run the first migration
npx prisma migrate dev --name init — this reads schema.prisma, generates the SQL migration file, applies it to MySQL, and creates the typed Prisma Client. Commit the generated prisma/migrations/ folder to git.
5
Seed demo data
npx prisma db seed — creates one demo user with income, expenses, a budget, obligations, a goal, a risk log, a prediction, and a small dependency graph, so the backend dev has real rows to build engine endpoints against immediately.
6
Verify with Prisma Studio
npx prisma studio opens a local GUI at all 11 tables so you (or the backend dev) can confirm the seed data looks right before writing any engine logic against it.
7
Hand off to the backend developer
Push this branch and open a PR, or send the zip directly. Point them to server/docs/DATABASE.md first — it has the ERD, per-table design notes, and the two gotchas (UUID ids, Decimal.js return values) they need to know before wiring the engines.

What I built, and why it should be trustworthy:

The schema covers all 11 tables from your README/architecture doc (users, incomes, expenses, budgets, category_budgets, obligations, goals, predictions, risk_logs, graph_nodes, graph_edges), with relations wired so every engine (Financial State, Forecasting, Risk, Dependency Graph, What-If, Health Score) can read what it needs.
risk_logs stores the five weighted components from your Risk Score formula individually, not just the final number — so the "explainable" health score requirement in Phase 4 doesn't need a recompute.
I ran it through Prisma's own CLI to validate — the real prisma validate/migrate commands need to download an engine binary from binaries.prisma.sh, which isn't on this sandbox's allowed domain list, so that specific check failed with a network error rather than a schema error. As a substitute I wrote a static checker that confirms braces balance, no duplicate table names, and every field type resolves to a real scalar/model/enum — it passed clean. Please still run npx prisma migrate dev yourself as the true test, since it's the only thing that talks to a live MySQL server.
Full reasoning and setup commands are in DATABASE.md inside the zip.

A few assumptions I made — flag anything you want changed and I'll update the schema:

IDs are UUID strings, not auto-increment integers
Single-currency per user (no multi-currency ledger)
No sessions/refresh_tokens table (JWT is stateless per your README)