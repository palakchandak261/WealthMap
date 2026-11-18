import React, { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, AlertCircle, CheckCircle,
  CreditCard, Clock, AlertTriangle, Upload,
} from 'lucide-react';
import api from '../../services/api';
import ImportDataModal from '../../components/import/ImportDataModal';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Obligation, ObligationType, Frequency } from '../../types';
import '../../components/shared/Page.css';
import './Obligations.css';

const OBL_TYPES: ObligationType[] = ['EMI', 'RENT', 'BILL', 'SUBSCRIPTION', 'INSURANCE', 'LOAN', 'OTHER'];
const FREQUENCIES: Frequency[] = ['ONE_TIME', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

const typeColors: Record<string, string> = {
  EMI: 'var(--danger)', RENT: 'var(--primary-500)', BILL: 'var(--warning)',
  SUBSCRIPTION: 'var(--success)', INSURANCE: 'var(--primary-300)', LOAN: 'var(--danger-dark)', OTHER: 'var(--text-muted)',
};

const typeIcons: Record<string, React.ReactNode> = {
  EMI: <CreditCard size={16} />, RENT: <CreditCard size={16} />, BILL: <CreditCard size={16} />,
  SUBSCRIPTION: <CreditCard size={16} />, INSURANCE: <CreditCard size={16} />,
  LOAN: <CreditCard size={16} />, OTHER: <CreditCard size={16} />,
};

const daysUntilDue = (dueDate: string): number => {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const defaultForm = {
  name: '', type: 'EMI' as ObligationType, amount: '',
  dueDate: new Date().toISOString().slice(0, 10),
  frequency: 'MONTHLY' as Frequency, isRecurring: true, isPaid: false,
};

const ObligationsPage: React.FC = () => {
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Obligation | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/obligations');
      setItems(data.data?.items ?? data.data ?? []);
    } catch (error) { setError(getApiErrorMessage(error, 'Could not load obligations.')); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditItem(null); setForm(defaultForm); setError(''); setShowModal(true); };
  const openEdit = (item: Obligation) => {
    setEditItem(item);
    setForm({
      name: item.name, type: item.type, amount: String(item.amount),
      dueDate: item.dueDate.slice(0, 10), frequency: item.frequency,
      isRecurring: item.isRecurring, isPaid: item.isPaid,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) { setError('Name and amount are required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form, amount: parseFloat(form.amount),
        dueDate: new Date(form.dueDate).toISOString(),
      };
      if (editItem) await api.patch(`/obligations/${editItem.id}`, payload);
      else await api.post('/obligations', payload);
      setShowModal(false); fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not save this obligation.'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this obligation?')) return;
    setError('');
    try {
      await api.delete(`/obligations/${id}`);
      await fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not delete this obligation.'));
    }
  };

  const handleTogglePaid = async (item: Obligation) => {
    setError('');
    try {
      await api.patch(`/obligations/${item.id}`, { isPaid: !item.isPaid });
      await fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not update this obligation.'));
    }
  };

  const totalMonthly = items
    .filter(i => i.frequency === 'MONTHLY' && !i.isPaid)
    .reduce((s, i) => s + Number(i.amount), 0);

  const unpaid = items.filter(i => !i.isPaid);
  const paid = items.filter(i => i.isPaid);
  const overdue = unpaid.filter(i => daysUntilDue(i.dueDate) < 0);
  const dueSoon = unpaid.filter(i => { const d = daysUntilDue(i.dueDate); return d >= 0 && d <= 7; });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Obligations</h1>
            <p>Track your recurring commitments — EMIs, rent, bills & subscriptions</p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={16} /> Import Excel / CSV
            </button>
            <button id="btn-add-obligation" className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Obligation
            </button>
          </div>
        </div>
      </div>
      <ImportDataModal open={showImport} onClose={() => setShowImport(false)} onImported={() => fetchData()} defaultSection="obligations" />

      {error && !showModal && <div className="alert-bar alert-bar-danger" role="alert" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

      {/* Summary Row */}
      <div className="obl-summary-row">
        <div className="summary-card neu-raised">
          <div className="summary-icon" style={{ background: 'var(--danger-light)' }}>
            <CreditCard size={24} color="var(--danger-dark)" />
          </div>
          <div>
            <div className="stat-number">{formatCurrency(totalMonthly)}</div>
            <p className="text-muted">Monthly Obligations Pending</p>
          </div>
        </div>

        {overdue.length > 0 && (
          <div className="alert-bar alert-bar-danger obl-alert-card">
            <AlertTriangle size={18} />
            <div>
              <strong>{overdue.length} obligation{overdue.length > 1 ? 's' : ''} overdue!</strong>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                {overdue.map(o => o.name).join(', ')}
              </p>
            </div>
          </div>
        )}
        {dueSoon.length > 0 && (
          <div className="alert-bar alert-bar-warning obl-alert-card">
            <Clock size={18} />
            <div>
              <strong>{dueSoon.length} due within 7 days</strong>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                {dueSoon.map(o => o.name).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-row"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <CreditCard size={48} color="var(--text-muted)" />
          <h3>No obligations added yet</h3>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add your first obligation</button>
        </div>
      ) : (
        <>
          {/* Unpaid */}
          {unpaid.length > 0 && (
            <>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Pending ({unpaid.length})
              </h3>
              <div className="obl-grid fade-in">
                {unpaid.map(item => {
                  const days = daysUntilDue(item.dueDate);
                  const isOver = days < 0;
                  const isSoon = days >= 0 && days <= 7;
                  return (
                    <div key={item.id} className={`neu-raised obl-card ${isOver ? 'obl-card-overdue' : isSoon ? 'obl-card-soon' : ''}`}>
                      <div className="obl-card-top">
                        <div className="obl-type-badge" style={{ background: typeColors[item.type] + '22', color: typeColors[item.type] }}>
                          {typeIcons[item.type]} {item.type}
                        </div>
                        <div className="action-btns">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}><Pencil size={12} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <h3 style={{ margin: '0.75rem 0 0.25rem' }}>{item.name}</h3>
                      <div className="stat-number" style={{ fontSize: '1.5rem' }}>
                        {formatCurrency(Number(item.amount))}
                      </div>
                      <div className="obl-meta">
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                          Due: {formatDate(item.dueDate)}
                        </span>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{item.frequency}</span>
                      </div>
                      {isOver && (
                        <div className="alert-bar alert-bar-danger" style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                          <AlertTriangle size={13} /> Overdue by {Math.abs(days)} days
                        </div>
                      )}
                      {isSoon && !isOver && (
                        <div className="alert-bar alert-bar-warning" style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                          <Clock size={13} /> Due in {days} day{days !== 1 ? 's' : ''}
                        </div>
                      )}
                      <button
                        id={`btn-mark-paid-${item.id}`}
                        className="btn btn-primary btn-full"
                        style={{ marginTop: '1rem' }}
                        onClick={() => handleTogglePaid(item)}
                      >
                        <CheckCircle size={15} /> Mark as Paid
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Paid */}
          {paid.length > 0 && (
            <>
              <h3 style={{ margin: '2rem 0 1rem', color: 'var(--text-muted)' }}>
                Paid ({paid.length})
              </h3>
              <div className="neu-raised table-card fade-in">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Type</th><th>Amount</th><th>Due Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {paid.map(item => (
                      <tr key={item.id} style={{ opacity: 0.6 }}>
                        <td>
                          <span style={{ textDecoration: 'line-through' }}>{item.name}</span>
                          <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Paid</span>
                        </td>
                        <td><span className="badge badge-primary">{item.type}</span></td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(Number(item.amount))}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(item.dueDate)}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn btn-secondary btn-sm" onClick={() => handleTogglePaid(item)}>Undo</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{editItem ? 'Edit Obligation' : 'Add Obligation'}</h3>
            <div className="divider" />
            {error && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}
            <div className="form-group">
              <label>Name</label>
              <input placeholder="e.g. Home Loan EMI" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ObligationType })}>
                  {OBL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as Frequency })}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" placeholder="0" min="0" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="btn-save-obligation" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObligationsPage;
