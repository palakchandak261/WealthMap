import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import type { FinancialState, RiskResult, ForecastResult, SafeToSpendResult, HealthScoreResult } from '../../types';
import './Risk.css';

const categoryStatusColor = (status: string) => {
  if (status === 'EXCEEDED') return 'var(--danger)';
  if (status === 'LIMIT_REACHED') return 'var(--danger)';
  if (status === 'CRITICAL_WARNING') return 'var(--warning)';
  if (status === 'WARNING') return 'var(--warning)';
  return 'var(--success)';
};

const RiskPage: React.FC = () => {
  const { pathname } = useLocation();
  const view = pathname === '/forecast' ? 'forecast' : pathname === '/safe-to-spend' ? 'safe' : 'risk';
  const pageCopy = {
    risk: { title: 'Risk overview', description: 'Understand the factors shaping your financial risk and health.' },
    forecast: { title: 'Spending forecast', description: 'See how your current pace may shape the rest of the month.' },
    safe: { title: 'Safe to spend', description: 'Plan today’s spending after budgets and upcoming commitments.' },
  }[view];
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [financialState, setFinancialState] = useState<FinancialState | null>(null);
  const [safeToSpend, setSafeToSpend] = useState<SafeToSpendResult | null>(null);
  const [health, setHealth] = useState<HealthScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [r, f, s, h, state] = await Promise.all([
        api.get('/engine/risk'),
        api.get('/engine/forecast'),
        api.get('/engine/safe-to-spend'),
        api.get('/engine/health-score'),
        api.get('/engine/financial-state'),
      ]);
      setRisk(r.data.data);
      setForecast(f.data.data);
      setSafeToSpend(s.data.data);
      setHealth(h.data.data);
      setFinancialState(state.data.data);
    } catch {
      setError('Failed to load risk data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

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

  const riskColor = riskLevelColor(risk?.riskLevel ?? 'LOW');
  const riskScore = risk?.riskScore ?? 0;
  const activeAlerts = (risk?.alerts ?? []).filter((alert) => !alert.startsWith('✅'));

  // Risk breakdown bar data
  const breakdownData = risk?.components ? [
    { name: 'Budget', value: risk.components.budgetRisk, fill: 'var(--primary-500)' },
    { name: 'Cash Flow', value: risk.components.cashFlowRisk, fill: 'var(--success)' },
    { name: 'Obligations', value: risk.components.obligationRisk, fill: 'var(--warning)' },
    { name: 'Velocity', value: risk.components.velocityRisk, fill: 'var(--danger)' },
    { name: 'Goals', value: risk.components.goalRisk, fill: 'var(--primary-300)' },
  ] : [];

  // Health breakdown bars
  const healthData = health?.components ? [
    { name: 'Budget', value: health.components.budgetAdherence.score },
    { name: 'Cash', value: health.components.cashBuffer.score },
    { name: 'Obligations', value: health.components.obligationCoverage.score },
    { name: 'Stability', value: health.components.spendingStability.score },
    { name: 'Savings', value: health.components.savingsRate.score },
    { name: 'Goals', value: health.components.goalProgress.score },
  ] : [];

  return (
    <div className="risk-page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1>{pageCopy.title}</h1>
            <p>{pageCopy.description}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <nav className="insight-tabs" aria-label="Financial insights">
        <NavLink to="/forecast">Forecast</NavLink>
        <NavLink to="/risk">Risk</NavLink>
        <NavLink to="/safe-to-spend">Safe to spend</NavLink>
      </nav>

      <div className={`risk-top-grid risk-top-grid-${view}`}>
        {/* Risk Score Gauge */}
        {view === 'risk' && <div className="neu-raised risk-gauge-card fade-in">
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
              <div className={`risk-level-badge risk-level-${risk?.riskLevel?.toLowerCase()}`}>
                {risk?.riskLevel ?? 'LOW'}
              </div>
            </div>
          </div>
          <div className="risk-range-labels">
            <span style={{ color: 'var(--success-dark)' }}>Low</span>
            <span style={{ color: 'var(--warning-dark)' }}>Moderate</span>
            <span style={{ color: 'var(--danger-dark)' }}>High</span>
            <span style={{ color: 'var(--critical)' }}>Critical</span>
          </div>
        </div>}

        {/* Safe to Spend */}
        {view === 'safe' && <div className="neu-raised safe-spend-card fade-in">
          <div className="card-header-plain">
            <Zap size={18} color="var(--warning-dark)" />
            <h3>Safe to Spend Today</h3>
          </div>
          {safeToSpend && (
            <div className="safe-spend-content">
              <div className="safe-spend-amount">{formatCurrency(safeToSpend.safeDailySpending)}</div>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>per day recommended</p>
              <div className="safe-spend-breakdown">
                <div className="safe-row">
                  <span className="text-muted">Remaining Budget</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(safeToSpend.budgetRemaining)}</span>
                </div>
                <div className="safe-row">
                  <span className="text-muted">Obligations (upcoming)</span>
                  <span style={{ color: 'var(--danger-dark)', fontWeight: 600 }}>
                    − {formatCurrency(safeToSpend.upcomingObligations)}
                  </span>
                </div>
                <div className="safe-row">
                  <span className="text-muted">Safe amount for the rest of this month</span>
                  <span style={{ color: 'var(--success-dark)', fontWeight: 600 }}>
                    {formatCurrency(safeToSpend.safeSpendableAmount)}
                  </span>
                </div>
                <div className="divider" style={{ margin: '0.5rem 0' }} />
                <div className="safe-row">
                  <span className="text-muted">Days Remaining</span>
                  <span style={{ fontWeight: 700 }}>{safeToSpend.daysRemaining}</span>
                </div>
              </div>
            </div>
          )}
        </div>}

        {/* Month-End Forecast */}
        {view === 'forecast' && <div className="neu-raised forecast-card fade-in">
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
                  <span style={{ fontWeight: 700 }}>{formatCurrency(financialState?.totalSpent ?? 0)}</span>
                </div>
                <div className="forecast-meta-item">
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Avg Daily</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(financialState?.avgDailySpending ?? 0)}</span>
                </div>
                <div className="forecast-meta-item">
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Days Left</span>
                  <span style={{ fontWeight: 700 }}>{financialState?.daysRemainingInMonth ?? 0}</span>
                </div>
                <div className="forecast-meta-item">
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Velocity</span>
                  <span style={{ fontWeight: 700, color: forecast.velocityChangePercent > 0 ? 'var(--danger-dark)' : 'var(--success-dark)' }}>
                    {forecast.velocityChangePercent > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {forecast.velocityChangePercent > 0 ? '+' : ''}{forecast.velocityChangePercent}%
                  </span>
                </div>
              </div>
              {forecast.expectedExcess > 0 ? (
                <div className="alert-bar alert-bar-danger" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  <AlertTriangle size={15} />
                  Projected overrun of {formatCurrency(forecast.expectedExcess)}
                </div>
              ) : (
                <div className="alert-bar alert-bar-success" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  <CheckCircle size={15} />
                  On track — within budget!
                </div>
              )}
            </div>
          )}
        </div>}
      </div>

      {view !== 'safe' && <div className={`risk-bottom-grid risk-bottom-grid-${view}`}>

        {/* Risk Alerts */}
        {view === 'risk' && <div className="neu-raised risk-alerts-card fade-in">
          <div className="card-header-plain">
            <AlertTriangle size={18} color="var(--warning-dark)" />
            <h3>Active Alerts <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>{activeAlerts.length}</span></h3>
          </div>
          <div className="alerts-scroll">
            {activeAlerts.length === 0 ? (
              <div className="alert-bar alert-bar-success">
                <CheckCircle size={16} /> All clear — no risk alerts!
              </div>
            ) : (
              activeAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`alert-bar alert-bar-${alert.startsWith('🔴') ? 'danger' : alert.startsWith('⚠️') ? 'warning' : 'primary'}`}
                  style={{ marginBottom: '0.5rem' }}
                >
                  <AlertTriangle size={14} />
                  <div>
                    <div style={{ fontSize: '0.82rem' }}>{alert}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>}

        {/* Risk Breakdown Chart */}
        {view === 'risk' && <div className="neu-raised risk-breakdown-card fade-in">
          <div className="card-header-plain">
            <Activity size={18} color="var(--primary-500)" />
            <h3>Risk Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={breakdownData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--bg-subtle)" />
              <XAxis type="number" domain={[0, 30]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={(value) => [`${value ?? 0} pts`, 'Score']} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {breakdownData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>}

        {/* Health Score Breakdown */}
        {view === 'risk' && <div className="neu-raised risk-health-card fade-in">
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
        </div>}

        {/* Category Forecast Table */}
        {view === 'forecast' && <div className="neu-raised risk-cat-card fade-in">
          <div className="card-header-plain" style={{ marginBottom: '1rem' }}>
            <BarChart2 size={18} color="var(--primary-500)" />
            <h3>Category Forecast</h3>
          </div>
          {(forecast?.categoryForecasts ?? []).length === 0 ? (
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
                  {forecast?.categoryForecasts.map((cat, i) => {
                    const utilization = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
                    const status = cat.willExceed ? 'EXCEEDED' : utilization >= 80 ? 'WARNING' : 'NORMAL';
                    const color = categoryStatusColor(status);
                    return (
                      <tr key={i}>
                        <td><strong>{cat.category}</strong></td>
                        <td>{formatCurrency(cat.spent)}</td>
                        <td>{formatCurrency(cat.budget)}</td>
                        <td style={{ fontWeight: 700, color }}>{formatCurrency(cat.projected)}</td>
                        <td style={{ width: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar-wrap" style={{ flex: 1 }}>
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${Math.min(100, utilization)}%`, background: color }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', color }}>{utilization.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            status === 'EXCEEDED' ? 'badge-danger'
                            : status.includes('WARNING') ? 'badge-warning'
                            : 'badge-success'
                          }`}>{status.replace('_', ' ')}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>}
      </div>}
    </div>
  );
};

export default RiskPage;
