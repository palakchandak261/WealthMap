import React, { useEffect, useState } from 'react';
import {
  Plus, Target, AlertCircle, Pencil, CheckCircle,
  AlertTriangle, TrendingUp, Trash2,
} from 'lucide-react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency } from '../../utils/formatters';
import type { Budget, CategoryBudget, ForecastResult } from '../../types';
import '../../components/shared/Page.css';
import './Budgets.css';

const CATEGORIES = [
  'FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH',
  'EDUCATION', 'UTILITIES', 'RENT', 'EMI', 'INSURANCE', 'TRAVEL', 'OTHER',
];

const statusColor = (pct: number) => {
  if (pct >= 100) return 'var(--danger)';
  if (pct >= 85) return 'var(--warning)';
  return 'var(--success)';
};

const statusBadge = (pct: number) => {
  if (pct >= 100) return { cls: 'badge-danger', label: 'Exceeded' };
  if (pct >= 85) return { cls: 'badge-warning', label: 'Warning' };
  return { cls: 'badge-success', label: 'On Track' };
};

const BudgetsPage: React.FC = () => {
  const now = new Date();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<CategoryBudget | null>(null);
  const [totalBudget, setTotalBudget] = useState('');
  const [catForm, setCatForm] = useState({ category: 'FOOD', limit: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Forecast data for utilization
  const [forecast, setForecast] = useState<ForecastResult | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, fRes] = await Promise.allSettled([
        api.get('/budgets/current'),
        api.get('/engine/forecast'),
      ]);
      const loadErrors: string[] = [];
      if (bRes.status === 'fulfilled') {
        const d = bRes.value.data.data;
        setBudget(Array.isArray(d) ? d[0] ?? null : d);
      } else {
        setBudget(null);
        loadErrors.push(getApiErrorMessage(bRes.reason, 'Could not load your budget.'));
      }
      if (fRes.status === 'fulfilled') {
        setForecast(fRes.value.data.data);
      } else {
        setForecast(null);
        loadErrors.push(getApiErrorMessage(fRes.reason, 'Could not load the spending forecast.'));
      }
      setError(loadErrors.join(' '));
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not load budget data.'));
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openBudgetModal = () => {
    setTotalBudget(budget ? String(budget.totalBudget) : '');
    setError('');
    setShowBudgetModal(true);
  };

  const handleSetBudget = async () => {
    if (!totalBudget || Number(totalBudget) <= 0) { setError('Enter a valid budget amount.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalBudget: parseFloat(totalBudget),
      };
      if (budget) await api.patch(`/budgets/${budget.id}`, payload);
      else await api.post('/budgets', { ...payload, categoryBudgets: [] });
      setShowBudgetModal(false);
      fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not save this budget.'));
    } finally { setSaving(false); }
  };

  const openCatModal = (cb?: CategoryBudget) => {
    setEditCat(cb ?? null);
    setCatForm(cb ? { category: cb.category, limit: String(cb.limit) } : { category: 'FOOD', limit: '' });
    setError('');
    setShowCatModal(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.limit || Number(catForm.limit) <= 0) { setError('Enter a valid limit.'); return; }
    if (!budget) { setError('Set an overall budget first.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { category: catForm.category, limit: parseFloat(catForm.limit) };
      const categoryBudgets = budget.categoryBudgets
        .filter((category) => category.id !== editCat?.id)
        .map((category) => ({ category: category.category, limit: Number(category.limit) }));
      categoryBudgets.push(payload);
      await api.patch(`/budgets/${budget.id}`, { categoryBudgets });
      setShowCatModal(false);
      fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not save this category budget.'));
    } finally { setSaving(false); }
  };

  const handleDeleteCat = async (catId: string) => {
    if (!budget || !window.confirm('Remove this category budget?')) return;
    setError('');
    try {
      const categoryBudgets = budget.categoryBudgets
        .filter((category) => category.id !== catId)
        .map((category) => ({ category: category.category, limit: Number(category.limit) }));
      await api.patch(`/budgets/${budget.id}`, { categoryBudgets });
      await fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not remove this category budget.'));
    }
  };

  // Merge category budgets with forecast data
  const catRows = (budget?.categoryBudgets ?? []).map(cb => {
    const fc = forecast?.categoryForecasts.find((c) => c.category === cb.category);
    const spent = fc ? Number(fc.spent) : 0;
    const pct = cb.limit > 0 ? Math.min(200, (spent / Number(cb.limit)) * 100) : 0;
    return { ...cb, spent, pct };
  });

  const totalSpent = catRows.reduce((s, c) => s + c.spent, 0);
  const overallPct = budget ? Math.min(200, (totalSpent / Number(budget.totalBudget)) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Budgets</h1>
            <p>Set and monitor your monthly spending limits</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {budget && (
              <button className="btn btn-secondary" onClick={() => openCatModal()}>
                <Plus size={16} /> Add Category
              </button>
            )}
            <button id="btn-set-budget" className="btn btn-primary" onClick={openBudgetModal}>
              <Target size={16} /> {budget ? 'Edit Budget' : 'Set Budget'}
            </button>
          </div>
        </div>
      </div>

      {error && !showBudgetModal && !showCatModal && <div className="alert-bar alert-bar-danger" role="alert" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

      {loading ? (
        <div className="loading-row"><div className="spinner" /></div>
      ) : !budget ? (
        <div className="empty-state">
          <Target size={56} color="var(--text-muted)" />
          <h3>No budget set for this month</h3>
          <p>Set your monthly budget to start tracking spending limits.</p>
          <button className="btn btn-primary" onClick={openBudgetModal}>
            <Plus size={16} /> Set Monthly Budget
          </button>
        </div>
      ) : (
        <>
          {/* Overall Budget Card */}
          <div className="neu-raised budget-overview-card fade-in">
            <div className="budget-overview-top">
              <div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  {now.toLocaleString('default', { month: 'long' })} {now.getFullYear()} Budget
                </p>
                <div className="stat-number">{formatCurrency(Number(budget.totalBudget))}</div>
              </div>
              <div className="budget-overview-stats">
                <div className="budget-stat">
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Spent</span>
                  <span style={{ color: 'var(--danger-dark)', fontWeight: 700 }}>{formatCurrency(totalSpent)}</span>
                </div>
                <div className="budget-stat">
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Remaining</span>
                  <span style={{ color: 'var(--success-dark)', fontWeight: 700 }}>
                    {formatCurrency(Math.max(0, Number(budget.totalBudget) - totalSpent))}
                  </span>
                </div>
                <div className="budget-stat">
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Used</span>
                  <span style={{ color: statusColor(overallPct), fontWeight: 700 }}>{overallPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div className="progress-bar-wrap" style={{ height: 12, marginTop: '1.25rem' }}>
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, overallPct)}%`, background: statusColor(overallPct) }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹0</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {formatCurrency(Number(budget.totalBudget))}
              </span>
            </div>
          </div>

          {/* Category Budgets */}
          <div className="budget-cats-header">
            <h3>Category Budgets</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => openCatModal()}>
              <Plus size={14} /> Add
            </button>
          </div>

          {catRows.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <TrendingUp size={36} color="var(--text-muted)" />
              <p>No category budgets set. Add categories to track spending by type.</p>
            </div>
          ) : (
            <div className="cat-budget-grid fade-in">
              {catRows.map(cb => {
                const { cls, label } = statusBadge(cb.pct);
                return (
                  <div key={cb.id} className="neu-raised cat-budget-card">
                    <div className="cat-budget-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${cls}`}>{label}</span>
                        <strong style={{ fontSize: '0.9rem' }}>{cb.category}</strong>
                      </div>
                      <div className="action-btns">
                        <button className="btn btn-secondary btn-sm" onClick={() => openCatModal(cb)}>
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCat(cb.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="cat-budget-amounts">
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {formatCurrency(cb.spent)} of {formatCurrency(Number(cb.limit))}
                      </span>
                      <span style={{ fontWeight: 700, color: statusColor(cb.pct) }}>{cb.pct.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar-wrap" style={{ marginTop: '0.6rem' }}>
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.min(100, cb.pct)}%`, background: statusColor(cb.pct) }}
                      />
                    </div>
                    {cb.pct >= 85 && (
                      <div className={`alert-bar alert-bar-${cb.pct >= 100 ? 'danger' : 'warning'}`}
                        style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                        {cb.pct >= 100
                          ? <><AlertTriangle size={13} /> Budget exceeded by {formatCurrency(cb.spent - Number(cb.limit))}</>
                          : <><AlertCircle size={13} /> {(100 - cb.pct).toFixed(0)}% remaining</>
                        }
                      </div>
                    )}
                    {cb.pct < 85 && (
                      <div className="alert-bar alert-bar-success"
                        style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                        <CheckCircle size={13} /> {formatCurrency(Number(cb.limit) - cb.spent)} remaining
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Set/Edit Budget Modal */}
      {showBudgetModal && (
        <div className="modal-backdrop" onClick={() => setShowBudgetModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{budget ? 'Edit Monthly Budget' : 'Set Monthly Budget'}</h3>
            <div className="divider" />
            {error && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}
            <div className="form-group">
              <label>Total Monthly Budget (₹)</label>
              <input type="number" placeholder="e.g. 25000" min="0" value={totalBudget}
                onChange={e => setTotalBudget(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowBudgetModal(false)}>Cancel</button>
              <button id="btn-save-budget" className="btn btn-primary" onClick={handleSetBudget} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showCatModal && (
        <div className="modal-backdrop" onClick={() => setShowCatModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{editCat ? 'Edit Category Budget' : 'Add Category Budget'}</h3>
            <div className="divider" />
            {error && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}
            <div className="form-group">
              <label>Category</label>
              <select value={catForm.category} onChange={e => setCatForm({ ...catForm, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Spending Limit (₹)</label>
              <input type="number" placeholder="e.g. 5000" min="0" value={catForm.limit}
                onChange={e => setCatForm({ ...catForm, limit: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Cancel</button>
              <button id="btn-save-cat-budget" className="btn btn-primary" onClick={handleSaveCat} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
