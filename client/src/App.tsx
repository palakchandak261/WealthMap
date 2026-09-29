import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import './index.css';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/auth/RegisterPage'));
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'));
const IncomePage         = lazy(() => import('./pages/income/IncomePage'));
const ExpensesPage       = lazy(() => import('./pages/expenses/ExpensesPage'));
const BudgetsPage        = lazy(() => import('./pages/budgets/BudgetsPage'));
const ObligationsPage    = lazy(() => import('./pages/obligations/ObligationsPage'));
const GoalsPage          = lazy(() => import('./pages/goals/GoalsPage'));
const RiskPage           = lazy(() => import('./pages/risk/RiskPage'));
const SimulationPage     = lazy(() => import('./pages/simulation/SimulationPage'));
const AIPage             = lazy(() => import('./pages/ai/AIRecommendationsPage'));
const DependencyGraphPage = lazy(() => import('./pages/dependencyGraph/DependencyGraphPage'));

// ── Loading fallback ───────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
  </div>
);

// ── Protected route guard ──────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// ── Public route guard (redirect to dashboard if already logged in) ────────────
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// ── App Router ────────────────────────────────────────────────────────────────
const AppRouter: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public auth routes */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected app routes — wrapped in AppLayout */}
      <Route path="/" element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><Navigate to="/dashboard" replace /></Suspense></AppLayout></ProtectedRoute>} />

      <Route path="/dashboard"      element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><DashboardPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/income"         element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><IncomePage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/expenses"       element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/budgets"        element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><BudgetsPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/obligations"    element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><ObligationsPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/goals"          element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><GoalsPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/forecast"       element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><RiskPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/risk"           element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><RiskPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/safe-to-spend"  element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><RiskPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/dependency-graph" element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><DependencyGraphPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/simulation"     element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><SimulationPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/recommendations" element={<ProtectedRoute><AppLayout><Suspense fallback={<PageLoader />}><AIPage /></Suspense></AppLayout></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

// ── Root App ──────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
