import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, RefreshCw, AlertTriangle, Brain, Send, Shield, HeartPulse, TrendingUp,
  Target, Wallet, Flame, PiggyBank, Info,
} from 'lucide-react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency } from '../../utils/formatters';
import AppreciationCard from '../../components/shared/AppreciationCard';
import type { AIRecommendation, AIInsight, InsightCategory } from '../../types';
import './AIRecommendations.css';

const exampleContexts = [
  'How much should I save monthly for each goal?',
  'How does inflation affect my goals and yearly expenses?',
  'I want to save more this month',
  'My food budget is always exceeded',
  'I have a loan EMI coming up',
  "I'm planning a vacation next month",
  'Help me understand my risk score',
];

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  GOAL: 'Goal',
  SAVING: 'Saving',
  SPENDING: 'Spending',
  INFLATION: 'Inflation',
  RISK: 'Risk',
  APPRECIATION: 'Well done',
};

const PLAN_STATUS: Record<string, string> = {
  ON_TRACK: 'On track', BEHIND: 'Behind', NOT_STARTED: 'Not started',
  OVERDUE: 'Overdue', COMPLETED: 'Completed', NO_DEADLINE: 'No deadline',
};

const monthYear = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

const AIRecommendationsPage: React.FC = () => {
  const [result, setResult] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState('');
  const [asked, setAsked] = useState(false);

  const fetchRecommendations = async (ctx?: string) => {
    setLoading(true); setError(''); setAsked(true);
    try {
      const { data } = await api.post('/ai/recommendations', { context: ctx ?? context }, { timeout: 60000 });
      setResult(data.data);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Advice is unavailable right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickContext = (ctx: string) => { setContext(ctx); fetchRecommendations(ctx); };

  const insights: AIInsight[] = result
    ? (result.insights?.length ? result.insights : (result.recommendations ?? []).map((r) => ({ title: '', detail: r, category: 'SAVING' as const })))
    : [];
  const plans = (result?.goalPlans ?? []).filter((p) => p.status !== 'COMPLETED');
  const sp = result?.savingsPlan;
  const allocFor = (goalId: string) => sp?.allocations.find((a) => a.goalId === goalId);

  return (
    <div className="ai-page">
      <div className="page-header">
        <div className="ai-page-header">
          <div>
            <h1>AI Recommendations & Advisory</h1>
            <p>How much to save for each goal, how inflation changes your plans, and where your money is going</p>
          </div>
          {result && (
            <button className="btn btn-secondary btn-sm" onClick={() => fetchRecommendations()} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="neu-raised ai-input-card fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="ai-brain-icon"><Brain size={22} color="var(--primary-700)" /></div>
          <div>
            <h3 style={{ margin: 0 }}>Ask for advice</h3>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>Ask about a goal, inflation, a big purchase — or leave it blank for a full review</p>
          </div>
        </div>
        <div className="ai-input-row">
          <input
            id="ai-context-input"
            placeholder="e.g. 'How much should I save monthly for my emergency fund?'"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) fetchRecommendations(); }}
            maxLength={500}
          />
          <button id="btn-get-ai-advice" className="btn btn-primary" onClick={() => fetchRecommendations()} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <><Send size={16} /> Get advice</>}
          </button>
        </div>
        <div className="ai-chips-row">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Quick:</span>
          {exampleContexts.map((ctx) => (
            <button key={ctx} className="ai-chip" onClick={() => handleQuickContext(ctx)} disabled={loading}>{ctx}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="ai-loading fade-in">
          <div className="ai-loading-inner">
            <div className="ai-pulse-ring" />
            <Brain size={28} color="var(--primary-500)" />
          </div>
          <h3>Analysing your finances and goals…</h3>
          <p>Reviewing income, safe-to-spend, goal deadlines, savings pace and inflation.</p>
        </div>
      )}

      {error && !loading && (
        <div className="alert-bar alert-bar-danger" style={{ borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Could not load recommendations</strong>
            <p style={{ margin: 0, fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="ai-results fade-in">
          {/* Summary */}
          <div className="neu-raised ai-summary-card">
            <div className="ai-summary-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={18} color="var(--primary-500)" />
                <h3 style={{ margin: 0 }}>Your financial snapshot</h3>
              </div>
              <span className={`source-badge ${result.source === 'rules' ? 'rules' : ''}`} title={result.fallbackReason}>
                <Sparkles size={11} /> {result.source === 'rules' ? 'Built-in advisor' : `AI · ${result.model ?? result.source}`}
              </span>
            </div>
            {result.summary && <p className="ai-summary-text">{result.summary}</p>}
            {result.fallbackReason && (
              <p className="ai-fallback-note"><Info size={13} /> {result.fallbackReason}. These recommendations come from WealthMap's built-in rules using your real numbers.</p>
            )}
            <div className="ai-summary-stats">
              <div className="ai-summary-stat">
                <Shield size={17} />
                <span>Risk level</span>
                <strong>{result.context.riskLevel}</strong>
                <small>{result.context.riskScore}/100 risk score</small>
              </div>
              <div className="ai-summary-stat">
                <HeartPulse size={17} />
                <span>Financial health</span>
                <strong>{result.context.healthGrade}</strong>
                <small>{result.context.healthScore}/100 health score</small>
              </div>
              <div className="ai-summary-stat">
                <TrendingUp size={17} />
                <span>Month-end outlook</span>
                <strong>{result.context.willExceedBudget ? 'Review spending' : 'On track'}</strong>
                <small>{result.context.willExceedBudget ? 'Projected over budget' : 'Within your planned budget'}</small>
              </div>
              <div className="ai-summary-stat">
                <PiggyBank size={17} />
                <span>Can save each month</span>
                <strong>{formatCurrency(result.context.monthlySavingsCapacity ?? 0)}</strong>
                <small>after expected spending & bills</small>
              </div>
            </div>
          </div>

          <AppreciationCard appreciation={result.appreciation} hideWhenNoBudget />

          {/* Insights */}
          <div>
            <h3 className="ai-section-title"><Sparkles size={17} color="var(--primary-600)" /> Recommendations</h3>
            <div className="insight-grid">
              {insights.map((ins, i) => (
                <div key={i} className={`insight-card cat-${ins.category}`}>
                  <div className="insight-card-head">
                    <span>{CATEGORY_LABEL[ins.category] ?? ins.category}</span>
                    {ins.amount != null && ins.amount > 0 && <span className="insight-amount">{formatCurrency(ins.amount)}</span>}
                  </div>
                  {ins.title && <h4>{ins.title}</h4>}
                  <p>{ins.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Goal savings plan */}
          {plans.length > 0 && (
            <div className="neu-raised ai-recs-card">
              <div className="ai-plan-head">
                <h3 className="ai-section-title" style={{ margin: 0 }}><Target size={17} color="var(--primary-600)" /> Save this much to reach your goals</h3>
                {sp && (
                  <span className={`badge ${sp.shortfall > 0 ? 'badge-warning' : 'badge-success'}`}>
                    <Wallet size={12} /> {formatCurrency(sp.totalAllocated)} of {formatCurrency(sp.monthlyCapacity)}/mo capacity
                  </span>
                )}
              </div>
              {sp?.summary && <p className="ai-plan-summary">{sp.summary}</p>}
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Goal</th>
                      <th>Progress</th>
                      <th style={{ textAlign: 'right' }}>Target (with inflation)</th>
                      <th style={{ textAlign: 'right' }}>Save / month</th>
                      <th style={{ textAlign: 'right' }}>Your plan</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => {
                      const a = allocFor(p.goalId);
                      return (
                        <tr key={p.goalId}>
                          <td>
                            <strong>{p.name}</strong>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{p.deadline ? `by ${monthYear(p.deadline)}` : 'no deadline'} · {p.priority.toLowerCase()} priority</div>
                          </td>
                          <td style={{ minWidth: 110 }}>
                            <div className="mini-progress"><span style={{ width: `${p.progressPct}%` }} /></div>
                            <small className="text-muted">{p.progressPct}% · {formatCurrency(p.current)}</small>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {formatCurrency(p.futureTarget)}
                            {p.inflationCost > 0 && <div style={{ fontSize: '0.7rem', color: '#B87714' }}>+{formatCurrency(p.inflationCost)} @ {p.inflationRate}%</div>}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-700)' }}>
                            {p.requiredMonthly != null ? formatCurrency(p.requiredMonthly) : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {a ? formatCurrency(a.allocated) : '—'}
                            {a && a.shortfall > 0 && a.suggestedDeadline && <div style={{ fontSize: '0.7rem' }} className="text-warning">realistic by {monthYear(a.suggestedDeadline)}</div>}
                          </td>
                          <td><span className={`status-chip status-${p.status}`}>{PLAN_STATUS[p.status] ?? p.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Link to="/goals" className="ai-plan-link">Open goals & what-if planner →</Link>
            </div>
          )}

          {/* Inflation on yearly expenses */}
          {result.yearly && result.yearly.annualBaseline > 0 && (
            <div className="neu-raised ai-inflation-card">
              <Flame size={20} color="#B87714" />
              <div>
                <strong>Yearly expenses with inflation</strong>
                <p>
                  You spend about <b>{formatCurrency(result.yearly.annualBaseline)}</b> a year. At your blended inflation of {result.yearly.blendedRate}%,
                  the same lifestyle costs <b>{formatCurrency(result.yearly.nextYear)}</b> next year (+{formatCurrency(result.yearly.nextYear - result.yearly.annualBaseline)}).
                </p>
              </div>
            </div>
          )}

          <div className="ai-disclaimer">
            <AlertTriangle size={14} color="var(--text-muted)" />
            <span>Advice is generated from your WealthMap data and is for informational purposes only. Consult a certified financial advisor for major financial decisions.</span>
          </div>
        </div>
      )}

      {!result && !loading && !asked && (
        <div className="ai-empty-state fade-in">
          <div className="ai-empty-icon"><Sparkles size={40} color="var(--primary-300)" /></div>
          <h3>Ready to analyse your finances</h3>
          <p>Get a monthly savings amount for every goal, inflation-adjusted targets, and personalised tips based on your actual data.</p>
          <button id="btn-start-ai" className="btn btn-primary btn-lg" onClick={() => fetchRecommendations()}>
            <Brain size={18} /> Get my financial advice
          </button>
        </div>
      )}
    </div>
  );
};

export default AIRecommendationsPage;
