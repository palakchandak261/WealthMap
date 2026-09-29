# WealthMap Frontend

The `client` directory contains the WealthMap web application. It is a React 19 + TypeScript single-page application built with Vite. The frontend provides the user interface for authentication, financial data management, dashboards, and financial intelligence features exposed by the server API.

## Requirements

- Node.js 18 or newer
- npm
- The WealthMap server running locally for login, data, and analysis features

## Run the frontend

From the repository root:

```bash
cd client
npm install
npm run dev
```

Open the URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

The frontend expects the backend API at `http://localhost:5000/api/v1` by default. To use another API URL, create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

The backend must allow the frontend origin. The current server configuration allows `http://localhost:5173`.

## Start the complete application

Use two terminals. Start the backend first so the frontend can authenticate and load data.

Terminal 1:

```bash
cd server
npm install
# Configure server/.env and initialize the database as described in the root README.
npm run dev
```

Terminal 2:

```bash
cd client
npm install
npm run dev
```

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot module replacement. |
| `npm run build` | Type-check the project and create a production build in `dist/`. |
| `npm run preview` | Serve the production build locally for preview. |
| `npm run lint` | Run Oxlint against the client source. |

## What is implemented

### Authentication and application shell

- Register and login forms.
- JWT-based session state stored in `localStorage` under `wm_token` and `wm_user`.
- Automatic user restoration through `/auth/me` when the application loads.
- Protected routes redirect unauthenticated users to `/login`.
- Authenticated users visiting `/login` or `/register` are redirected to `/dashboard`.
- Automatic logout and redirect when the API returns HTTP 401.
- Responsive sidebar navigation, collapsible desktop sidebar, mobile menu, top bar, user profile, and logout action.
- Lazy-loaded pages with a loading fallback.

### Financial management

- **Dashboard**: monthly income, budget usage, remaining budget, safe-to-spend amount, risk score, health score, forecast information, and financial summaries.
- **Income**: create, edit, delete, and list income records with source, amount, frequency, and date.
- **Expenses**: create, edit, delete, search, and list expenses with category, amount, description, payment method, recurring status, and date.
- **Budgets**: view a selected month, create or update the total budget, and add, edit, or delete category budgets. Forecast data is shown alongside budget information.
- **Obligations**: create, edit, delete, list, and mark recurring or one-time financial obligations as paid or unpaid.
- **Goals**: create, edit, delete, and track goals, including adding contributions and changing goal status.

### Financial intelligence

- **Forecast**: projected spending, current spending, spending velocity, category projections, and potential budget overruns.
- **Risk**: risk score and level, risk-factor breakdown, and alerts.
- **Safe to Spend**: recommended spending amount based on budget, obligations, buffer, and remaining days.
- **Health score**: financial health breakdown across budget adherence, cash buffer, obligations, spending stability, savings, and goal progress.
- **What-If Simulator**: simulate a one-time expense or income change and compare current and simulated balance, risk, health, and budget values. Affected goals, obligations, and warnings are displayed.
- **Dependency Graph**: interactive React Flow graph showing relationships between income, cash, budgets, expenses, savings, buffers, obligations, goals, and risk.
- **AI Advice**: submit an optional financial question and receive recommendations and priority actions from the server AI endpoint.

## Routes

| Path | Screen | Access |
| --- | --- | --- |
| `/login` | Login | Public |
| `/register` | Registration | Public |
| `/dashboard` | Dashboard | Authenticated |
| `/income` | Income management | Authenticated |
| `/expenses` | Expense management | Authenticated |
| `/budgets` | Monthly and category budgets | Authenticated |
| `/obligations` | Financial obligations | Authenticated |
| `/goals` | Financial goals | Authenticated |
| `/forecast` | Forecast and risk view | Authenticated |
| `/risk` | Forecast and risk view | Authenticated |
| `/safe-to-spend` | Safe-to-spend view | Authenticated |
| `/dependency-graph` | Financial dependency graph | Authenticated |
| `/simulation` | What-if simulator | Authenticated |
| `/recommendations` | AI recommendations | Authenticated |

Unknown paths redirect to `/dashboard`.

## Frontend structure

```text
client/
  src/
    App.tsx                 Browser router, route guards, lazy loading
    main.tsx                React entry point
    index.css               Global design system and shared utilities
    components/layout/      Sidebar, top bar, responsive application shell
    context/AuthContext.tsx Authentication state and session actions
    pages/                  Route-level screens and page-specific styles
    services/api.ts         Axios client, API base URL, JWT and 401 handling
    types/index.ts          Shared frontend and API response types
    utils/formatters.ts     Currency and date formatting helpers
```

## API integration

All authenticated requests use the Axios client in `src/services/api.ts`. It:

1. Uses `VITE_API_URL` when provided, otherwise `http://localhost:5000/api/v1`.
2. Adds the JWT from `localStorage` as a Bearer token.
3. Redirects to `/login` and clears the stored session after a 401 response.

The frontend calls the server endpoints for `/auth`, `/users`, `/income`, `/expenses`, `/budgets`, `/obligations`, `/goals`, `/engine`, and `/ai`.

## Production build

Build and preview the client with:

```bash
npm run build
npm run preview
```

For deployment, set `VITE_API_URL` to the deployed server API URL before running the build. Vite embeds `VITE_*` variables into the generated client, so do not place secrets in the frontend environment file.



<!--  previous -->

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
