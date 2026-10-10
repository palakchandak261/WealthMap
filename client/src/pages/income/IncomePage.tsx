import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, DollarSign, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Income } from '../../types';
import '../../components/shared/Page.css';

const FREQUENCIES = ['ONE_TIME','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','YEARLY'];

const defaultForm = { source: '', amount: '', frequency: 'MONTHLY', isRecurring: true, receivedAt: new Date().toISOString().slice(0,10) };

const IncomePage: React.FC = () => {
  const [items, setItems] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Income | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/income');
      setItems(data.data?.items ?? data.data ?? []);
    } catch (error) { setError(getApiErrorMessage(error, 'Could not load income records.')); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setEditItem(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (item: Income) => {
    setEditItem(item);
    setForm({
      source: item.source, amount: String(item.amount),
      frequency: item.frequency, isRecurring: item.isRecurring,
      receivedAt: item.receivedAt.slice(0,10),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.source || !form.amount) { setError('Source and amount are required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, amount: parseFloat(form.amount), receivedAt: new Date(form.receivedAt).toISOString() };
      if (editItem) await api.patch(`/income/${editItem.id}`, payload);
      else await api.post('/income', payload);
      setShowModal(false); fetch();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not save this income record.'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this income record?')) return;
    setError('');
    try {
      await api.delete(`/income/${id}`);
      await fetch();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not delete this income record.'));
    }
  };

  const totalMonthly = items.filter(i => i.frequency === 'MONTHLY').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Income</h1>
            <p>Track allowances, scholarships, stipends and part-time income</p>
          </div>
          <button id="btn-add-income" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Income
          </button>
        </div>
      </div>

      {error && !showModal && <div className="alert-bar alert-bar-danger" role="alert" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

      {/* Summary */}
      <div className="summary-card neu-raised">
        <div className="summary-icon" style={{ background: 'var(--success-light)' }}>
          <DollarSign size={24} color="var(--success-dark)" />
        </div>
        <div>
          <div className="stat-number">{formatCurrency(totalMonthly)}</div>
          <p className="text-muted">Total Monthly Income</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-row"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <DollarSign size={48} color="var(--text-muted)" />
          <h3>No income records yet</h3>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add your first income</button>
        </div>
      ) : (
        <div className="neu-raised table-card">
          <table className="data-table">
            <thead>
              <tr><th>Source</th><th>Amount</th><th>Frequency</th><th>Received</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.source}</strong></td>
                  <td style={{ color: 'var(--success-dark)', fontWeight: 600 }}>{formatCurrency(Number(item.amount))}</td>
                  <td><span className="badge badge-primary">{item.frequency}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(item.receivedAt)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}><Pencil size={14}/></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}><Trash2 size={14}/></button>
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
            <h3>{editItem ? 'Edit Income' : 'Add Income'}</h3>
            <div className="divider" />
            {error && <div className="alert-bar alert-bar-danger" style={{marginBottom:'1rem'}}><AlertCircle size={15}/>{error}</div>}
            <div className="form-group">
              <label>Source</label>
              <input placeholder="e.g. Allowance, scholarship" value={form.source} onChange={e=>setForm({...form, source: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" placeholder="0" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} min="0" />
            </div>
            <div className="form-group">
              <label>Frequency</label>
              <select value={form.frequency} onChange={e=>setForm({...form, frequency: e.target.value})}>
                {FREQUENCIES.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Received Date</label>
              <input type="date" value={form.receivedAt} onChange={e=>setForm({...form, receivedAt: e.target.value})} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button id="btn-save-income" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{width:18,height:18}}/> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default IncomePage;
