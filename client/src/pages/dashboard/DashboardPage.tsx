import React, { useEffect, useState } from 'react';
import {
  DollarSign, Target, TrendingDown, Shield,
  AlertTriangle, CheckCircle, Zap, BarChart2,
  ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts';
import api from '../../services/api';
import { formatCurrency, formatCurrencyCompact, riskLevelColor } from '../../utils/formatters';
import type { FinancialState, ForecastResult, RiskResult } from '../../types';
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

// ── Dashboard Page ─────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const [state, setState] = useState<FinancialState | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [s, f, r] = await Promise.all([
        api.get('/engine/financial-state'),
        api.get('/engine/forecast'),
        api.get('/engine/risk'),
      ]);
      setState(s.data.data);
      setForecast(f.data.data);
      setRisk(r.data.data);
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

  // Chart data — budget vs actual by category
  const chartData = forecast?.categories?.map((c) => ({
    category: c.category.slice(0, 8),
    Budget: Number(c.limit),
    Actual: Number(c.spent),
    Projected: Number(c.projected),
  })) ?? [];

  const utilizationPct = state?.budget?.utilizationPct ?? 0;

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
          value={formatCurrencyCompact(state?.income?.monthly ?? 0)}
          icon={<DollarSign size={22} color="#4ECDC4" />}
          iconBg="var(--success-light)"
          subtitle="This month"
        />
        <StatCard
          title="Budget Used"
          value={`${utilizationPct.toFixed(0)}%`}
          icon={<Target size={22} color="#7B8CDE" />}
          iconBg="var(--primary-100)"
          subtitle={`${formatCurrencyCompact(state?.budget?.spent ?? 0)} of ${formatCurrencyCompact(state?.budget?.total ?? 0)}`}
          trend={{ value: `${utilizationPct.toFixed(0)}% used`, positive: utilizationPct < 80 }}
        />
        <StatCard
          title="Remaining Budget"
          value={formatCurrencyCompact(state?.budget?.remaining ?? 0)}
          icon={<TrendingDown size={22} color="#FF6B6B" />}
          iconBg="var(--danger-light)"
          subtitle="Left to spend"
        />
        <StatCard
          title="Safe to Spend"
          value={formatCurrencyCompact(state?.safeToSpend ?? 0)}
          icon={<Zap size={22} color="#FFB347" />}
          iconBg="var(--warning-light)"
          subtitle="Per day recommended"
        />
        <StatCard
          title="Risk Score"
          value={`${risk?.score ?? 0}/100`}
          icon={<Shield size={22} color={riskLevelColor(risk?.level ?? 'LOW')} />}
          iconBg={risk?.level === 'LOW' ? 'var(--success-light)' : risk?.level === 'MODERATE' ? 'var(--warning-light)' : 'var(--danger-light)'}
          subtitle={risk?.level ?? 'LOW'}
        />
        <StatCard
          title="Health Score"
          value={`${state?.healthScore ?? 0}/100`}
          icon={<BarChart2 size={22} color="#7B8CDE" />}
          iconBg="var(--primary-100)"
          subtitle="Financial fitness"
        />
      </div>

      {/* Main content grid */}
      <div className="dashboard-grid">
        {/* Budget vs Actual Chart */}
        <div className="neu-raised dashboard-card dashboard-card-wide">
          <div className="card-header">
            <h3>Budget vs Actual Spending</h3>
            <span className="badge badge-primary">This Month</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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

        {/* Health Score Gauge */}
        <div className="neu-raised dashboard-card">
          <div className="card-header">
            <h3>Financial Health</h3>
          </div>
          <HealthGauge score={state?.healthScore ?? 0} />
        </div>

        {/* Alerts */}
        <div className="neu-raised dashboard-card">
          <div className="card-header">
            <h3>Alerts & Insights</h3>
            <span className="badge badge-danger">{risk?.alerts?.length ?? 0}</span>
          </div>
          <div className="alerts-list">
            {(risk?.alerts ?? []).length === 0 ? (
              <div className="alert-bar alert-bar-success">
                <CheckCircle size={16} />
                All systems normal. Your finances look healthy!
              </div>
            ) : (
              risk?.alerts?.slice(0, 5).map((alert, i) => (
                <div
                  key={i}
                  className={`alert-bar alert-bar-${
                    alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'danger'
                    : alert.severity === 'MEDIUM' ? 'warning'
                    : 'primary'
                  }`}
                >
                  <AlertTriangle size={15} />
                  <span>{alert.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Forecast Summary */}
        <div className="neu-raised dashboard-card">
          <div className="card-header">
            <h3>Month-End Forecast</h3>
          </div>
          {forecast ? (
            <div className="forecast-summary">
              <div className="forecast-row">
                <span>Projected Total</span>
                <strong>{formatCurrency(forecast.projectedMonthlyExpense)}</strong>
              </div>
              <div className="forecast-row">
                <span>Current Spend</span>
                <strong>{formatCurrency(forecast.currentSpend)}</strong>
              </div>
              <div className="forecast-row">
                <span>Avg Daily Spend</span>
                <strong>{formatCurrency(forecast.avgDailySpend)}</strong>
              </div>
              {forecast.potentialOverrun > 0 && (
                <div className="alert-bar alert-bar-danger" style={{ marginTop: '0.75rem' }}>
                  <AlertTriangle size={15} />
                  Potential overrun: {formatCurrency(forecast.potentialOverrun)}
                </div>
              )}
              {forecast.potentialOverrun <= 0 && (
                <div className="alert-bar alert-bar-success" style={{ marginTop: '0.75rem' }}>
                  <CheckCircle size={15} />
                  On track — within budget!
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted">No forecast data available.</p>
          )}
        </div>

        {/* Upcoming Obligations */}
        <div className="neu-raised dashboard-card">
          <div className="card-header">
            <h3>Upcoming Obligations</h3>
          </div>
          <div className="obligations-list">
            {(state?.obligations?.upcoming ?? []).length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <CheckCircle size={28} color="var(--success)" />
                <p>No upcoming obligations</p>
              </div>
            ) : (
              state?.obligations?.upcoming?.slice(0, 4).map((ob) => (
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

// ── Health Gauge ───────────────────────────────────────────────────────────────
const HealthGauge: React.FC<{ score: number }> = ({ score }) => {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = 80;
  const circumference = Math.PI * radius; // half circle
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
      <svg viewBox="0 0 200 110" className="gauge-svg">
        {/* Background arc */}
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke="var(--bg-subtle)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
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

export default DashboardPage;
