import React, { useState } from 'react';
import {
  Zap, AlertTriangle, CheckCircle, TrendingUp,
  TrendingDown, Target, Shield, RefreshCw, Play,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import type { SimulationResult } from '../../types';
import './Simulation.css';

const CATEGORIES = [
  'FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH',
  'EDUCATION', 'UTILITIES', 'RENT', 'EMI', 'INSURANCE', 'TRAVEL', 'OTHER',
];

const DeltaTag: React.FC<{ delta: number; invert?: boolean }> = ({ delta, invert = false }) => {
  const isGood = invert ? delta < 0 : delta > 0;
  const color = delta === 0 ? 'var(--text-muted)' : isGood ? 'var(--success-dark)' : 'var(--danger-dark)';
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color, fontWeight: 700, fontSize: '0.875rem' }}>
      {delta !== 0 && <Icon size={14} />}
      {delta > 0 ? '+' : ''}{formatCurrency(Math.abs(delta))}
    </span>
  );
};

const DeltaTagNum: React.FC<{ delta: number; suffix?: string; invert?: boolean }> = ({ delta, suffix = '', invert = false }) => {
  const isGood = invert ? delta < 0 : delta > 0;
  const color = delta === 0 ? 'var(--text-muted)' : isGood ? 'var(--success-dark)' : 'var(--danger-dark)';
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color, fontWeight: 700, fontSize: '0.875rem' }}>
      {delta !== 0 && <Icon size={14} />}
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}{suffix}
    </span>
  );
};

const SimulationPage: React.FC = () => {
  const [form, setForm] = useState({
    category: 'FOOD',
    amount: '',
    description: '',
  });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSimulate = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid amount to simulate.');
      return;
    }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/engine/simulate', {
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || `Simulated ${form.category} expense`,
      });
      setResult(data.data);
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? 'Simulation failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setResult(null); setForm({ category: 'FOOD', amount: '', description: '' }); setError(''); };

  return (
    <div className="sim-page">
      {/* Header */}
      <div className="page-header">
        <h1>What-If Simulator</h1>
        <p>Simulate a hypothetical expense and see its impact on your finances before you spend</p>
      </div>

      <div className="sim-layout">
        {/* Left: Input Panel */}
        <div className="neu-raised sim-input-card fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <Zap size={20} color="var(--warning-dark)" />
            <h3 style={{ margin: 0 }}>Hypothetical Expense</h3>
          </div>

          {error && (
            <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={15} />{error}
            </div>
          )}

          <div className="form-group">
            <label>Category</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              placeholder="e.g. 8000"
              min="0"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Description <span className="text-muted">(optional)</span></label>
            <input
              placeholder="e.g. New laptop, weekend trip…"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <button
            id="btn-run-simulation"
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSimulate}
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading
              ? <><span className="spinner" style={{ width: 20, height: 20 }} /> Simulating…</>
              : <><Play size={18} /> Run Simulation</>
            }
          </button>

          {result && (
            <button className="btn btn-secondary btn-full" onClick={handleReset} style={{ marginTop: '0.75rem' }}>
              <RefreshCw size={15} /> Reset
            </button>
          )}

          {/* How it works */}
          <div className="sim-how-card">
            <h4 style={{ marginBottom: '0.75rem' }}>How it works</h4>
            <ol className="sim-how-list">
              <li>Enter a hypothetical expense (amount + category)</li>
              <li>The engine calculates the impact on your budget, risk, health, and goals</li>
              <li>Compare current vs simulated state side-by-side</li>
              <li>Make an informed spending decision!</li>
            </ol>
          </div>
        </div>

        {/* Right: Results Panel */}
        {result && (
          <div className="sim-results fade-in">
            {/* Warning Banner */}
            {result.warnings.length > 0 && (
              <div className="alert-bar alert-bar-warning" style={{ marginBottom: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
                <AlertTriangle size={18} />
                <div>
                  {result.warnings.map((w, i) => <div key={i} style={{ fontSize: '0.875rem' }}>{w}</div>)}
                </div>
              </div>
            )}
            {result.warnings.length === 0 && (
              <div className="alert-bar alert-bar-success" style={{ marginBottom: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
                <CheckCircle size={18} /> This expense looks safe — no major risks detected!
              </div>
            )}

            {/* Comparison Grid */}
            <div className="sim-compare-grid">
              {/* Balance */}
              <div className="neu-raised sim-metric-card">
                <div className="sim-metric-icon" style={{ background: 'var(--primary-100)' }}>
                  <Target size={20} color="var(--primary-700)" />
                </div>
                <h4>Budget Remaining</h4>
                <div className="sim-compare-row">
                  <div className="sim-val-col">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Current</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--success-dark)' }}>
                      {formatCurrency(result.current.budgetRemaining)}
                    </div>
                  </div>
                  <div className="sim-arrow">→</div>
                  <div className="sim-val-col">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Simulated</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: result.simulated.budgetRemaining < 0 ? 'var(--danger-dark)' : 'var(--text-primary)' }}>
                      {formatCurrency(result.simulated.budgetRemaining)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <DeltaTag delta={result.delta.budgetRemaining} />
                </div>
              </div>

              {/* Cash Balance */}
              <div className="neu-raised sim-metric-card">
                <div className="sim-metric-icon" style={{ background: 'var(--success-light)' }}>
                  <Shield size={20} color="var(--success-dark)" />
                </div>
                <h4>Cash Balance</h4>
                <div className="sim-compare-row">
                  <div className="sim-val-col">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Current</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{formatCurrency(result.current.balance)}</div>
                  </div>
                  <div className="sim-arrow">→</div>
                  <div className="sim-val-col">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Simulated</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: result.simulated.balance < 0 ? 'var(--danger-dark)' : 'var(--text-primary)' }}>
                      {formatCurrency(result.simulated.balance)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <DeltaTag delta={result.delta.balance} />
                </div>
              </div>

              {/* Risk Score */}
              <div className="neu-raised sim-metric-card">
                <div className="sim-metric-icon" style={{ background: 'var(--danger-light)' }}>
                  <Shield size={20} color="var(--danger-dark)" />
                </div>
                <h4>Risk Score</h4>
                <div className="sim-compare-row">
                  <div className="sim-val-col">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Current</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{result.current.riskScore}/100</div>
                  </div>
                  <div className="sim-arrow">→</div>
                  <div className="sim-val-col">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Simulated</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: result.simulated.riskScore > result.current.riskScore ? 'var(--danger-dark)' : 'var(--success-dark)' }}>
                      {result.simulated.riskScore}/100
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <DeltaTagNum delta={result.delta.riskScore} suffix=" pts" invert={true} />
                </div>
              </div>

              {/* Health Score */}
              <div className="neu-raised sim-metric-card">
                <div className="sim-metric-icon" style={{ background: 'var(--warning-light)' }}>
                  <TrendingUp size={20} color="var(--warning-dark)" />
                </div>
                <h4>Health Score</h4>
                <div className="sim-compare-row">
                  <div className="sim-val-col">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Current</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{result.current.healthScore}/100</div>
                  </div>
                  <div className="sim-arrow">→</div>
                  <div className="sim-val-col">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Simulated</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: result.simulated.healthScore < result.current.healthScore ? 'var(--danger-dark)' : 'var(--success-dark)' }}>
                      {result.simulated.healthScore}/100
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <DeltaTagNum delta={result.delta.healthScore} suffix=" pts" />
                </div>
              </div>
            </div>

            {/* Affected Goals */}
            {result.affectedGoals.length > 0 && (
              <div className="neu-raised sim-impact-card">
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--warning-dark)' }}>
                  <Target size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Goals Impact
                </h4>
                {result.affectedGoals.map((g, i) => (
                  <div key={i} className="alert-bar alert-bar-warning" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <AlertTriangle size={14} />
                    <span><strong>{g.name}</strong>: {g.impact}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Affected Obligations */}
            {result.affectedObligations.length > 0 && (
              <div className="neu-raised sim-impact-card">
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--danger-dark)' }}>
                  <Shield size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Obligations Impact
                </h4>
                {result.affectedObligations.map((o, i) => (
                  <div key={i} className="alert-bar alert-bar-danger" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <AlertTriangle size={14} />
                    <span><strong>{o.name}</strong>: {o.impact}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State when no simulation yet */}
        {!result && !loading && (
          <div className="sim-placeholder fade-in">
            <div className="sim-placeholder-icon">
              <Zap size={56} color="var(--primary-300)" />
            </div>
            <h3>Enter an expense on the left and click "Run Simulation"</h3>
            <p>The simulator will show you the exact impact on your budget, risk score, cash balance, and goals before you spend a rupee.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationPage;
