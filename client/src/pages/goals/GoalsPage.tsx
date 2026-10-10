import React, { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, AlertCircle, Target, CheckCircle,
  TrendingUp, Calendar, Award,
} from 'lucide-react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Goal, GoalStatus } from '../../types';
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

const GoalsPage: React.FC = () => {
  const [items, setItems] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Goal | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showContribModal, setShowContribModal] = useState(false);
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [contribAmount, setContribAmount] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/goals');
      setItems(data.data?.items ?? data.data ?? []);
    } catch (error) { setError(getApiErrorMessage(error, 'Could not load goals.')); }
    finally { setLoading(false); }
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
      setShowModal(false); fetchData();
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

  const handleContrib = async () => {
    if (!contribGoal || !contribAmount) return;
    setError('');
    const amount = Math.min(
      parseFloat(contribAmount),
      Number(contribGoal.targetAmount) - Number(contribGoal.currentAmount),
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a positive amount that does not exceed the remaining goal.');
      return;
    }
    try {
      await api.patch(`/goals/${contribGoal.id}/contribute`, { amount });
      setShowContribModal(false);
      await fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not update this goal contribution.'));
    }
  };

  const totalTarget = items.filter(g => g.status === 'ACTIVE').reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalSaved = items.filter(g => g.status === 'ACTIVE').reduce((s, g) => s + Number(g.currentAmount), 0);
  const activeGoals = items.filter(g => g.status === 'ACTIVE');
  const otherGoals = items.filter(g => g.status !== 'ACTIVE');

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Goals</h1>
            <p>Set and track your savings targets</p>
          </div>
          <button id="btn-add-goal" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Goal
          </button>
        </div>
      </div>

      {error && !showModal && !showContribModal && <div className="alert-bar alert-bar-danger" role="alert" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}

      {/* Summary */}
      <div className="goals-summary-row">
        <div className="summary-card neu-raised">
          <div className="summary-icon" style={{ background: 'var(--primary-100)' }}>
            <Target size={24} color="var(--primary-700)" />
          </div>
          <div>
            <div className="stat-number">{formatCurrency(totalSaved)}</div>
            <p className="text-muted">Saved of {formatCurrency(totalTarget)} target</p>
          </div>
        </div>
        {totalTarget > 0 && (
          <div className="summary-card neu-raised">
            <div className="summary-icon" style={{ background: 'var(--success-light)' }}>
              <Award size={24} color="var(--success-dark)" />
            </div>
            <div>
              <div className="stat-number">{((totalSaved / totalTarget) * 100).toFixed(0)}%</div>
              <p className="text-muted">Overall Goal Progress</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-row"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Target size={56} color="var(--text-muted)" />
          <h3>No goals yet</h3>
          <p>Set a savings goal — vacation, emergency fund, gadget, or anything!</p>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add your first goal</button>
        </div>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Active Goals ({activeGoals.length})
              </h3>
              <div className="goals-grid fade-in">
                {activeGoals.map(goal => {
                  const pct = Number(goal.targetAmount) > 0
                    ? Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)
                    : 0;
                  const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
                  const isNearDeadline = goal.deadline && (() => {
                    const d = new Date(goal.deadline!);
                    const now = new Date();
                    return (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 30;
                  })();

                  return (
                    <div key={goal.id} className="neu-raised goal-card">
                      <div className="goal-card-top">
                        <span className={`badge ${statusConfig[goal.status].cls}`}>
                          {statusConfig[goal.status].label}
                        </span>
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
                            {formatCurrency(Number(goal.currentAmount))}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Target</span>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                            {formatCurrency(Number(goal.targetAmount))}
                          </div>
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

                      {goal.deadline && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.8rem', color: isNearDeadline ? 'var(--warning-dark)' : 'var(--text-muted)' }}>
                            Deadline: {formatDate(goal.deadline)}
                          </span>
                        </div>
                      )}

                      {pct < 100 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <TrendingUp size={12} style={{ marginRight: 4 }} />
                          {formatCurrency(remaining)} to go
                        </div>
                      )}

                      <button
                        id={`btn-contribute-${goal.id}`}
                        className="btn btn-primary btn-full"
                        style={{ marginTop: '1rem' }}
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
                              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(goal)}><Pencil size={14} /></button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(goal.id)}><Trash2 size={14} /></button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{editItem ? 'Edit Goal' : 'Add Goal'}</h3>
            <div className="divider" />
            {error && <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} />{error}</div>}
            <div className="form-group">
              <label>Goal Name</label>
              <input placeholder="e.g. Emergency Fund, Vacation, MacBook" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Target Amount (₹)</label>
                <input type="number" placeholder="0" min="0" value={form.targetAmount}
                  onChange={e => setForm({ ...form, targetAmount: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Current Amount (₹)</label>
                <input type="number" placeholder="0" min="0" value={form.currentAmount}
                  onChange={e => setForm({ ...form, currentAmount: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Deadline <span className="text-muted">(optional)</span></label>
                <input type="date" value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as GoalStatus })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="btn-save-goal" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {showContribModal && contribGoal && (
        <div className="modal-backdrop" onClick={() => setShowContribModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Add to "{contribGoal.name}"</h3>
            <div className="divider" />
            <p className="text-muted" style={{ marginBottom: '1rem' }}>
              Current: {formatCurrency(Number(contribGoal.currentAmount))} / {formatCurrency(Number(contribGoal.targetAmount))}
            </p>
            <div className="form-group">
              <label>Contribution Amount (₹)</label>
              <input type="number" placeholder="0" min="0" value={contribAmount}
                onChange={e => setContribAmount(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowContribModal(false)}>Cancel</button>
              <button id="btn-save-contribution" className="btn btn-primary" onClick={handleContrib}>
                Add ₹{contribAmount || '0'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
