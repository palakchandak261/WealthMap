import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, AlertCircle, Target, CheckCircle, TrendingUp, Calendar,
  Sparkles, Flame, Brain, Send, Check, Upload, History, Wallet, Gauge, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  GOAL_CATEGORIES, GOAL_CATEGORY_INFLATION, buildGoalPlan, monthsToReach, addMonths,
} from '../../utils/finance';
import ImportDataModal from '../../components/import/ImportDataModal';
import type {
  Goal, GoalStatus, GoalPlan, GoalPriority, GoalCategory, PlanningSnapshot, AIRecommendation,
} from '../../types';
import '../../components/shared/Page.css';
import './Goals.css';

const STATUSES: GoalStatus[] = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'];
const statusConfig: Record<GoalStatus, { cls: string; label: string }> = {
  ACTIVE: { cls: 'badge-success', label: 'Active' },
  COMPLETED: { cls: 'badge-primary', label: 'Completed' },
  PAUSED: { cls: 'badge-warning', label: 'Paused' },
  ABANDONED: { cls: 'badge-danger', label: 'Abandoned' },
};

const CATEGORY_META: Record<GoalCategory, { emoji: string; label: string }> = {
  EMERGENCY: { emoji: '🛟', label: 'Emergency fund' },
  EDUCATION: { emoji: '🎓', label: 'Education' },
  TRAVEL: { emoji: '✈️', label: 'Travel' },
  GADGET: { emoji: '💻', label: 'Gadget' },
  VEHICLE: { emoji: '🚗', label: 'Vehicle' },
  HOME: { emoji: '🏠', label: 'Home' },
  WEDDING: { emoji: '💍', label: 'Wedding' },
  HEALTH: { emoji: '🩺', label: 'Health' },
  RETIREMENT: { emoji: '🌴', label: 'Retirement' },
  OTHER: { emoji: '🎯', label: 'Other' },
};

const PLAN_STATUS: Record<GoalPlan['status'], string> = {
  ON_TRACK: '🟢 On track',
  BEHIND: '🟠 Behind',
  NOT_STARTED: '⚪ Not started',
  OVERDUE: '🔴 Overdue',
  COMPLETED: '✅ Completed',
  NO_DEADLINE: '🟢 Saving',
};

const PRIORITIES: GoalPriority[] = ['HIGH', 'MEDIUM', 'LOW'];
const INFLATION_PRESETS = [4, 6, 8, 10];
type InflationMode = 'category' | 'flat' | 'off';

const defaultForm = {
  name: '', targetAmount: '', currentAmount: '0', deadline: '',
  status: 'ACTIVE' as GoalStatus, category: 'OTHER' as GoalCategory, priority: 'MEDIUM' as GoalPriority,
  customRate: '',
};

const monthYear = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

const GoalsPage: React.FC = () => {
  const [items, setItems] = useState<Goal[]>([]);
  const [planning, setPlanning] = useState<PlanningSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inflation settings
  const [inflationMode, setInflationMode] = useState<InflationMode>('category');
  const [flatRate, setFlatRate] = useState(6);

  // Goal modal
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Goal | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Contribution modal
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [contribError, setContribError] = useState('');

  // What-if sliders & history toggles (per goal)
  const [whatIf, setWhatIf] = useState<Record<string, number>>({});
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});

  // AI advisor
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIRecommendation | null>(null);
  const [aiError, setAiError] = useState('');

  const [showImport, setShowImport] = useState(false);

  const planningQuery = inflationMode === 'flat' ? `?inflationRate=${flatRate}` : inflationMode === 'off' ? '?inflation=off' : '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [goalsRes, planRes] = await Promise.all([
        api.get('/goals'),
        api.get(`/engine/planning${planningQuery}`).catch(() => null),
      ]);
      setItems(goalsRes.data.data?.items ?? goalsRes.data.data ?? []);
      setPlanning(planRes?.data?.data ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load goals.'));
    } finally {
      setLoading(false);
    }
  }, [planningQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4500); };

  // ── Plans: from the planning engine (falls back to local computation) ──────
  const planFor = useCallback((goal: Goal): GoalPlan => {
    const fromEngine = planning?.goalPlans.find((p) => p.goalId === goal.id);
    if (fromEngine) return fromEngine;
    return buildGoalPlan(
      { ...goal, targetAmount: Number(goal.targetAmount), currentAmount: Number(goal.currentAmount), contributions: goal.contributions ?? [] },
      { inflationEnabled: inflationMode !== 'off', flatRate: inflationMode === 'flat' ? flatRate : null },
    );
  }, [planning, inflationMode, flatRate]);

  const activeGoals = useMemo(() => items.filter((g) => g.status === 'ACTIVE').map((g) => ({ goal: g, plan: planFor(g) })), [items, planFor]);
  const otherGoals = items.filter((g) => g.status !== 'ACTIVE');

  const totals = useMemo(() => {
    const saved = activeGoals.reduce((s, { plan }) => s + plan.current, 0);
    const base = activeGoals.reduce((s, { plan }) => s + plan.baseTarget, 0);
    const future = activeGoals.reduce((s, { plan }) => s + plan.futureTarget, 0);
    const monthly = activeGoals.reduce((s, { plan }) => s + (plan.requiredMonthly ?? 0), 0);
    const onTrack = activeGoals.filter(({ plan }) => plan.status === 'ON_TRACK' || plan.status === 'NO_DEADLINE').length;
    return { saved, base, future, monthly, onTrack };
  }, [activeGoals]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const openAdd = () => { setEditItem(null); setForm(defaultForm); setFormError(''); setShowModal(true); };
  const openEdit = (item: Goal) => {
    setEditItem(item);
    setForm({
      name: item.name,
      targetAmount: String(item.targetAmount),
      currentAmount: String(item.currentAmount),
      deadline: item.deadline ? item.deadline.slice(0, 10) : '',
      status: item.status,
      category: (GOAL_CATEGORIES as readonly string[]).includes(String(item.category)) ? (item.category as GoalCategory) : 'OTHER',
      priority: item.priority ?? 'MEDIUM',
      customRate: item.inflationRate != null ? String(item.inflationRate) : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const formPreview = useMemo(() => {
    const target = parseFloat(form.targetAmount);
    if (!Number.isFinite(target) || target <= 0) return null;
    return buildGoalPlan({
      id: 'preview', name: form.name || 'this goal', targetAmount: target,
      currentAmount: parseFloat(form.currentAmount) || 0,
      deadline: form.deadline ? new Date(`${form.deadline}T12:00:00`) : null,
      status: 'ACTIVE', category: form.category, priority: form.priority,
      inflationRate: form.customRate !== '' ? Number(form.customRate) : null,
      createdAt: new Date(),
    });
  }, [form]);

  const handleSave = async () => {
    const target = parseFloat(form.targetAmount);
    if (!form.name.trim() || !Number.isFinite(target) || target <= 0) { setFormError('Enter a goal name and a target amount greater than 0.'); return; }
    const rate = form.customRate === '' ? null : Number(form.customRate);
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 50)) { setFormError('Custom inflation must be between 0 and 50%.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        targetAmount: target,
        currentAmount: parseFloat(form.currentAmount) || 0,
        deadline: form.deadline ? new Date(`${form.deadline}T12:00:00`).toISOString() : null,
        status: form.status,
        category: form.category,
        priority: form.priority,
        inflationRate: rate,
      };
      if (editItem) await api.patch(`/goals/${editItem.id}`, payload);
      else await api.post('/goals', payload);
      setShowModal(false);
      flash(editItem ? 'Goal updated.' : 'Goal created — your savings plan has been updated.');
      fetchData();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not save this goal.'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (goal: Goal) => {
    if (!window.confirm(`Delete "${goal.name}" and its contribution history?`)) return;
    try {
      await api.delete(`/goals/${goal.id}`);
      await fetchData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete this goal.'));
    }
  };

  const openContrib = (goal: Goal, suggested?: number | null) => {
    setContribGoal(goal);
    setContribAmount(suggested && suggested > 0 ? String(suggested) : '');
    setContribNote('');
    setContribError('');
  };

  const handleContrib = async () => {
    if (!contribGoal) return;
    const amt = parseFloat(contribAmount);
    if (!Number.isFinite(amt) || amt <= 0) { setContribError('Enter a positive contribution amount.'); return; }
    try {
      await api.patch(`/goals/${contribGoal.id}/contribute`, { amount: amt, ...(contribNote.trim() && { note: contribNote.trim() }) });
      setContribGoal(null);
      flash(`Added ${formatCurrency(amt)} to "${contribGoal.name}".`);
      fetchData();
    } catch (err) {
      setContribError(getApiErrorMessage(err, 'Could not add this contribution.'));
    }
  };

  // ── AI advisor ─────────────────────────────────────────────────────────────
  const fetchAiAdvice = async (customPrompt?: string) => {
    setAiLoading(true);
    setAiError('');
    const query = customPrompt ?? aiQuestion;
    try {
      const { data } = await api.post('/ai/recommendations', {
        context: query || 'How much should I save each month for each goal, considering inflation and my priorities?',
        ...(inflationMode === 'flat' && { inflationRate: flatRate }),
      }, { timeout: 60000 });
      setAiResult(data.data);
    } catch (err) {
      setAiError(getApiErrorMessage(err, 'The advisor is unavailable right now.'));
    } finally {
      setAiLoading(false);
    }
  };
  const openAiAdvisor = () => { setShowAiModal(true); if (!aiResult) fetchAiAdvice(); };

  const sp = planning?.savingsPlan;
  const yp = planning?.yearlyProjection;
  const capacity = planning?.monthlySavingsCapacity ?? 0;
  const rateLabel = inflationMode === 'off' ? 'Inflation off' : inflationMode === 'flat' ? `${flatRate}% p.a. (flat)` : 'Category-based rates';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Goals & Savings Plan</h1>
            <p>Inflation-adjusted targets, a monthly plan for every goal, and realistic completion dates</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Upload size={16} /> Import</button>
            <button id="btn-ai-advisor" className="btn btn-secondary" onClick={openAiAdvisor}>
              <Brain size={16} color="var(--primary-600)" /> AI Goal Advisor
            </button>
            <button id="btn-add-goal" className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Goal</button>
          </div>
        </div>
      </div>

      {successMsg && <div className="alert-bar alert-bar-success fade-in" style={{ marginBottom: '1rem' }}><CheckCircle size={16} /> {successMsg}</div>}
      {error && <div className="alert-bar alert-bar-danger" role="alert" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

      {/* Inflation controls */}
      <div className="inflation-control-bar neu-raised-sm fade-in">
        <div className="inflation-toggle-group">
          <Flame size={18} color="#E7A83E" />
          <div>
            <strong style={{ fontSize: '0.88rem' }}>Inflation on goals & yearly expenses</strong>
            <p className="inflation-help">
              {inflationMode === 'category'
                ? 'Each goal uses a realistic rate for its type — e.g. Education 10%, Health 12%, Travel 7%, Gadgets 4%.'
                : inflationMode === 'flat' ? `Every goal and expense category grows at ${flatRate}% per year.` : 'Showing today\'s prices with no inflation.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="segmented" role="group" aria-label="Inflation mode">
            <button className={inflationMode === 'category' ? 'active' : ''} onClick={() => setInflationMode('category')}>By goal type</button>
            <button className={inflationMode === 'flat' ? 'active' : ''} onClick={() => setInflationMode('flat')}>Flat rate</button>
            <button className={inflationMode === 'off' ? 'active' : ''} onClick={() => setInflationMode('off')}>Off</button>
          </div>
          {inflationMode === 'flat' && (
            <div className="inflation-rate-presets">
              {INFLATION_PRESETS.map((r) => (
                <button key={r} type="button" className={`rate-preset-btn ${flatRate === r ? 'rate-preset-btn-active' : ''}`} onClick={() => setFlatRate(r)}>{r}%</button>
              ))}
              <input
                type="number" min="0" max="50" step="0.5" value={flatRate} aria-label="Custom inflation rate"
                onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v) && v >= 0 && v <= 50) setFlatRate(v); }}
                style={{ width: 64, padding: '0.25rem 0.4rem', fontSize: '0.8rem', textAlign: 'center' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="goals-summary-row">
        <div className="summary-card neu-raised">
          <div className="summary-icon" style={{ background: 'var(--primary-100)' }}><Target size={22} color="var(--primary-700)" /></div>
          <div>
            <div className="stat-number">{formatCurrency(totals.saved)}</div>
            <p className="text-muted">saved of {formatCurrency(totals.future)} needed{totals.future > totals.base && <span className="inflation-delta-inline"> (+{formatCurrency(totals.future - totals.base)} inflation)</span>}</p>
          </div>
        </div>
        <div className="summary-card neu-raised">
          <div className="summary-icon" style={{ background: 'rgba(231, 168, 62, 0.15)' }}><TrendingUp size={22} color="#B87714" /></div>
          <div>
            <div className="stat-number">{formatCurrency(totals.monthly)}<small>/mo</small></div>
            <p className="text-muted">needed across goals · you can save ~{formatCurrency(capacity)}/mo</p>
          </div>
        </div>
        <div className="summary-card neu-raised">
          <div className="summary-icon" style={{ background: 'var(--success-light)' }}><Gauge size={22} color="var(--success-dark)" /></div>
          <div>
            <div className="stat-number">{totals.onTrack}<small> of {activeGoals.length}</small></div>
            <p className="text-muted">goals on track at your current saving pace</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-row"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Target size={56} color="var(--text-muted)" />
          <h3>No goals yet</h3>
          <p>Add a goal — emergency fund, laptop, trip or higher studies — and WealthMap tells you exactly how much to save each month.</p>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add your first goal</button>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Upload size={16} /> Import from Excel</button>
          </div>
        </div>
      ) : (
        <>
          {/* Savings plan across goals */}
          {sp && sp.allocations.length > 0 && (
            <div className="neu-raised savings-plan-card fade-in">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wallet size={19} color="var(--primary-600)" /> Your monthly savings plan</h3>
                <span className={`badge ${sp.shortfall > 0 ? 'badge-warning' : 'badge-success'}`}>
                  {sp.shortfall > 0 ? `Short by ${formatCurrency(sp.shortfall)}/mo` : 'Fully funded'}
                </span>
              </div>
              <p className="savings-plan-summary">{sp.summary}</p>
              <div className="capacity-bar" title={`Capacity ${formatCurrency(sp.monthlyCapacity)}/month`}>
                {sp.allocations.filter((a) => a.allocated > 0).map((a, i) => (
                  <span key={a.goalId} style={{ width: `${Math.min(100, (a.allocated / Math.max(sp.monthlyCapacity, sp.totalRequired, 1)) * 100)}%`, opacity: 1 - i * 0.12 }} title={`${a.name}: ${formatCurrency(a.allocated)}`} />
                ))}
              </div>
              <div className="capacity-legend">
                <span>Savings capacity: <strong>{formatCurrency(sp.monthlyCapacity)}</strong>/mo <em>(income {formatCurrency(planning?.monthlyIncome ?? 0)} − expected spend {formatCurrency(planning?.expectedMonthlySpend ?? 0)} − bills due {formatCurrency(planning?.dueThisMonth ?? 0)})</em></span>
              </div>
              <div className="table-scroll">
                <table className="data-table allocation-table">
                  <thead>
                    <tr><th>Goal</th><th>Priority</th><th style={{ textAlign: 'right' }}>Needs / month</th><th style={{ textAlign: 'right' }}>Plan / month</th><th>Outcome</th></tr>
                  </thead>
                  <tbody>
                    {sp.allocations.map((a) => (
                      <tr key={a.goalId}>
                        <td><strong>{a.name}</strong></td>
                        <td><span className={`priority-chip priority-${a.priority}`}>{a.priority}</span></td>
                        <td style={{ textAlign: 'right' }}>{a.required > 0 ? formatCurrency(a.required) : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-700)' }}>{formatCurrency(a.allocated)}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {a.required === 0 ? <span className="text-muted">No deadline — gets leftover savings</span>
                            : a.shortfall === 0 ? <span className="text-success">✓ Reaches target on time</span>
                            : <span className="text-warning">Short {formatCurrency(a.shortfall)}/mo{a.suggestedDeadline ? ` → realistic by ${monthYear(a.suggestedDeadline)}` : ''}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active goals */}
          {activeGoals.length > 0 && (
            <>
              <div className="goals-section-head">
                <h3>Active goals ({activeGoals.length})</h3>
                <span>{rateLabel}</span>
              </div>
              <div className="goals-grid fade-in">
                {activeGoals.map(({ goal, plan }) => {
                  const meta = CATEGORY_META[plan.category] ?? CATEGORY_META.OTHER;
                  const pct = plan.progressPct;
                  const nearDeadline = plan.monthsLeft != null && plan.monthsLeft <= 2;
                  const sliderMax = Math.max(5000, Math.ceil(Math.max(plan.requiredMonthly ?? 0, plan.monthlyPace) * 2 / 1000) * 1000);
                  const whatIfAmt = whatIf[goal.id] ?? (plan.requiredMonthly || plan.monthlyPace || 5000);
                  const whatIfMonths = monthsToReach(plan.baseTarget, plan.current, whatIfAmt, plan.inflationRate);
                  const whatIfDate = whatIfMonths != null ? addMonths(new Date(), whatIfMonths) : null;
                  const diffVsDeadline = whatIfMonths != null && plan.monthsLeft != null ? plan.monthsLeft - whatIfMonths : null;
                  const contributions = goal.contributions ?? [];

                  return (
                    <div key={goal.id} className="neu-raised goal-card">
                      <div className="goal-card-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span className="goal-emoji" title={meta.label}>{meta.emoji}</span>
                          <span className={`priority-chip priority-${plan.priority}`}>{plan.priority}</span>
                          <span className={`status-chip status-${plan.status}`}>{PLAN_STATUS[plan.status]}</span>
                        </div>
                        <div className="action-btns">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(goal)} aria-label={`Edit ${goal.name}`}><Pencil size={12} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(goal)} aria-label={`Delete ${goal.name}`}><Trash2 size={12} /></button>
                        </div>
                      </div>

                      <h3 className="goal-title">{goal.name}</h3>

                      <div className="goal-amounts">
                        <div>
                          <span className="goal-label">Saved</span>
                          <div className="goal-amount saved">{formatCurrency(plan.current)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="goal-label">{plan.inflationRate > 0 && plan.deadline ? `Cost at deadline (${plan.inflationRate}%/yr)` : 'Target'}</span>
                          <div className="goal-amount">{formatCurrency(plan.futureTarget)}</div>
                          {plan.inflationCost > 0 && (
                            <div className="inflation-delta-badge" title={`Today's price: ${formatCurrency(plan.baseTarget)}`}>
                              +{formatCurrency(plan.inflationCost)} inflation · today {formatCurrency(plan.baseTarget)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ margin: '0.75rem 0 0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span className="goal-label">Progress</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-600)' }}>{pct}%</span>
                        </div>
                        <div className="progress-bar-wrap">
                          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--primary-500)' : pct >= 35 ? 'var(--success)' : 'var(--warning)' }} />
                        </div>
                      </div>

                      <div className="milestones-track">
                        {[25, 50, 75, 100].map((m) => (
                          <div key={m} className={`milestone-step ${pct >= m ? 'milestone-step-active' : ''}`}>
                            <div className="milestone-dot">{pct >= m ? <Check size={10} /> : ''}</div>
                            <span>{m}%</span>
                          </div>
                        ))}
                      </div>

                      <div className="goal-facts">
                        <div><Calendar size={13} /><span style={{ color: nearDeadline ? 'var(--warning-dark)' : undefined }}>{plan.deadline ? `${formatDate(plan.deadline)} · ${plan.monthsLeft} mo left` : 'No deadline'}</span></div>
                        <div><TrendingUp size={13} /><span>Pace {formatCurrency(plan.monthlyPace)}/mo</span></div>
                        <div><Clock size={13} /><span>{plan.projectedCompletion ? `At this pace: ${monthYear(plan.projectedCompletion)}` : 'No savings pace yet'}</span></div>
                      </div>

                      <div className={`advice-card ${plan.status === 'BEHIND' || plan.status === 'NOT_STARTED' ? 'advice-warn' : ''}`}>
                        <div className="advice-title"><Sparkles size={13} /> Savings plan</div>
                        {plan.requiredMonthly != null ? (
                          <div>
                            Save <span className="advice-highlight">{formatCurrency(plan.requiredMonthly)}/month</span>
                            {plan.deadline && <> to reach it by {monthYear(plan.deadline)}</>}
                            {plan.inflationCost > 0 && plan.requiredMonthlyNoInflation != null && (
                              <span className="text-muted"> (vs {formatCurrency(plan.requiredMonthlyNoInflation)} ignoring inflation)</span>
                            )}.
                            {plan.status === 'BEHIND' && (plan.monthsBehind > 0
                              ? <> At your current pace you'd be <strong>{plan.monthsBehind} month{plan.monthsBehind === 1 ? '' : 's'} late</strong>.</>
                              : <> At your current pace of {formatCurrency(plan.monthlyPace)}/month you <strong>won't catch up with inflation</strong>.</>)}
                          </div>
                        ) : <div>{plan.advice}</div>}
                      </div>

                      {/* What-if */}
                      <div className="whatif">
                        <div className="whatif-row">
                          <span>What if I save</span>
                          <strong>{formatCurrency(whatIfAmt)}/mo</strong>
                        </div>
                        <input
                          type="range" min={0} max={sliderMax} step={500} value={Math.min(whatIfAmt, sliderMax)}
                          onChange={(e) => setWhatIf((w) => ({ ...w, [goal.id]: Number(e.target.value) }))}
                          aria-label={`Monthly saving for ${goal.name}`}
                        />
                        <div className="whatif-result">
                          {whatIfDate
                            ? <>Done by <strong>{monthYear(whatIfDate.toISOString())}</strong>
                              {diffVsDeadline != null && (diffVsDeadline >= 0
                                ? <span className="text-success"> · {diffVsDeadline === 0 ? 'right on time' : `${diffVsDeadline} mo early`}</span>
                                : <span className="text-warning"> · {-diffVsDeadline} mo late</span>)}</>
                            : <span className="text-muted">Move the slider to see when you'd finish.</span>}
                        </div>
                      </div>

                      {contributions.length > 0 && (
                        <div className="contrib-history">
                          <button className="link-button" onClick={() => setOpenHistory((h) => ({ ...h, [goal.id]: !h[goal.id] }))}>
                            <History size={13} /> {openHistory[goal.id] ? 'Hide' : 'Show'} contributions ({contributions.length})
                          </button>
                          {openHistory[goal.id] && (
                            <ul>
                              {contributions.slice(0, 8).map((c) => (
                                <li key={c.id}><span>{formatDate(c.contributedAt)}{c.note ? ` · ${c.note}` : ''}</span><strong>+{formatCurrency(Number(c.amount))}</strong></li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      <button id={`btn-contribute-${goal.id}`} className="btn btn-primary btn-full" style={{ marginTop: '0.85rem' }} onClick={() => openContrib(goal, plan.requiredMonthly)}>
                        <Plus size={15} /> Add contribution
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Yearly expense inflation */}
          {yp && yp.annualBaseline > 0 && (
            <div className="neu-raised yearly-projections-card fade-in">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Flame size={20} color="#E7A83E" /> Yearly expenses with inflation</h3>
                  <p className="yearly-sub">
                    Based on {yp.basis === 'HISTORY' ? `your average of the last ${yp.monthsOfHistory} full month${yp.monthsOfHistory === 1 ? '' : 's'}` : 'this month (rent & bills counted once, daily spending projected)'} · blended inflation {yp.blendedRate}%
                  </p>
                </div>
                <span className="badge badge-warning">{rateLabel}</span>
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={yp.projections} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-subtle)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(Number(v) / 100000).toFixed(1)}L`} width={56} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Yearly living cost']} />
                  <Bar dataKey="annual" radius={[6, 6, 0, 0]}>
                    {yp.projections.map((p) => <Cell key={p.years} fill={p.years === 0 ? 'var(--primary-300)' : 'var(--primary-500)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="table-scroll">
                <table className="projections-table">
                  <thead><tr><th>Horizon</th><th>Yearly cost</th><th>Per month</th><th>Extra vs today</th></tr></thead>
                  <tbody>
                    {yp.projections.map((p) => (
                      <tr key={p.years}>
                        <td><strong>{p.label}</strong></td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.annual)}</td>
                        <td>{formatCurrency(p.monthly)}/mo</td>
                        <td>{p.increase > 0 ? <span style={{ color: '#B87714', fontWeight: 600 }}>+{formatCurrency(p.increase)} (+{p.increasePct}%)</span> : <span className="text-muted">Base</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="yearly-split">
                <div>
                  <h4>By category</h4>
                  <table className="projections-table compact">
                    <thead><tr><th>Category</th><th>Per year</th><th>Rate</th><th>Next year</th></tr></thead>
                    <tbody>
                      {yp.categories.slice(0, 8).map((c) => (
                        <tr key={c.category}>
                          <td>{c.category}</td>
                          <td>{formatCurrency(c.annual)}</td>
                          <td>{c.rate}%</td>
                          <td>{formatCurrency(c.annual * (1 + c.rate / 100))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="purchasing-power">
                  <h4>What ₹1,00,000 buys later</h4>
                  {yp.purchasingPower.map((p) => (
                    <div key={p.years} className="pp-row">
                      <span>In {p.years} year{p.years === 1 ? '' : 's'}</span>
                      <div className="mini-progress"><span style={{ width: `${(p.valueOfOneLakh / 100000) * 100}%` }} /></div>
                      <strong>{formatCurrency(p.valueOfOneLakh)}</strong>
                    </div>
                  ))}
                  <p className="text-muted" style={{ fontSize: '0.76rem', marginTop: '0.5rem' }}>
                    Money kept idle loses value every year — invest long-term goal savings in options that beat {yp.blendedRate}% inflation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Other goals */}
          {otherGoals.length > 0 && (
            <>
              <h3 style={{ margin: '2rem 0 1rem', color: 'var(--text-muted)' }}>Completed & paused ({otherGoals.length})</h3>
              <div className="neu-raised table-card fade-in table-scroll">
                <table className="data-table">
                  <thead><tr><th>Goal</th><th>Progress</th><th>Status</th><th>Deadline</th><th>Actions</th></tr></thead>
                  <tbody>
                    {otherGoals.map((goal) => {
                      const pct = Number(goal.targetAmount) > 0 ? Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100) : 0;
                      const meta = CATEGORY_META[(goal.category as GoalCategory)] ?? CATEGORY_META.OTHER;
                      return (
                        <tr key={goal.id}>
                          <td><strong>{meta.emoji} {goal.name}</strong></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="progress-bar-wrap" style={{ width: 80 }}><div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--primary-500)' }} /></div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td><span className={`badge ${statusConfig[goal.status].cls}`}>{statusConfig[goal.status].label}</span></td>
                          <td style={{ color: 'var(--text-muted)' }}>{goal.deadline ? formatDate(goal.deadline) : '—'}</td>
                          <td>
                            <div className="action-btns">
                              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(goal)} aria-label={`Edit ${goal.name}`}><Pencil size={12} /></button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(goal)} aria-label={`Delete ${goal.name}`}><Trash2 size={12} /></button>
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

      {/* ── Add / edit goal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card goal-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editItem ? 'Edit goal' : 'New savings goal'}</h3>
            <div className="divider" />
            {formError && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{formError}</div>}

            <div className="form-group">
              <label htmlFor="goal-name">Goal name</label>
              <input id="goal-name" placeholder="e.g. Emergency fund, MacBook, Japan trip" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="goal-category">Type</label>
                <select id="goal-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as GoalCategory })}>
                  {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label} ({GOAL_CATEGORY_INFLATION[c]}%)</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="goal-priority">Priority</label>
                <select id="goal-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as GoalPriority })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="goal-target">Target (today's price, ₹)</label>
                <input id="goal-target" type="number" min="0" placeholder="0" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="goal-current">Already saved (₹)</label>
                <input id="goal-current" type="number" min="0" placeholder="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="goal-deadline">Target date</label>
                <input id="goal-deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="goal-rate">Inflation % <span className="text-muted">(blank = {GOAL_CATEGORY_INFLATION[form.category]}%)</span></label>
                <input id="goal-rate" type="number" min="0" max="50" step="0.5" placeholder={String(GOAL_CATEGORY_INFLATION[form.category])} value={form.customRate} onChange={(e) => setForm({ ...form, customRate: e.target.value })} />
              </div>
            </div>
            {editItem && (
              <div className="form-group">
                <label htmlFor="goal-status">Status</label>
                <select id="goal-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GoalStatus })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                </select>
              </div>
            )}

            {formPreview && (
              <div className="advice-card" style={{ marginTop: 0 }}>
                <div className="advice-title"><Sparkles size={13} /> Plan preview</div>
                {formPreview.status === 'COMPLETED' ? 'This goal is already fully funded.'
                  : formPreview.requiredMonthly != null
                    ? <>Save <span className="advice-highlight">{formatCurrency(formPreview.requiredMonthly)}/month</span>. At {formPreview.inflationRate}% inflation the target grows to <strong>{formatCurrency(formPreview.futureTarget)}</strong> by {monthYear(formPreview.deadline)}.</>
                    : 'Add a target date to get an exact monthly savings amount.'}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="btn-save-goal" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Save goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contribution ────────────────────────────────────────────────── */}
      {contribGoal && (() => {
        const plan = planFor(contribGoal);
        return (
          <div className="modal-backdrop" onClick={() => setContribGoal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Add to "{contribGoal.name}"</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Saved {formatCurrency(plan.current)} of {formatCurrency(plan.futureTarget)}
                {plan.requiredMonthly ? ` · plan: ${formatCurrency(plan.requiredMonthly)}/month` : ''}
              </p>
              <div className="divider" />
              {contribError && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{contribError}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {plan.requiredMonthly ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setContribAmount(String(plan.requiredMonthly))}>
                    Monthly plan {formatCurrency(plan.requiredMonthly)}
                  </button>
                ) : null}
                {[1000, 2500, 5000, 10000].map((amt) => (
                  <button key={amt} type="button" className="btn btn-ghost btn-sm" onClick={() => setContribAmount(String(amt))}>+{formatCurrency(amt)}</button>
                ))}
              </div>
              <div className="form-group">
                <label htmlFor="contrib-amount">Amount (₹)</label>
                <input id="contrib-amount" type="number" min="1" placeholder="Enter amount" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label htmlFor="contrib-note">Note <span className="text-muted">(optional)</span></label>
                <input id="contrib-note" maxLength={120} placeholder="e.g. Saved from this month's safe-to-spend" value={contribNote} onChange={(e) => setContribNote(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setContribGoal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleContrib}>Add contribution</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── AI goal advisor ─────────────────────────────────────────────── */}
      {showAiModal && (
        <div className="modal-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="modal-card ai-advisor-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="ai-avatar"><Brain size={22} color="var(--primary-700)" /></div>
                <div>
                  <h3 style={{ margin: 0 }}>AI Goal Advisor</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>How much to save for each goal, with inflation and your priorities</p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAiModal(false)} aria-label="Close">✕</button>
            </div>
            <div className="divider" />

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                placeholder="Ask: e.g. How do I balance my emergency fund and the Japan trip?"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !aiLoading) fetchAiAdvice(); }}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={() => fetchAiAdvice()} disabled={aiLoading} aria-label="Ask">
                {aiLoading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={15} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {['How should I split my savings across goals?', 'How does inflation change my goals?', 'Which goal should I prioritise first?'].map((q) => (
                <button key={q} type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.74rem' }} onClick={() => { setAiQuestion(q); fetchAiAdvice(q); }}>{q}</button>
              ))}
            </div>

            {aiError && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '0.75rem' }}><AlertCircle size={15} />{aiError}</div>}
            {aiLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.75rem' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reviewing your goals, savings capacity and inflation…</p>
              </div>
            ) : aiResult && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                  <span className={`source-badge ${aiResult.source === 'rules' ? 'rules' : ''}`}>
                    <Sparkles size={11} /> {aiResult.source === 'rules' ? 'Built-in advisor' : `AI · ${aiResult.model ?? aiResult.source}`}
                  </span>
                  {aiResult.fallbackReason && <span className="text-muted" style={{ fontSize: '0.72rem' }}>{aiResult.fallbackReason}</span>}
                </div>
                {aiResult.summary && <p className="ai-summary">{aiResult.summary}</p>}
                {(aiResult.insights ?? aiResult.recommendations.map((r) => ({ title: '', detail: r, category: 'SAVING' as const }))).map((ins, i) => (
                  <div key={i} className={`ai-rec-box cat-${ins.category}`}>
                    <Sparkles size={18} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      {ins.title && <strong style={{ display: 'block', fontSize: '0.88rem', marginBottom: '0.2rem' }}>{ins.title}</strong>}
                      <div style={{ fontSize: '0.84rem', lineHeight: 1.5 }}>{ins.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAiModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <ImportDataModal open={showImport} onClose={() => setShowImport(false)} onImported={() => fetchData()} defaultSection="goals" />
    </div>
  );
};

export default GoalsPage;
