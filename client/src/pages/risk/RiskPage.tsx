import React, { useEffect, useState } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, RefreshCw,
  TrendingUp, TrendingDown, Zap, BarChart2, Activity,
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import api from '../../services/api';
import { formatCurrency, riskLevelColor } from '../../utils/formatters';
import type { RiskResult, ForecastResult, SafeToSpendResult, HealthScoreResult } from '../../types';
import './Risk.css';

const categoryStatusColor = (status: string) => {
  if (status === 'EXCEEDED') return 'var(--danger)';
  if (status === 'LIMIT_REACHED') return 'var(--danger)';
  if (status === 'CRITICAL_WARNING') return 'var(--warning)';
  if (status === 'WARNING') return 'var(--warning)';
  return 'var(--success)';
};

const RiskPage: React.FC = () => {
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [safeToSpend, setSafeToSpend] = useState<SafeToSpendResult | null>(null);
  const [health, setHealth] = useState<HealthScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [r, f, s, h] = await Promise.all([
        api.get('/engine/risk'),
        api.get('/engine/forecast'),
        api.get('/engine/safe-to-spend'),
        api.get('/engine/health-score'),
      ]);
      setRisk(r.data.data);
      setForecast(f.data.data);
      setSafeToSpend(s.data.data);
      setHealth(h.data.data);
    } catch {
      setError('Failed to load risk data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
      <p>Calculating risk profile…</p>
    </div>
  );

  if (error) return (
    <div className="empty-state">
      <AlertTriangle size={48} color="var(--warning)" />
      <h3>{error}</h3>
      <button className="btn btn-primary" onClick={fetchAll}><RefreshCw size={16} /> Retry</button>
    </div>
  );

  const riskColor = riskLevelColor(risk?.level ?? 'LOW');
  const riskScore = risk?.score ?? 0;

  // Radial gauge data
  const gaugeData = [{ value: riskScore, fill: riskColor }];

  // Risk breakdown bar data
  const breakdownData = risk?.breakdown ? [
    { name: 'Budget', value: risk.breakdown.budget, fill: '#7B8CDE' },
    { name: 'Cash Flow', value: risk.breakdown.cashFlow, fill: '#4ECDC4' },
    { name: 'Obligations', value: risk.breakdown.obligation, fill: '#FFB347' },
    { name: 'Velocity', value: risk.breakdown.velocity, fill: '#FF6B6B' },
    { name: 'Goals', value: risk.breakdown.goal, fill: '#A5B4FC' },
  ] : [];

  // Health breakdown bars
  const healthData = health?.breakdown ? [
    { name: 'Budget', value: health.breakdown.budgetAdherence },
    { name: 'Cash', value: health.breakdown.cashBuffer },
    { name: 'Obligations', value: health.breakdown.obligationCoverage },
    { name: 'Stability', value: health.breakdown.spendingStability },
    { name: 'Savings', value: health.breakdown.savings },
    { name: 'Goals', value: health.breakdown.goalProgress },
  ] : [];

  return (
    <div className="risk-page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1>Risk & Forecast</h1>
            <p>Your financial risk profile, forecast, and safe-to-spend analysis</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Top row: Risk Gauge + Safe to Spend + Forecast */}
      <div className="risk-top-grid">

        {/* Risk Score Gauge */}
        <div className="neu-raised risk-gauge-card fade-in">
          <div className="card-header-plain">
            <Shield size={18} color={riskColor} />
            <h3>Risk Score</h3>
          </div>
          <div className="risk-gauge-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart
                cx="50%" cy="60%"
                innerRadius="60%" outerRadius="85%"
                startAngle={180} endAngle={0}
                data={[{ value: 100, fill: 'var(--bg-subtle)' }, { value: riskScore, fill: riskColor }]}
              >
                <RadialBar dataKey="value" cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="risk-gauge-center">
              <div className="risk-score-number" style={{ color: riskColor }}>{riskScore}</div>
              <div className="risk-score-label">out of 100</div>
              <div className={`risk-level-badge risk-level-${risk?.level?.toLowerCase()}`}>
                {risk?.level ?? 'LOW'}
              </div>
            </div>
          </div>
          <div className="risk-range-labels">
            <span style={{ color: 'var(--success-dark)' }}>Low</span>
            <span style={{ color: 'var(--warning-dark)' }}>Moderate</span>
            <span style={{ color: 'var(--danger-dark)' }}>High</span>
            <span style={{ color: 'var(--critical)' }}>Critical</span>
          </div>
        </div>

        {/* Safe to Spend */}
        <div className="neu-raised safe-spend-card fade-in">
          <div className="card-header-plain">
            <Zap size={18} color="var(--warning-dark)" />
            <h3>Safe to Spend Today</h3>
          </div>
          {safeToSpend && (
            <div className="safe-spend-content">
              <div className="safe-spend-amount">{formatCurrency(safeToSpend.safeToSpend)}</div>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>per day recommended</p>
              <div className="safe-spend-breakdown">
                <div className="safe-row">
                  <span className="text-muted">Remaining Budget</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(safeToSpend.remainingBudget)}</span>
                </div>
                <div className="safe-row">
                  <span className="text-muted">Obligations (upcoming)</span>
                  <span style={{ color: 'var(--danger-dark)', fontWeight: 600 }}>
                    − {formatCurrency(safeToSpend.obligations)}
                  </span>
                </div>
                <div className="safe-row">
                  <span className="text-muted">Safety Buffer</span>
                  <span style={{ color: 'var(--warning-dark)', fontWeight: 600 }}>
                    − {formatCurrency(safeToSpend.buffer)}
                  </span>
                </div>
                <div className="divider" style={{ margin: '0.5rem 0' }} />
                <div className="safe-row">
                  <span className="text-muted">Days Remaining</span>
                  <span style={{ fontWeight: 700 }}>{safeToSpend.daysLeft}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Month-End Forecast */}
        <div className="neu-raised forecast-card fade-in">
          <div className="card-header-plain">
            <TrendingUp size={18} color="var(--primary-500)" />
            <h3>Month-End Forecast</h3>
          </div>
          {forecast && (
            <div className="forecast-detail">
              <div className="forecast-big-number">
                {formatCurrency(forecast.projectedMonthlyExpense)}
                <span className="forecast-label">projected total</span>
              </div>
              <div className="forecast-meta-grid">
                <div className="forecast-meta-item">
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Current Spend</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(forecast.currentSpend)}</span>
                </div>
                <div className="forecast-meta-item">
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Avg Daily</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(forecast.avgDailySpend)}</span>
                </div>
                <div className="forecast-meta-item">
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Days Left</span>
                  <span style={{ fontWeight: 700 }}>{forecast.daysInMonth - forecast.daysElapsed}</span>
                </div>
                <div className="forecast-meta-item">
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Velocity</span>
                  <span style={{ fontWeight: 700, color: forecast.spendingVelocity > 1 ? 'var(--danger-dark)' : 'var(--success-dark)' }}>
                    {forecast.spendingVelocity > 1 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {forecast.spendingVelocity.toFixed(2)}x
                  </span>
                </div>
              </div>
              {forecast.potentialOverrun > 0 ? (
                <div className="alert-bar alert-bar-danger" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  <AlertTriangle size={15} />
                  Projected overrun of {formatCurrency(forecast.potentialOverrun)}
                </div>
              ) : (
                <div className="alert-bar alert-bar-success" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  <CheckCircle size={15} />
                  On track — within budget!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Second row: Alerts + Risk Breakdown Chart */}
      <div className="risk-bottom-grid">

        {/* Risk Alerts */}
        <div className="neu-raised risk-alerts-card fade-in">
          <div className="card-header-plain">
            <AlertTriangle size={18} color="var(--warning-dark)" />
            <h3>Active Alerts <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>{risk?.alerts?.length ?? 0}</span></h3>
          </div>
          <div className="alerts-scroll">
            {(risk?.alerts ?? []).length === 0 ? (
              <div className="alert-bar alert-bar-success">
                <CheckCircle size={16} /> All clear — no risk alerts!
              </div>
            ) : (
              risk?.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`alert-bar alert-bar-${
                    alert.severity === 'CRITICAL' ? 'critical'
                    : alert.severity === 'HIGH' ? 'danger'
                    : alert.severity === 'MEDIUM' ? 'warning'
                    : 'primary'
                  }`}
                  style={{ marginBottom: '0.5rem' }}
                >
                  <AlertTriangle size={14} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{alert.type}</div>
                    <div style={{ fontSize: '0.82rem' }}>{alert.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Risk Breakdown Chart */}
        <div className="neu-raised risk-breakdown-card fade-in">
          <div className="card-header-plain">
            <Activity size={18} color="var(--primary-500)" />
            <h3>Risk Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={breakdownData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--bg-subtle)" />
              <XAxis type="number" domain={[0, 30]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={(v: number) => [`${v} pts`, 'Score']} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {breakdownData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Health Score Breakdown */}
        <div className="neu-raised risk-health-card fade-in">
          <div className="card-header-plain">
            <BarChart2 size={18} color="var(--success-dark)" />
            <h3>Health Score Breakdown</h3>
          </div>
          <div className="health-breakdown-list">
            {healthData.map((item, i) => (
              <div key={i} className="health-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.value >= 70 ? 'var(--success-dark)' : item.value >= 40 ? 'var(--warning-dark)' : 'var(--danger-dark)' }}>
                    {item.value}/100
                  </span>
                </div>
                <div className="progress-bar-wrap">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${item.value}%`,
                      background: item.value >= 70 ? 'var(--success)' : item.value >= 40 ? 'var(--warning)' : 'var(--danger)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Forecast Table */}
        <div className="neu-raised risk-cat-card fade-in" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header-plain" style={{ marginBottom: '1rem' }}>
            <BarChart2 size={18} color="var(--primary-500)" />
            <h3>Category Forecast</h3>
          </div>
          {(forecast?.categories ?? []).length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
              No category data. Set up a budget with categories first.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Spent</th>
                    <th>Limit</th>
                    <th>Projected</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast?.categories.map((cat, i) => {
                    const color = categoryStatusColor(cat.status);
                    return (
                      <tr key={i}>
                        <td><strong>{cat.category}</strong></td>
                        <td>{formatCurrency(cat.spent)}</td>
                        <td>{formatCurrency(cat.limit)}</td>
                        <td style={{ fontWeight: 700, color }}>{formatCurrency(cat.projected)}</td>
                        <td style={{ width: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar-wrap" style={{ flex: 1 }}>
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${Math.min(100, cat.utilizationPct)}%`, background: color }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', color }}>{cat.utilizationPct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            cat.status === 'EXCEEDED' || cat.status === 'LIMIT_REACHED' ? 'badge-danger'
                            : cat.status.includes('WARNING') ? 'badge-warning'
                            : 'badge-success'
                          }`}>{cat.status.replace('_', ' ')}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskPage;
