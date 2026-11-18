import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ShoppingCart, AlertCircle, Filter, TrendingDown, Search,
  Upload, Download, CheckCircle, Flame, ArrowRight,
} from 'lucide-react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportAllData, type ExportData } from '../../utils/importParser';
import ImportDataModal from '../../components/import/ImportDataModal';
import type { Expense, ImportResult, PlanningSnapshot } from '../../types';
import '../../components/shared/Page.css';
import './Expenses.css';

const CATEGORIES = [
  'FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH',
  'EDUCATION', 'UTILITIES', 'RENT', 'EMI', 'INSURANCE', 'TRAVEL', 'OTHER',
];
const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER'];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const makeDefaultForm = () => ({
  category: 'FOOD',
  amount: '',
  description: '',
  paymentMethod: 'UPI',
  isRecurring: false,
  spentAt: todayIso(),
});

const categoryColors: Record<string, string> = {
  FOOD: '#2FA77A', TRANSPORT: '#218565', SHOPPING: '#7C9B8C',
  ENTERTAINMENT: '#E7A83E', HEALTH: '#5C9CB5', EDUCATION: '#176E53',
  UTILITIES: '#9B6412', RENT: '#53675F', EMI: '#B83B3B',
  INSURANCE: '#6A8A77', TRAVEL: '#4D8C70', OTHER: '#82928B',
};

type Period = 'MONTH' | 'ALL';

const listOf = <T,>(res: { data: { data?: unknown } }): T[] => {
  const d = res.data.data as { items?: T[] } | T[] | null | undefined;
  if (Array.isArray(d)) return d;
  return d?.items ?? [];
};

const ExpensesPage: React.FC = () => {
  const [items, setItems] = useState<Expense[]>([]);
  const [planning, setPlanning] = useState<PlanningSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [form, setForm] = useState(makeDefaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');
  const [period, setPeriod] = useState<Period>('MONTH');
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, planRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/engine/planning').catch(() => null),
      ]);
      setItems(listOf<Expense>(expRes));
      setPlanning(planRes?.data?.data ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load expense records.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };

  const openAdd = () => { setEditItem(null); setForm(makeDefaultForm()); setFormError(''); setShowModal(true); };
  const openEdit = (item: Expense) => {
    setEditItem(item);
    const d = new Date(item.spentAt);
    setForm({
      category: item.category,
      amount: String(item.amount),
      description: item.description ?? '',
      paymentMethod: item.paymentMethod,
      isRecurring: item.isRecurring,
      spentAt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setFormError('Please enter a valid amount.'); return; }
    if (!form.spentAt) { setFormError('Please choose a date.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        // noon local time so the date never shifts across time zones
        spentAt: new Date(`${form.spentAt}T12:00:00`).toISOString(),
      };
      if (editItem) await api.patch(`/expenses/${editItem.id}`, payload);
      else await api.post('/expenses', payload);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not save this expense.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    setError('');
    try {
      await api.delete(`/expenses/${id}`);
      await fetchData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete this expense.'));
    }
  };

  const handleImported = (r: ImportResult) => {
    const parts = (['expenses', 'incomes', 'budgets', 'obligations', 'goals'] as const)
      .filter((k) => r.created[k] > 0)
      .map((k) => `${r.created[k]} ${k}`);
    flash(parts.length ? `Imported ${parts.join(', ')}.` : 'Nothing new to import — everything was already there.');
    fetchData();
  };

  // ── Export everything (re-importable workbook) ─────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    setError('');
    try {
      const [exp, inc, bud, obl, goals] = await Promise.all([
        api.get('/expenses'),
        api.get('/income'),
        api.get('/budgets'),
        api.get('/obligations'),
        api.get('/goals'),
      ]);
      exportAllData({
        expenses: listOf<ExportData['expenses'][number]>(exp),
        incomes: listOf<ExportData['incomes'][number]>(inc),
        budgets: listOf<ExportData['budgets'][number]>(bud),
        obligations: listOf<ExportData['obligations'][number]>(obl),
        goals: listOf<ExportData['goals'][number]>(goals),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not export your data.'));
    } finally {
      setExporting(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const now = new Date();
  const inPeriod = useMemo(() => {
    if (period === 'ALL') return items;
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    return items.filter((i) => { const d = new Date(i.spentAt); return d.getMonth() === m && d.getFullYear() === y; });
  }, [items, period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriod
      .filter((i) => filterCat === 'ALL' || i.category === filterCat)
      .filter((i) => !q || i.description?.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [inPeriod, filterCat, search]);

  const totalSpent = inPeriod.reduce((s, i) => s + Number(i.amount), 0);
  const catSummary = CATEGORIES.map((cat) => ({
    cat,
    total: inPeriod.filter((i) => i.category === cat).reduce((s, i) => s + Number(i.amount), 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

  const yp = planning?.yearlyProjection;
  const nextYear = yp?.projections.find((p) => p.years === 1);
  const fiveYear = yp?.projections.find((p) => p.years === 5);
  const periodLabel = period === 'MONTH' ? now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'all time';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Expenses</h1>
            <p>Track, import and export your transactions</p>
          </div>
          <div className="header-actions-group">
            <button id="btn-upload-sheet" className="btn btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={16} /> Import Excel / CSV
            </button>
            <button id="btn-export-csv" className="btn btn-secondary" onClick={handleExportAll} disabled={exporting} title="Download all your data as an Excel workbook you can re-import">
              {exporting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Download size={16} />} Export all
            </button>
            <button id="btn-add-expense" className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {successMsg && <div className="alert-bar alert-bar-success fade-in" style={{ marginBottom: '1rem' }}><CheckCircle size={16} /> {successMsg}</div>}
      {error && <div className="alert-bar alert-bar-danger" role="alert" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

      {/* Summary */}
      <div className="expenses-summary-row">
        <div className="summary-card neu-raised expenses-total-card">
          <div className="summary-icon" style={{ background: 'var(--danger-light)' }}>
            <TrendingDown size={24} color="var(--danger-dark)" />
          </div>
          <div>
            <div className="stat-number">{formatCurrency(totalSpent)}</div>
            <p className="text-muted">Spent · {periodLabel} ({inPeriod.length} records)</p>
          </div>
        </div>
        <div className="cat-pills-row">
          {catSummary.map(({ cat, total }) => (
            <button
              key={cat}
              className={`cat-pill ${filterCat === cat ? 'cat-pill-active' : ''}`}
              style={{ '--pill-color': categoryColors[cat] } as React.CSSProperties}
              onClick={() => setFilterCat(filterCat === cat ? 'ALL' : cat)}
            >
              <span className="cat-dot" style={{ background: categoryColors[cat] }} />
              {cat}
              <span className="cat-pill-amount">{formatCurrency(total)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Yearly expense with inflation */}
      {yp && yp.annualBaseline > 0 && nextYear && (
        <div className="expense-inflation-strip neu-raised-sm fade-in">
          <div className="eis-icon"><Flame size={18} color="#B87714" /></div>
          <div className="eis-cells">
            <div><span>Yearly spend today</span><strong>{formatCurrency(yp.annualBaseline)}</strong></div>
            <div><span>Next year at {yp.blendedRate}% inflation</span><strong>{formatCurrency(nextYear.annual)}</strong><em>+{formatCurrency(nextYear.increase)}</em></div>
            {fiveYear && <div><span>In 5 years</span><strong>{formatCurrency(fiveYear.annual)}</strong><em>+{fiveYear.increasePct}%</em></div>}
          </div>
          <Link to="/goals" className="eis-link">Full projection <ArrowRight size={14} /></Link>
        </div>
      )}

      {/* Filters */}
      <div className="filter-row neu-raised-sm">
        <div className="search-wrap">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search by merchant, description or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', boxShadow: 'none', padding: '0.5rem 0' }}
          />
        </div>
        <div className="segmented" role="group" aria-label="Period">
          <button className={period === 'MONTH' ? 'active' : ''} onClick={() => setPeriod('MONTH')}>This month</button>
          <button className={period === 'ALL' ? 'active' : ''} onClick={() => setPeriod('ALL')}>All</button>
        </div>
        <div className="filter-select-wrap">
          <Filter size={14} color="var(--text-muted)" />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{ background: 'transparent', boxShadow: 'none', padding: '0.5rem 0', width: 'auto' }}
            aria-label="Category filter"
          >
            <option value="ALL">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-row"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={48} color="var(--text-muted)" />
          <h3>{items.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}</h3>
          {items.length === 0 ? (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add manually</button>
              <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Upload size={16} /> Import Excel / CSV</button>
            </div>
          ) : period === 'MONTH' && (
            <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setPeriod('ALL')}>Show all months</button>
          )}
        </div>
      ) : (
        <div className="neu-raised table-card fade-in table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="cat-badge" style={{ '--cat-color': categoryColors[item.category] || '#8892B0' } as React.CSSProperties}>
                      <span className="cat-dot" style={{ background: categoryColors[item.category] || '#8892B0' }} />
                      {item.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {item.description || '—'}
                    {item.isRecurring && <span className="badge badge-primary" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>Recurring</span>}
                  </td>
                  <td style={{ color: 'var(--danger-dark)', fontWeight: 700 }}>{formatCurrency(Number(item.amount))}</td>
                  <td><span className="badge badge-primary">{item.paymentMethod.replace('_', ' ')}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(item.spentAt)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)} aria-label="Edit expense"><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)} aria-label="Delete expense"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / edit */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editItem ? 'Edit Expense' : 'Add Expense'}</h3>
            <div className="divider" />
            {formError && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{formError}</div>}

            <div className="form-group">
              <label htmlFor="exp-category">Category</label>
              <select id="exp-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="exp-amount">Amount (₹)</label>
              <input id="exp-amount" type="number" placeholder="0" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="exp-desc">Description <span className="text-muted">(optional)</span></label>
              <input id="exp-desc" placeholder="e.g. Lunch at restaurant" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="exp-method">Payment Method</label>
              <select id="exp-method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="exp-date">Date</label>
              <input id="exp-date" type="date" value={form.spentAt} onChange={(e) => setForm({ ...form, spentAt: e.target.value })} />
            </div>
            <div className="form-group form-checkbox">
              <input type="checkbox" id="isRecurring" checked={form.isRecurring}
                onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                style={{ width: 'auto', boxShadow: 'none' }} />
              <label htmlFor="isRecurring" style={{ marginBottom: 0 }}>Recurring expense (rent, subscriptions, bills)</label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="btn-save-expense" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportDataModal open={showImport} onClose={() => setShowImport(false)} onImported={handleImported} defaultSection="expenses" />
    </div>
  );
};

export default ExpensesPage;
