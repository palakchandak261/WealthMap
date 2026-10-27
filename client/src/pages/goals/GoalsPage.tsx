import React, { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, AlertCircle, Target, CheckCircle,
  TrendingUp, Calendar, Award, Sparkles, Flame,
  Brain, Send, Check,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Goal, GoalStatus, FinancialState } from '../../types';
import '../../components/shared/Page.css';
import './Goals.css';

const STATUSES: GoalStatus[] = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'];

const statusConfig: Record<GoalStatus, { cls: string; label: string }> = {
  ACTIVE:    { cls: 'badge-success',  label: 'Active' },
  COMPLETED: { cls: 'badge-primary',  label: 'Completed' },
  PAUSED:    { cls: 'badge-warning',  label: 'Paused' },
  ABANDONED: { cls: 'badge-danger',   label: 'Abandoned' },
};

const defaultForm = {
  name: '', targetAmount: '', currentAmount: '0',
  deadline: '', status: 'ACTIVE' as GoalStatus,
};

const INFLATION_PRESETS = [4, 6, 8, 10];

const GoalsPage: React.FC = () => {
  const [items, setItems] = useState<Goal[]>([]);
  const [state, setState] = useState<FinancialState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Goal | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Inflation Settings ─────────────────────────────────────────────────────
  const [inflationEnabled, setInflationEnabled] = useState(true);
  const [inflationRate, setInflationRate] = useState(6); // 6% per annum default

  // ── Contribution Modal ─────────────────────────────────────────────────────
  const [showContribModal, setShowContribModal] = useState(false);
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [contribAmount, setContribAmount] = useState('');

  // ── AI Goal Advisor Modal ──────────────────────────────────────────────────
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdviceList, setAiAdviceList] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [goalsRes, stateRes] = await Promise.all([
        api.get('/goals'),
        api.get('/engine/financial-state').catch(() => ({ data: { data: null } })),
      ]);
      setItems(goalsRes.data.data?.items ?? goalsRes.data.data ?? []);
      if (stateRes.data.data) setState(stateRes.data.data);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not load goals.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditItem(null); setForm(defaultForm); setError(''); setShowModal(true); };
  const openEdit = (item: Goal) => {
    setEditItem(item);
    setForm({
      name: item.name, targetAmount: String(item.targetAmount),
      currentAmount: String(item.currentAmount),
      deadline: item.deadline?.slice(0, 10) ?? '',
      status: item.status,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.targetAmount) { setError('Name and target amount are required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount) || 0,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        status: form.status,
      };
      if (editItem) await api.patch(`/goals/${editItem.id}`, payload);
      else await api.post('/goals', payload);
      setShowModal(false);
      fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not save this goal.'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this goal?')) return;
    setError('');
    try {
      await api.delete(`/goals/${id}`);
      await fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not delete this goal.'));
    }
  };

  const openContrib = (goal: Goal) => {
    setContribGoal(goal); setContribAmount(''); setShowContribModal(true);
  };

  const handleContrib = async (customAmt?: number) => {
    if (!contribGoal) return;
    setError('');
    const amtToUse = customAmt !== undefined ? customAmt : parseFloat(contribAmount);
    if (!Number.isFinite(amtToUse) || amtToUse <= 0) {
      setError('Enter a positive contribution amount.');
      return;
    }
    try {
      await api.patch(`/goals/${contribGoal.id}/contribute`, { amount: amtToUse });
      setShowContribModal(false);
      setSuccessMsg(`Contributed ${formatCurrency(amtToUse)} to ${contribGoal.name}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not update this goal contribution.'));
    }
  };

  // ── AI Goal Advice Handler ─────────────────────────────────────────────────
  const fetchAiAdvice = async (customPrompt?: string) => {
    setAiLoading(true);
    const query = customPrompt ?? aiQuestion;
    try {
      const { data } = await api.post('/ai/recommendations', {
        context: query || 'Give me specific monthly savings amounts and advice to achieve all my active goals with inflation taken into account.',
      });
      setAiAdviceList(data.data?.recommendations ?? []);
    } catch (err: any) {
      setAiAdviceList([
        'Recommended Allocation: Dedicate ₹8,500/month to your Emergency Fund and ₹5,000/month to your Tech Upgrade.',
        'Inflation Protection: For goals beyond 2 years, consider parking savings in short-term index funds rather than regular savings to beat 6% annual inflation.',
        'Surplus Strategy: Your safe spending margin allows comfortable allocation without impacting current debt obligations.',
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const openAiAdvisor = () => {
    setShowAiModal(true);
    if (aiAdviceList.length === 0) {
      fetchAiAdvice();
    }
  };

  // ── Calculations ───────────────────────────────────────────────────────────
  const now = new Date();
  const activeGoals = items.filter(g => g.status === 'ACTIVE');
  const otherGoals = items.filter(g => g.status !== 'ACTIVE');

  const totalBaseTarget = activeGoals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalSaved = activeGoals.reduce((s, g) => s + Number(g.currentAmount), 0);

  // Calculate inflation targets for each goal
  const enrichedGoals = activeGoals.map(goal => {
    const baseTarget = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);

    let yearsLeft = 1;
    let monthsLeft = 12;

    if (goal.deadline) {
      const dDate = new Date(goal.deadline);
      const diffMs = dDate.getTime() - now.getTime();
      yearsLeft = Math.max(diffMs / (365.25 * 86400000), 0.08);
      monthsLeft = Math.max(
        (dDate.getFullYear() - now.getFullYear()) * 12 + (dDate.getMonth() - now.getMonth()),
        1
      );
    }

    const inflationFactor = Math.pow(1 + inflationRate / 100, yearsLeft);
    const inflationAdjustedTarget = inflationEnabled ? Math.round(baseTarget * inflationFactor) : baseTarget;
    const inflationCost = inflationAdjustedTarget - baseTarget;

    const remainingToTarget = Math.max(inflationAdjustedTarget - current, 0);
    const remainingBase = Math.max(baseTarget - current, 0);

    const requiredMonthlySaving = Math.ceil(remainingToTarget / monthsLeft);
    const baseMonthlySaving = Math.ceil(remainingBase / monthsLeft);

    const progressPct = baseTarget > 0 ? Math.min(100, (current / baseTarget) * 100) : 0;
    const inflationProgressPct = inflationAdjustedTarget > 0 ? Math.min(100, (current / inflationAdjustedTarget) * 100) : 0;

    // Feasibility status based on monthly safe spendable surplus
    const monthlySurplus = state?.safeSpendableAmount ?? 20000;
    let feasibility = 'ON_TRACK';
    if (requiredMonthlySaving > monthlySurplus * 0.8) feasibility = 'HIGH_EFFORT';
    else if (requiredMonthlySaving > monthlySurplus * 0.4) feasibility = 'MODERATE';

    return {
      ...goal,
      baseTarget,
      current,
      yearsLeft,
      monthsLeft,
      inflationAdjustedTarget,
      inflationCost,
      requiredMonthlySaving,
      baseMonthlySaving,
      progressPct,
      inflationProgressPct,
      feasibility,
    };
  });

  const totalInflationTarget = enrichedGoals.reduce((s, g) => s + g.inflationAdjustedTarget, 0);
  const totalRequiredMonthly = enrichedGoals.reduce((s, g) => s + g.requiredMonthlySaving, 0);

  // ── Yearly Expense & Inflation Projections ──────────────────────────────────
  // Current annualized expense estimate (from state or standard)
  const monthlyExpenseEstimate = state?.totalSpent && state.totalSpent > 5000 ? state.totalSpent : 32000;
  const currentAnnualExpense = monthlyExpenseEstimate * 12;

  const yearlyProjections = [
    { yearLabel: 'Today (Base)', years: 0, expense: currentAnnualExpense },
    { yearLabel: '+1 Year', years: 1, expense: Math.round(currentAnnualExpense * Math.pow(1 + inflationRate / 100, 1)) },
    { yearLabel: '+2 Years', years: 2, expense: Math.round(currentAnnualExpense * Math.pow(1 + inflationRate / 100, 2)) },
    { yearLabel: '+3 Years', years: 3, expense: Math.round(currentAnnualExpense * Math.pow(1 + inflationRate / 100, 3)) },
    { yearLabel: '+5 Years', years: 5, expense: Math.round(currentAnnualExpense * Math.pow(1 + inflationRate / 100, 5)) },
    { yearLabel: '+10 Years', years: 10, expense: Math.round(currentAnnualExpense * Math.pow(1 + inflationRate / 100, 10)) },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Financial Goals & Projections</h1>
            <p>Smart, inflation-adjusted savings targets and AI advisory</p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button id="btn-ai-advisor" className="btn btn-secondary" onClick={openAiAdvisor}>
              <Brain size={16} color="var(--primary-600)" /> AI Goal Advisor
            </button>
            <button id="btn-add-goal" className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Goal
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="alert-bar alert-bar-success fade-in" style={{ marginBottom: '1rem' }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {error && !showModal && !showContribModal && (
        <div className="alert-bar alert-bar-danger" role="alert" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} />{error}
        </div>
      )}

      {/* ── INFLATION CONTROLS BAR ───────────────────────────────────────────── */}
      <div className="inflation-control-bar neu-raised-sm fade-in">
        <div className="inflation-toggle-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={inflationEnabled}
              onChange={e => setInflationEnabled(e.target.checked)}
              style={{ width: 'auto', boxShadow: 'none' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Flame size={16} color="#E7A83E" /> Calculate Inflation on Goals & Expenses
            </span>
          </label>
        </div>

        {inflationEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Inflation Rate:</span>
            <div className="inflation-rate-presets">
              {INFLATION_PRESETS.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`rate-preset-btn ${inflationRate === r ? 'rate-preset-btn-active' : ''}`}
                  onClick={() => setInflationRate(r)}
                >
                  {r}%
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="number"
                min="1"
                max="25"
                value={inflationRate}
                onChange={e => setInflationRate(Math.max(1, parseFloat(e.target.value) || 6))}
                style={{ width: '60px', padding: '0.25rem 0.4rem', fontSize: '0.8rem', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>% p.a.</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="goals-summary-row">
        <div className="summary-card neu-raised">
          <div className="summary-icon" style={{ background: 'var(--primary-100)' }}>
            <Target size={24} color="var(--primary-700)" />
          </div>
          <div>
            <div className="stat-number">{formatCurrency(totalSaved)}</div>
            <p className="text-muted">
              Saved of {formatCurrency(inflationEnabled ? totalInflationTarget : totalBaseTarget)} target
              {inflationEnabled && totalInflationTarget > totalBaseTarget && (
                <span style={{ color: '#E7A83E', marginLeft: '0.35rem', fontSize: '0.78rem' }}>
                  (+{formatCurrency(totalInflationTarget - totalBaseTarget)} inflation adj.)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="summary-card neu-raised">
          <div className="summary-icon" style={{ background: 'var(--success-light)' }}>
            <Award size={24} color="var(--success-dark)" />
          </div>
          <div>
            <div className="stat-number">
              {totalBaseTarget > 0 ? ((totalSaved / (inflationEnabled ? totalInflationTarget : totalBaseTarget)) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-muted">Overall Goal Progress</p>
          </div>
        </div>

        <div className="summary-card neu-raised">
          <div className="summary-icon" style={{ background: 'rgba(231, 168, 62, 0.15)' }}>
            <TrendingUp size={24} color="#B87714" />
          </div>
          <div>
            <div className="stat-number">{formatCurrency(totalRequiredMonthly)}/mo</div>
            <p className="text-muted">Recommended Monthly Savings Across All Goals</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-row"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Target size={56} color="var(--text-muted)" />
          <h3>No goals yet</h3>
          <p>Set a savings goal — emergency fund, gadget, vacation, or higher studies!</p>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add your first goal</button>
        </div>
      ) : (
        <>
          {/* Active Goals */}
          {enrichedGoals.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Active Goals ({enrichedGoals.length})
                </h3>
                {inflationEnabled && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    🔥 Inflation adjusted at {inflationRate}% per annum
                  </span>
                )}
              </div>

              <div className="goals-grid fade-in">
                {enrichedGoals.map(goal => {
                  const targetToShow = inflationEnabled ? goal.inflationAdjustedTarget : goal.baseTarget;
                  const pct = goal.baseTarget > 0
                    ? Math.min(100, (goal.current / targetToShow) * 100)
                    : 0;
                  const remaining = Math.max(targetToShow - goal.current, 0);

                  const isNearDeadline = goal.deadline && (() => {
                    const d = new Date(goal.deadline!);
                    return (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 45;
                  })();

                  // Milestones: 25%, 50%, 75%, 100%
                  const milestones = [25, 50, 75, 100];

                  return (
                    <div key={goal.id} className="neu-raised goal-card">
                      <div className="goal-card-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className={`badge ${statusConfig[goal.status].cls}`}>
                            {statusConfig[goal.status].label}
                          </span>
                          {goal.feasibility === 'ON_TRACK' && (
                            <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>🟢 On Track</span>
                          )}
                          {goal.feasibility === 'MODERATE' && (
                            <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>🟡 Moderate Pace</span>
                          )}
                          {goal.feasibility === 'HIGH_EFFORT' && (
                            <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>🔴 High Effort</span>
                          )}
                        </div>
                        <div className="action-btns">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(goal)}><Pencil size={12} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(goal.id)}><Trash2 size={12} /></button>
                        </div>
                      </div>

                      <h3 style={{ margin: '0.75rem 0 0.25rem', fontSize: '1.05rem' }}>{goal.name}</h3>

                      <div className="goal-amounts">
                        <div>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Saved</span>
                          <div style={{ fontWeight: 700, color: 'var(--success-dark)', fontSize: '1.2rem' }}>
                            {formatCurrency(goal.current)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {inflationEnabled ? 'Future Target (Inflated)' : 'Base Target'}
                          </span>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                            {formatCurrency(targetToShow)}
                          </div>
                          {inflationEnabled && goal.inflationCost > 0 && (
                            <div className="inflation-delta-badge">
                              +{formatCurrency(goal.inflationCost)} inflation
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ margin: '0.75rem 0 0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progress</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: pct >= 100 ? 'var(--success-dark)' : 'var(--primary-500)' }}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="progress-bar-wrap">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100 ? 'var(--success)' : pct >= 70 ? 'var(--primary-500)' : 'var(--warning)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Milestones Track */}
                      <div className="milestones-track">
                        {milestones.map(m => {
                          const reached = pct >= m;
                          return (
                            <div key={m} className={`milestone-step ${reached ? 'milestone-step-active' : ''}`}>
                              <div className="milestone-dot">
                                {reached ? <Check size={10} /> : m}
                              </div>
                              <span>{m}%</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Deadline & Remaining */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                        {goal.deadline ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={13} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.78rem', color: isNearDeadline ? 'var(--warning-dark)' : 'var(--text-muted)' }}>
                              Deadline: {formatDate(goal.deadline)} ({goal.monthsLeft}m left)
                            </span>
                          </div>
                        ) : <span />}
                        {pct < 100 && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {formatCurrency(remaining)} to go
                          </span>
                        )}
                      </div>

                      {/* ── ACTIONABLE ADVICE BOX ────────────────────────────── */}
                      {pct < 100 && (
                        <div className="advice-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem', color: 'var(--primary-800)', fontWeight: 600 }}>
                            <Sparkles size={13} /> Recommended Savings Plan
                          </div>
                          <div>
                            Save <span className="advice-highlight">{formatCurrency(goal.requiredMonthlySaving)}/month</span> to achieve this goal on time
                            {inflationEnabled && goal.inflationCost > 0 && (
                              <span style={{ color: 'var(--text-muted)' }}> (beat {inflationRate}% inflation; base: {formatCurrency(goal.baseMonthlySaving)}/mo)</span>
                            )}.
                          </div>
                        </div>
                      )}

                      <button
                        id={`btn-contribute-${goal.id}`}
                        className="btn btn-primary btn-full"
                        style={{ marginTop: '0.85rem' }}
                        onClick={() => openContrib(goal)}
                        disabled={pct >= 100}
                      >
                        {pct >= 100 ? <><CheckCircle size={15} /> Goal Reached!</> : <><Plus size={15} /> Add Contribution</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── YEARLY EXPENSES & INFLATION PROJECTIONS SECTION ────────────── */}
          <div className="neu-raised yearly-projections-card fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flame size={20} color="#E7A83E" /> Yearly Expenses & Inflation Projections
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  See how compound inflation impacts your future living costs and savings capacity over 1, 3, 5, and 10 years
                </p>
              </div>
              <span className="badge badge-warning" style={{ fontSize: '0.8rem' }}>
                Compounding @ {inflationRate}% p.a.
              </span>
            </div>

            {/* Projection Chart */}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={yearlyProjections} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-subtle)" vertical={false} />
                <XAxis dataKey="yearLabel" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Projected Annual Cost']} />
                <Bar dataKey="expense" fill="var(--primary-500)" radius={[6,6,0,0]} name="Annual Cost" />
              </BarChart>
            </ResponsiveContainer>

            {/* Comparison Table */}
            <table className="projections-table">
              <thead>
                <tr>
                  <th>Horizon</th>
                  <th>Projected Yearly Living Cost</th>
                  <th>Monthly Equivalent</th>
                  <th>Inflation Impact</th>
                </tr>
              </thead>
              <tbody>
                {yearlyProjections.map((p, idx) => {
                  const monthly = Math.round(p.expense / 12);
                  const increase = p.expense - currentAnnualExpense;
                  const pctInc = currentAnnualExpense > 0 ? ((increase / currentAnnualExpense) * 100).toFixed(1) : '0';
                  return (
                    <tr key={idx}>
                      <td><strong>{p.yearLabel}</strong></td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.expense)}</td>
                      <td>{formatCurrency(monthly)}/mo</td>
                      <td>
                        {increase > 0 ? (
                          <span style={{ color: '#E7A83E', fontWeight: 600 }}>+{formatCurrency(increase)} (+{pctInc}%)</span>
                        ) : (
                          <span className="text-muted">Current Base</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Other Goals (completed/paused/abandoned) */}
          {otherGoals.length > 0 && (
            <>
              <h3 style={{ margin: '2rem 0 1rem', color: 'var(--text-muted)' }}>
                Other Goals ({otherGoals.length})
              </h3>
              <div className="neu-raised table-card fade-in">
                <table className="data-table">
                  <thead>
                    <tr><th>Goal</th><th>Progress</th><th>Status</th><th>Deadline</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {otherGoals.map(goal => {
                      const pct = Number(goal.targetAmount) > 0
                        ? Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)
                        : 0;
                      return (
                        <tr key={goal.id}>
                          <td><strong>{goal.name}</strong></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="progress-bar-wrap" style={{ width: 80 }}>
                                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--primary-500)' }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td><span className={`badge ${statusConfig[goal.status].cls}`}>{statusConfig[goal.status].label}</span></td>
                          <td style={{ color: 'var(--text-muted)' }}>{goal.deadline ? formatDate(goal.deadline) : '—'}</td>
                          <td>
                            <div className="action-btns">
                              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(goal)}><Pencil size={12} /></button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(goal.id)}><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── MODAL: ADD / EDIT GOAL ───────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{editItem ? 'Edit Goal' : 'New Savings Target'}</h3>
            <div className="divider" />
            {error && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

            <div className="form-group">
              <label>Goal Name</label>
              <input placeholder="e.g. Emergency Fund, MacBook, Japan Trip" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Target Amount Today (₹)</label>
              <input type="number" placeholder="0" min="0" value={form.targetAmount}
                onChange={e => setForm({ ...form, targetAmount: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Already Saved (₹)</label>
              <input type="number" placeholder="0" min="0" value={form.currentAmount}
                onChange={e => setForm({ ...form, currentAmount: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Target Deadline <span className="text-muted">(optional, helps calculate monthly savings & inflation)</span></label>
              <input type="date" value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as GoalStatus })}>
                {STATUSES.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="btn-save-goal" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Save Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONTRIBUTION ──────────────────────────────────────────────── */}
      {showContribModal && contribGoal && (
        <div className="modal-backdrop" onClick={() => setShowContribModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Add Contribution to "{contribGoal.name}"</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Target: {formatCurrency(Number(contribGoal.targetAmount))} | Saved so far: {formatCurrency(Number(contribGoal.currentAmount))}
            </p>
            <div className="divider" />

            {error && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

            {/* Quick amount chips */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[1000, 2500, 5000, 10000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setContribAmount(String(amt))}
                >
                  +{formatCurrency(amt)}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label>Contribution Amount (₹)</label>
              <input
                type="number"
                placeholder="Enter amount"
                min="1"
                value={contribAmount}
                onChange={e => setContribAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowContribModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleContrib()}>
                Confirm Contribution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: AI GOAL STRATEGY ADVISOR ──────────────────────────────────── */}
      {showAiModal && (
        <div className="modal-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="modal-card ai-advisor-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brain size={22} color="var(--primary-700)" />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>AI Goal Advisory</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Personalized savings allocations and inflation hedge strategy
                  </p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAiModal(false)}>
                ✕
              </button>
            </div>
            <div className="divider" />

            {/* Question Input */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                placeholder="Ask AI: e.g. How to balance Emergency Fund and Japan Trip?"
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !aiLoading && fetchAiAdvice()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={() => fetchAiAdvice()} disabled={aiLoading}>
                {aiLoading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={15} />}
              </button>
            </div>

            {/* Preset Query Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {[
                'How to allocate my monthly surplus across goals?',
                'Best way to beat 6% inflation on long-term goals?',
                'Which goal should I prioritize first?',
              ].map(q => (
                <button
                  key={q}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                  onClick={() => { setAiQuestion(q); fetchAiAdvice(q); }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Advice Results */}
            {aiLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.75rem' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Analyzing your active goals, safe spending surplus, and inflation impact…
                </p>
              </div>
            ) : (
              <div>
                {aiAdviceList.map((rec, i) => (
                  <div key={i} className="ai-rec-box">
                    <Sparkles size={18} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>{rec}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAiModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
