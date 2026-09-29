import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ShoppingCart, AlertCircle,
  Filter, TrendingDown, Search,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Expense } from '../../types';
import '../../components/shared/Page.css';
import './Expenses.css';

const CATEGORIES = [
  'FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH',
  'EDUCATION', 'UTILITIES', 'RENT', 'EMI', 'INSURANCE', 'TRAVEL', 'OTHER',
];
const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER'];

const defaultForm = {
  category: 'FOOD',
  amount: '',
  description: '',
  paymentMethod: 'UPI',
  isRecurring: false,
  spentAt: new Date().toISOString().slice(0, 10),
};

const categoryColors: Record<string, string> = {
  FOOD: '#4ECDC4', TRANSPORT: '#FFB347', SHOPPING: '#7B8CDE',
  ENTERTAINMENT: '#FF6B6B', HEALTH: '#A5B4FC', EDUCATION: '#4ECDC4',
  UTILITIES: '#FFB347', RENT: '#FF6B6B', EMI: '#E63946',
  INSURANCE: '#6272C8', TRAVEL: '#4ECDC4', OTHER: '#8892B0',
};

const ExpensesPage: React.FC = () => {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses');
      setItems(data.data?.items ?? data.data ?? []);
    } catch {
      setError('Could not load expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditItem(null); setForm(defaultForm); setError(''); setShowModal(true); };
  const openEdit = (item: Expense) => {
    setEditItem(item);
    setForm({
      category: item.category,
      amount: String(item.amount),
      description: item.description ?? '',
      paymentMethod: item.paymentMethod,
      isRecurring: item.isRecurring,
      spentAt: item.spentAt.slice(0, 10),
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setError('Please enter a valid amount.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        spentAt: new Date(form.spentAt).toISOString(),
      };
      if (editItem) await api.put(`/expenses/${editItem.id}`, payload);
      else await api.post('/expenses', payload);
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    fetchData();
  };

  const filtered = useMemo(() => {
    return items
      .filter(i => filterCat === 'ALL' || i.category === filterCat)
      .filter(i =>
        !search ||
        i.description?.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
      );
  }, [items, filterCat, search]);

  const totalSpent = items.reduce((s, i) => s + Number(i.amount), 0);

  // Category breakdown for summary pills
  const catSummary = CATEGORIES.map(cat => ({
    cat,
    total: items.filter(i => i.category === cat).reduce((s, i) => s + Number(i.amount), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Expenses</h1>
            <p>Track and manage your spending</p>
          </div>
          <button id="btn-add-expense" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="expenses-summary-row">
        <div className="summary-card neu-raised expenses-total-card">
          <div className="summary-icon" style={{ background: 'var(--danger-light)' }}>
            <TrendingDown size={24} color="var(--danger-dark)" />
          </div>
          <div>
            <div className="stat-number">{formatCurrency(totalSpent)}</div>
            <p className="text-muted">Total Expenses ({items.length} records)</p>
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

      {/* Filters */}
      <div className="filter-row neu-raised-sm">
        <div className="search-wrap">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search expenses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', boxShadow: 'none', padding: '0.5rem 0' }}
          />
        </div>
        <div className="filter-select-wrap">
          <Filter size={14} color="var(--text-muted)" />
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            style={{ background: 'transparent', boxShadow: 'none', padding: '0.5rem 0', width: 'auto' }}
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-row"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={48} color="var(--text-muted)" />
          <h3>{items.length === 0 ? 'No expenses yet' : 'No expenses match your filter'}</h3>
          {items.length === 0 && (
            <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add your first expense</button>
          )}
        </div>
      ) : (
        <div className="neu-raised table-card fade-in">
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
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <span className="cat-badge" style={{ '--cat-color': categoryColors[item.category] || '#8892B0' } as React.CSSProperties}>
                      <span className="cat-dot" style={{ background: categoryColors[item.category] || '#8892B0' }} />
                      {item.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{item.description || '—'}</td>
                  <td style={{ color: 'var(--danger-dark)', fontWeight: 700 }}>
                    {formatCurrency(Number(item.amount))}
                  </td>
                  <td><span className="badge badge-primary">{item.paymentMethod}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(item.spentAt)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{editItem ? 'Edit Expense' : 'Add Expense'}</h3>
            <div className="divider" />
            {error && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" placeholder="0" min="0" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Description <span className="text-muted">(optional)</span></label>
              <input placeholder="e.g. Lunch at restaurant" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.spentAt}
                onChange={e => setForm({ ...form, spentAt: e.target.value })} />
            </div>
            <div className="form-group form-checkbox">
              <input type="checkbox" id="isRecurring" checked={form.isRecurring}
                onChange={e => setForm({ ...form, isRecurring: e.target.checked })}
                style={{ width: 'auto', boxShadow: 'none' }} />
              <label htmlFor="isRecurring" style={{ marginBottom: 0 }}>Recurring expense</label>
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
    </div>
  );
};

export default ExpensesPage;
