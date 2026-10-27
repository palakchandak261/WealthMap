import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus, Pencil, Trash2, ShoppingCart, AlertCircle,
  Filter, TrendingDown, Search, Upload, Download,
  FileSpreadsheet, Check, X, CheckCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { loadMockStore, saveMockStore } from '../../services/mockData';
import { getApiErrorMessage } from '../../utils/apiErrors';
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
  FOOD: '#2FA77A', TRANSPORT: '#218565', SHOPPING: '#7C9B8C',
  ENTERTAINMENT: '#E7A83E', HEALTH: '#5C9CB5', EDUCATION: '#176E53',
  UTILITIES: '#9B6412', RENT: '#53675F', EMI: '#B83B3B',
  INSURANCE: '#6A8A77', TRAVEL: '#4D8C70', OTHER: '#82928B',
};

interface ParsedExpenseRow {
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  isRecurring: boolean;
  spentAt: string;
}

const ExpensesPage: React.FC = () => {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');
  const [search, setSearch] = useState('');

  // ── CSV / Excel Upload state ───────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedExpenseRow[]>([]);
  const [fullProjectData, setFullProjectData] = useState<any | null>(null);
  const [isFullProject, setIsFullProject] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses');
      setItems(data.data?.items ?? data.data ?? []);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not load expense records.'));
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
      if (editItem) await api.patch(`/expenses/${editItem.id}`, payload);
      else await api.post('/expenses', payload);
      setShowModal(false);
      fetchData();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not save this expense.'));
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
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not delete this expense.'));
    }
  };

  // ── CSV & Excel Parsing Logic ──────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  const processUploadedFile = async (file: File) => {
    setUploadFile(file);
    setUploadError('');
    setParsedRows([]);
    setFullProjectData(null);
    setIsFullProject(false);

    try {
      const filename = file.name.toLowerCase();

      // 1. JSON file (supports full project backup or expenses array)
      if (filename.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);

        if (json.expenses && Array.isArray(json.expenses)) {
          // Full project format
          setIsFullProject(true);
          setFullProjectData(json);
          parseRowsFromObjects(json.expenses);
        } else if (Array.isArray(json)) {
          parseRowsFromObjects(json);
        } else {
          throw new Error('Unrecognized JSON format. Expected an array of expenses or full project backup.');
        }
        return;
      }

      // 2. CSV or Excel (.xlsx, .xls) via XLSX library
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

      // Check if multi-sheet workbook representing full project
      const sheetNames = workbook.SheetNames;
      const expenseSheetName = sheetNames.find(s => s.toLowerCase().includes('expense')) ?? sheetNames[0];
      const sheet = workbook.Sheets[expenseSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('The uploaded sheet is empty or contains no readable rows.');
      }

      // Also check if there are other sheets like Incomes, Budgets, Obligations, Goals
      const hasMultipleSheets = sheetNames.some(s => s.toLowerCase().includes('goal') || s.toLowerCase().includes('income'));
      if (hasMultipleSheets) {
        const fullBackup: any = { expenses: rawRows };
        sheetNames.forEach(name => {
          const lower = name.toLowerCase();
          if (lower.includes('income')) fullBackup.incomes = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
          if (lower.includes('goal')) fullBackup.goals = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
          if (lower.includes('obligation')) fullBackup.obligations = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
          if (lower.includes('budget')) fullBackup.budgets = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
        });
        setFullProjectData(fullBackup);
        setIsFullProject(true);
      }

      parseRowsFromObjects(rawRows);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse file. Please verify column headers and file format.');
    }
  };

  const parseRowsFromObjects = (rawObjects: any[]) => {
    const parsed: ParsedExpenseRow[] = [];

    for (const row of rawObjects) {
      // Find matching keys dynamically (case-insensitive)
      const findKey = (candidates: string[]) => {
        const found = Object.keys(row).find(k => candidates.includes(k.trim().toLowerCase().replace(/[\s_-]/g, '')));
        return found ? row[found] : undefined;
      };

      const rawAmount = findKey(['amount', 'spent', 'debit', 'cost', 'price', 'val', 'value']);
      const rawCategory = findKey(['category', 'cat', 'type', 'head', 'tag']);
      const rawDesc = findKey(['description', 'desc', 'narration', 'note', 'details', 'merchant', 'title', 'item']);
      const rawDate = findKey(['date', 'spentat', 'txndate', 'time', 'spent_at', 'timestamp']);
      const rawMethod = findKey(['paymentmethod', 'payment', 'method', 'mode', 'channel', 'paidvia']);
      const rawRecurring = findKey(['isrecurring', 'recurring', 'repeat', 'subscription']);

      // Normalize amount
      let cleanAmount = 0;
      if (typeof rawAmount === 'number') {
        cleanAmount = Math.abs(rawAmount);
      } else if (rawAmount) {
        cleanAmount = Math.abs(parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, '')) || 0);
      }
      if (cleanAmount <= 0) continue; // Skip invalid or zero amounts

      // Normalize category
      let category = 'OTHER';
      if (rawCategory) {
        const catUpper = String(rawCategory).trim().toUpperCase();
        const matched = CATEGORIES.find(c => c === catUpper || catUpper.includes(c));
        category = matched ?? 'OTHER';
      }

      // Normalize date
      let spentAt = new Date().toISOString();
      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          spentAt = parsedDate.toISOString();
        }
      }

      // Normalize payment method
      let paymentMethod = 'OTHER';
      if (rawMethod) {
        const methodUpper = String(rawMethod).trim().toUpperCase();
        paymentMethod = PAYMENT_METHODS.find(m => methodUpper.includes(m)) ?? 'OTHER';
      }

      parsed.push({
        category,
        amount: cleanAmount,
        description: rawDesc ? String(rawDesc).trim() : 'Imported transaction',
        paymentMethod,
        isRecurring: Boolean(rawRecurring && String(rawRecurring).toLowerCase() !== 'false'),
        spentAt,
      });
    }

    if (parsed.length === 0) {
      throw new Error('Could not find any valid expense rows. Please ensure your file has columns like Date, Category, and Amount.');
    }

    setParsedRows(parsed);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setUploadError('');

    try {
      // Send to bulk endpoint
      await api.post('/expenses/bulk', { items: parsedRows });

      // If full financial project was detected in the sheet, update other sections
      if (isFullProject && fullProjectData) {
        try {
          const store = loadMockStore();
          if (Array.isArray(fullProjectData.incomes)) store.incomes.push(...fullProjectData.incomes);
          if (Array.isArray(fullProjectData.goals)) store.goals.push(...fullProjectData.goals);
          if (Array.isArray(fullProjectData.obligations)) store.obligations.push(...fullProjectData.obligations);
          saveMockStore(store);
        } catch (e) {
          console.warn('Could not save extra project sheets', e);
        }
      }

      setShowUploadModal(false);
      setSuccessMsg(`Successfully imported ${parsedRows.length} expense transactions!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      await fetchData();
    } catch (err: any) {
      setUploadError(getApiErrorMessage(err, 'Failed to import expenses.'));
    } finally {
      setIsImporting(false);
    }
  };

  const removeParsedRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  // ── Download Sample CSV Template ──────────────────────────────────────────
  const downloadSampleTemplate = () => {
    const csvContent =
      'Date,Category,Amount,Description,Payment Method,Recurring\n' +
      `${new Date().toISOString().slice(0, 10)},FOOD,850,Lunch at Green Bistro,UPI,false\n` +
      `${new Date().toISOString().slice(0, 10)},TRANSPORT,350,Cab to office/college,UPI,false\n` +
      `${new Date().toISOString().slice(0, 10)},SHOPPING,1999,Wireless mouse & stationery,CARD,false\n` +
      `${new Date().toISOString().slice(0, 10)},UTILITIES,1450,Mobile & Broadband bill,NET_BANKING,true\n` +
      `${new Date().toISOString().slice(0, 10)},ENTERTAINMENT,499,Movie ticket,CARD,false\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'wealthmap_expenses_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Export Existing Expenses as CSV ────────────────────────────────────────
  const exportExpensesAsCsv = () => {
    if (items.length === 0) {
      alert('No expenses to export.');
      return;
    }
    const header = 'Date,Category,Amount,Description,Payment Method,Recurring\n';
    const rows = items.map(item =>
      `"${item.spentAt.slice(0, 10)}","${item.category}",${item.amount},"${(item.description || '').replace(/"/g, '""')}","${item.paymentMethod}",${item.isRecurring}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wealthmap_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Filtered expenses ──────────────────────────────────────────────────────
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
            <p>Track, manage, and import your transactions</p>
          </div>
          <div className="header-actions-group">
            <button
              id="btn-upload-sheet"
              className="btn btn-secondary"
              onClick={() => { setShowUploadModal(true); setParsedRows([]); setUploadFile(null); setUploadError(''); }}
            >
              <Upload size={16} /> Upload CSV / Excel
            </button>
            <button
              id="btn-export-csv"
              className="btn btn-secondary"
              onClick={exportExpensesAsCsv}
              title="Download your expenses as CSV spreadsheet"
            >
              <Download size={16} /> Export CSV
            </button>
            <button id="btn-add-expense" className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="alert-bar alert-bar-success fade-in" style={{ marginBottom: '1rem' }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {error && !showModal && !showUploadModal && (
        <div className="alert-bar alert-bar-danger" role="alert" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} />{error}
        </div>
      )}

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
            placeholder="Search expenses by merchant, description, category…"
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
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add manually</button>
              <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)}>
                <Upload size={16} /> Upload CSV/Excel
              </button>
            </div>
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

      {/* ── MODAL: MANUAL ADD/EDIT EXPENSE ──────────────────────────────────── */}
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

      {/* ── MODAL: UPLOAD CSV / EXCEL ────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0 }}>Upload CSV or Excel Spreadsheet</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Directly upload and retrieve expenses or full project data
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUploadModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="divider" />

            {uploadError && (
              <div className="alert-bar alert-bar-danger" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={15} />{uploadError}
              </div>
            )}

            {/* Dropzone */}
            <div
              className="upload-dropzone"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className="upload-dropzone-icon">
                <FileSpreadsheet size={26} />
              </div>
              {uploadFile ? (
                <div>
                  <strong>{uploadFile.name}</strong>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {(uploadFile.size / 1024).toFixed(1)} KB — Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <strong>Drag and drop your spreadsheet here</strong>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Supports Excel (.xlsx, .xls), CSV (.csv), or JSON backup (.json)
                  </p>
                </div>
              )}
            </div>

            {/* Sample Template Download */}
            <div className="template-download-row">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Need a template?</span>
              <button type="button" className="template-btn" onClick={downloadSampleTemplate}>
                <Download size={13} /> Download Sample Expenses CSV
              </button>
            </div>

            {/* Full project notice */}
            {isFullProject && (
              <div className="alert-bar alert-bar-primary" style={{ marginTop: '0.85rem' }}>
                <Check size={15} /> Full project detected! This file includes multiple data sections (incomes, expenses, obligations, goals).
              </div>
            )}

            {/* Preview of Parsed Rows */}
            {parsedRows.length > 0 && (
              <div className="preview-container">
                <div className="preview-header-bar">
                  <span>Parsed Transactions ({parsedRows.length})</span>
                  <span style={{ color: 'var(--danger-dark)' }}>
                    Total: {formatCurrency(parsedRows.reduce((s, r) => s + r.amount, 0))}
                  </span>
                </div>
                <div className="preview-scroll-table">
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(row.spentAt)}</td>
                          <td>
                            <span className="cat-badge">
                              <span className="cat-dot" style={{ background: categoryColors[row.category] || '#888' }} />
                              {row.category}
                            </span>
                          </td>
                          <td>{row.description}</td>
                          <td style={{ fontWeight: 700, color: 'var(--danger-dark)' }}>
                            {formatCurrency(row.amount)}
                          </td>
                          <td><span className="badge badge-primary">{row.paymentMethod}</span></td>
                          <td>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.2rem', color: 'var(--danger)' }}
                              onClick={() => removeParsedRow(idx)}
                              title="Remove row"
                            >
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                Cancel
              </button>
              <button
                id="btn-confirm-import"
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={parsedRows.length === 0 || isImporting}
              >
                {isImporting ? (
                  <span className="spinner" style={{ width: 18, height: 18 }} />
                ) : (
                  <><Check size={16} /> Import {parsedRows.length} Expenses</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
