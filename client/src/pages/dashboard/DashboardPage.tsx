import React, { useEffect, useState } from 'react';
import {
  DollarSign, Target, TrendingDown, Shield,
  AlertTriangle, CheckCircle, Zap, BarChart2,
  ArrowUpRight, ArrowDownRight, RefreshCw, Award, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import { formatCurrency, formatCurrencyCompact, riskLevelColor } from '../../utils/formatters';
import type { FinancialState, ForecastResult, HealthScoreResult, RiskResult } from '../../types';
import './Dashboard.css';

// ── Stat Card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBg, trend, subtitle }) => (
  <div className="stat-card neu-raised fade-in">
    <div className="stat-card-top">
      <div className="stat-icon-wrap" style={{ background: iconBg }}>{icon}</div>
      {trend && (
        <span className={`stat-trend ${trend.positive ? 'stat-trend-up' : 'stat-trend-down'}`}>
          {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend.value}
        </span>
      )}
    </div>
    <div className="stat-number">{value}</div>
    <div className="stat-label">{title}</div>
    {subtitle && <div className="stat-subtitle">{subtitle}</div>}
  </div>
);

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip neu-raised-sm">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Beautiful Semicircular Health Gauge ─────────────────────────────────────────
const HealthGauge: React.FC<{ score: number }> = ({ score }) => {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = 80;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const offset = circumference - (clampedScore / 100) * circumference;

  const color =
    score >= 80 ? 'var(--success)' :
    score >= 60 ? 'var(--primary-500)' :
    score >= 40 ? 'var(--warning)' :
    'var(--danger)';

  const label =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Fair' :
    'Needs Work';

  return (
    <div className="health-gauge">
      <svg viewBox="0 0 200 115" className="gauge-svg">
        {/* Background track arc */}
        <path
          d="M 15 100 A 85 85 0 0 1 185 100"
          fill="none"
          stroke="var(--bg-subtle)"
          strokeWidth="15"
          strokeLinecap="round"
        />
        {/* Active progress arc */}
        <path
          d="M 15 100 A 85 85 0 0 1 185 100"
          fill="none"
          stroke={color}
          strokeWidth="15"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div className="gauge-center">
        <div className="gauge-score" style={{ color }}>{score}</div>
        <div className="gauge-label">{label}</div>
      </div>
      <div className="gauge-range">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
};

// ── Format Category Name cleanly for Charts ────────────────────────────────────
const formatCategoryLabel = (cat: string) => {
  if (!cat) return '';
  const c = cat.trim().toUpperCase();
  if (c === 'TRANSPORT') return 'Transport';
  if (c === 'ENTERTAINMENT') return 'Entertainment';
  if (c === 'UTILITIES') return 'Utilities';
  if (c === 'SHOPPING') return 'Shopping';
  if (c === 'FOOD') return 'Food';
  if (c === 'RENT') return 'Rent';
  return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
};

// ── Dashboard Page ─────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const [state, setState] = useState<FinancialState | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [health, setHealth] = useState<HealthScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [s, f, r, h] = await Promise.all([
        api.get('/engine/financial-state'),
        api.get('/engine/forecast'),
        api.get('/engine/risk'),
        api.get('/engine/health-score'),
      ]);
      setState(s.data.data);
      setForecast(f.data.data);
      setRisk(r.data.data);
      setHealth(h.data.data);
    } catch {
      setError('Failed to load dashboard data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return (
    <div className="dashboard-loading">
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
      <p>Loading your financial overview…</p>
    </div>
  );

  if (error) return (
    <div className="empty-state">
      <AlertTriangle size={48} color="var(--warning)" />
      <h3>{error}</h3>
      <button className="btn btn-primary" onClick={fetchAll}>
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  );

  // Clean Chart data — with full readable category names
  const chartData = forecast?.categoryForecasts?.map((c) => ({
    category: formatCategoryLabel(c.category),
    Budget: Number(c.budget),
    Actual: Number(c.spent),
    Projected: Number(c.projected),
  })) ?? [];

  const utilizationPct = state?.overallUtilization ?? 0;
  const activeAlerts = (risk?.alerts ?? []).filter((alert) => !alert.startsWith('✅'));

  // Safe-To-Spend Appreciation calculations
  const safeDaily = state?.safeDailySpending ?? 0;
  const avgDaily = state?.avgDailySpending ?? 0;
  const isSpendingSafely = safeDaily > 0 && avgDaily <= safeDaily;
  const dailySavings = Math.max(safeDaily - avgDaily, 0);
  const projectedExtraSavings = Math.round(dailySavings * (state?.daysRemainingInMonth ?? 1));
  const safeMarginPct = safeDaily > 0 ? Math.round((dailySavings / safeDaily) * 100) : 0;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="page-header">
        <div className="dashboard-header-row">
          <div>
            <h1>Dashboard</h1>
            <p>Your financial overview at a glance</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          title="Monthly Income"
          value={formatCurrencyCompact(state?.totalIncomeThisMonth || state?.declaredMonthlyIncome || 0)}
          icon={<DollarSign size={22} color="var(--success-dark)" />}
          iconBg="var(--success-light)"
          subtitle="This month"
        />
        <StatCard
          title="Budget Used"
          value={`${utilizationPct.toFixed(0)}%`}
          icon={<Target size={22} color="var(--primary-600)" />}
          iconBg="var(--primary-100)"
          subtitle={`${formatCurrencyCompact(state?.totalSpent ?? 0)} of ${formatCurrencyCompact(state?.totalBudget ?? 0)}`}
          trend={{ value: `${utilizationPct.toFixed(0)}% used`, positive: utilizationPct < 80 }}
        />
        <StatCard
          title="Remaining Budget"
          value={formatCurrencyCompact(state?.totalRemaining ?? 0)}
          icon={<TrendingDown size={22} color="var(--danger-dark)" />}
          iconBg="var(--danger-light)"
          subtitle="Left to spend"
        />
        <StatCard
          title="Safe to Spend"
          value={formatCurrencyCompact(state?.safeDailySpending ?? 0)}
          icon={<Zap size={22} color="var(--warning-dark)" />}
          iconBg="var(--warning-light)"
          subtitle="Per day recommended"
        />
        <StatCard
          title="Risk Score"
          value={`${risk?.riskScore ?? 0}/100`}
          icon={<Shield size={22} color={riskLevelColor(risk?.riskLevel ?? 'LOW')} />}
          iconBg={risk?.riskLevel === 'LOW' ? 'var(--success-light)' : risk?.riskLevel === 'MODERATE' ? 'var(--warning-light)' : 'var(--danger-light)'}
          subtitle={risk?.riskLevel ?? 'LOW'}
        />
        <StatCard
          title="Health Score"
          value={`${health?.total ?? 0}/100`}
          icon={<BarChart2 size={22} color="var(--primary-600)" />}
          iconBg="var(--primary-100)"
          subtitle="Financial fitness"
        />
      </div>

      {/* ── SAFE-TO-SPEND APPRECIATION BANNER ─────────────────────────────────── */}
      {isSpendingSafely && (
        <div className="appreciation-card fade-in">
          <div className="appreciation-content">
            <div className="appreciation-trophy">
              <Award size={28} />
            </div>
            <div>
              <div className="appreciation-badge-pill">
                <Sparkles size={13} /> SAFE-TO-SPEND APPRECIATION
              </div>
              <h3 className="appreciation-title">Outstanding Financial Discipline! 🎉</h3>
              <p className="appreciation-desc">
                You are spending an average of <strong>{formatCurrency(avgDaily)}/day</strong>, keeping you{' '}
                <strong style={{ color: 'var(--success-dark)' }}>{formatCurrency(dailySavings)}/day under</strong> your safe-to-spend limit of {formatCurrency(safeDaily)}/day.
                At this rate, you are on track to save an extra <strong style={{ color: 'var(--primary-700)' }}>{formatCurrency(projectedExtraSavings)}</strong> this month to fund your goals faster!
              </p>
            </div>
          </div>
          <div className="appreciation-metrics">
            <div className="appreciation-metric-item">
              <div className="appreciation-metric-val">+{safeMarginPct}%</div>
              <div className="appreciation-metric-label">Safe Margin</div>
            </div>
            <div className="appreciation-metric-item">
              <div className="appreciation-metric-val">{formatCurrency(dailySavings)}</div>
              <div className="appreciation-metric-label">Saved / Day</div>
            </div>
            <div className="appreciation-metric-item">
              <div className="appreciation-metric-val" style={{ color: 'var(--success-dark)' }}>
                +{formatCurrency(projectedExtraSavings)}
              </div>
              <div className="appreciation-metric-label">Extra Goal Fuel</div>
            </div>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="dashboard-grid">
        {/* Budget vs Actual Chart (Wide: spans 2 columns) */}
        <div className="neu-raised dashboard-card dashboard-card-wide">
          <div className="card-header">
            <h3>Budget vs Actual Spending</h3>
            <span className="badge badge-primary">This Month</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-subtle)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Budget" fill="var(--primary-200)" radius={[6,6,0,0]} name="Budget" />
                <Bar dataKey="Actual" fill="var(--primary-500)" radius={[6,6,0,0]} name="Actual" />
                <Bar dataKey="Projected" fill="var(--warning)" radius={[6,6,0,0]} name="Projected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: 240 }}>
              <BarChart2 size={36} color="var(--text-muted)" />
              <p>No budget data yet. Set up a budget to see charts.</p>
            </div>
          )}
        </div>

        {/* Row 1, Col 1: Health Score Gauge */}
        <div className="neu-raised dashboard-card">
          <div className="card-header">
            <h3>Financial Health</h3>
            <span className="badge badge-success">{health?.grade ?? 'Good'}</span>
          </div>
          <HealthGauge score={health?.total ?? 0} />
        </div>

        {/* Row 1, Col 2: Alerts & Insights */}
        <div className="neu-raised dashboard-card">
          <div className="card-header">
            <h3>Alerts & Insights</h3>
            <span className="badge badge-danger">{activeAlerts.length}</span>
          </div>
          <div className="alerts-list">
            {activeAlerts.length === 0 ? (
              <div className="alert-bar alert-bar-success">
                <CheckCircle size={16} />
                All systems normal. Your finances look healthy!
              </div>
            ) : (
              activeAlerts.slice(0, 5).map((alert, i) => (
                <div
                  key={i}
                  className={`alert-bar alert-bar-${alert.startsWith('🔴') ? 'danger' : alert.startsWith('⚠️') ? 'warning' : 'primary'}`}
                >
                  <AlertTriangle size={15} />
                  <span>{alert}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Row 2, Col 1: Month-End Forecast */}
        <div className="neu-raised dashboard-card">
          <div className="card-header">
            <h3>Month-End Forecast</h3>
          </div>
          {forecast ? (
            <div className="forecast-summary">
              <div className="forecast-row">
                <span className="text-muted">Projected Monthly Expense</span>
                <strong>{formatCurrency(forecast.projectedMonthlyExpense)}</strong>
              </div>
              <div className="forecast-row">
                <span className="text-muted">Current Budget</span>
                <strong>{formatCurrency(forecast.currentBudget)}</strong>
              </div>
              <div className="forecast-row">
                <span className="text-muted">Status</span>
                <span className={`badge ${forecast.willExceedBudget ? 'badge-danger' : 'badge-success'}`}>
                  {forecast.willExceedBudget ? `Over by ${formatCurrency(forecast.expectedExcess)}` : 'Within Budget'}
                </span>
              </div>
              <div className="forecast-row">
                <span className="text-muted">Spending Pace</span>
                <span style={{ color: forecast.velocityChangePercent > 0 ? 'var(--danger-dark)' : 'var(--success-dark)', fontWeight: 600 }}>
                  {forecast.velocityChangePercent > 0 ? `+${forecast.velocityChangePercent}% faster` : `${Math.abs(forecast.velocityChangePercent)}% slower`} vs last month
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted">No forecast data available.</p>
          )}
        </div>

        {/* Row 2, Col 2: Upcoming Obligations (Balances the grid perfectly!) */}
        <div className="neu-raised dashboard-card">
          <div className="card-header">
            <h3>Upcoming Obligations</h3>
            <span className="badge badge-primary">{(state?.upcomingObligations ?? []).length} Due</span>
          </div>
          <div className="obligations-list">
            {(state?.upcomingObligations ?? []).length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <CheckCircle size={28} color="var(--success)" />
                <p>No upcoming obligations</p>
              </div>
            ) : (
              state?.upcomingObligations?.slice(0, 4).map((ob) => (
                <div className="obligation-item" key={ob.id}>
                  <div>
                    <span className="obligation-name">{ob.name}</span>
                    <span className="obligation-type badge badge-primary">{ob.type}</span>
                  </div>
                  <strong>{formatCurrency(Number(ob.amount))}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
