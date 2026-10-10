import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import './index.css';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
const HomePage          = lazy(() => import('./pages/home/HomePage'));
const LoginPage         = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage      = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage= lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage   = lazy(() => import('./pages/auth/VerifyEmailPage'));
const OnboardingPage    = lazy(() => import('./pages/onboarding/OnboardingPage'));
const DashboardPage     = lazy(() => import('./pages/dashboard/DashboardPage'));
const IncomePage        = lazy(() => import('./pages/income/IncomePage'));
const ExpensesPage      = lazy(() => import('./pages/expenses/ExpensesPage'));
const BudgetsPage       = lazy(() => import('./pages/budgets/BudgetsPage'));
const ObligationsPage   = lazy(() => import('./pages/obligations/ObligationsPage'));
const GoalsPage         = lazy(() => import('./pages/goals/GoalsPage'));
const RiskPage          = lazy(() => import('./pages/risk/RiskPage'));
const SimulationPage    = lazy(() => import('./pages/simulation/SimulationPage'));
const AIPage            = lazy(() => import('./pages/ai/AIRecommendationsPage'));
const DependencyGraphPage = lazy(() => import('./pages/dependencyGraph/DependencyGraphPage'));

// ── Loading fallback ───────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '60vh', flexDirection: 'column', gap: '1rem'
  }}>
    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
  </div>
);

// ── Route guards ───────────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; onboarding?: boolean }> = ({
  children,
  onboarding = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (onboarding && user?.onboardingComplete) return <Navigate to="/dashboard" replace />;
  if (!onboarding && !user?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={user?.onboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  return <>{children}</>;
};

// Helper to wrap a page in AppLayout + ProtectedRoute
const App_: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute>
    <AppLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppLayout>
  </ProtectedRoute>
);

// ── Router ────────────────────────────────────────────────────────────────────
const AppRouter: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>

      {/* ── Public marketing home ── */}
      <Route path="/"          element={<HomePage />} />

      {/* ── Auth (redirect to dashboard if already logged in) ── */}
      <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/verify-email"    element={<VerifyEmailPage />} />

      {/* ── Onboarding (protected, after first register) ── */}
      <Route path="/onboarding" element={<ProtectedRoute onboarding><Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense></ProtectedRoute>} />

      {/* ── Protected app pages ── */}
      <Route path="/dashboard"        element={<App_><DashboardPage /></App_>} />
      <Route path="/income"           element={<App_><IncomePage /></App_>} />
      <Route path="/expenses"         element={<App_><ExpensesPage /></App_>} />
      <Route path="/budgets"          element={<App_><BudgetsPage /></App_>} />
      <Route path="/obligations"      element={<App_><ObligationsPage /></App_>} />
      <Route path="/goals"            element={<App_><GoalsPage /></App_>} />
      <Route path="/forecast"         element={<App_><RiskPage /></App_>} />
      <Route path="/risk"             element={<App_><RiskPage /></App_>} />
      <Route path="/safe-to-spend"    element={<App_><RiskPage /></App_>} />
      <Route path="/dependency-graph" element={<App_><DependencyGraphPage /></App_>} />
      <Route path="/simulation"       element={<App_><SimulationPage /></App_>} />
      <Route path="/recommendations"  element={<App_><AIPage /></App_>} />

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
