import React, { useRef, useState } from 'react';
import {
  Upload, FileSpreadsheet, Download, X, AlertTriangle, CheckCircle2, RotateCcw, Info,
} from 'lucide-react';
import api, { isDemoMode } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  parseImportFile, toPayload, countIncluded, downloadFullTemplate, downloadSectionTemplate,
  SECTION_KEYS, SECTION_LABELS,
  type ParsedImport, type ParsedRow, type SectionKey, type SectionData,
} from '../../utils/importParser';
import type { ImportResult } from '../../types';
import './ImportDataModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a successful import so the page can reload its data */
  onImported?: (result: ImportResult) => void;
  /** Section the user opened the importer from (used for ambiguous single sheets & CSV template) */
  defaultSection?: SectionKey;
}

const MAX_ROWS = 5000;
const PREVIEW_LIMIT = 200;

const ImportDataModal: React.FC<Props> = ({ open, onClose, onImported, defaultSection = 'expenses' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [tab, setTab] = useState<SectionKey>(defaultSection);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [, force] = useState(0);

  const reset = () => {
    setParsed(null); setResult(null); setError(''); setTab(defaultSection);
    if (inputRef.current) inputRef.current.value = '';
  };
  const close = () => { reset(); onClose(); };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setResult(null);
    if (file.size > 10 * 1024 * 1024) { setError('That file is larger than 10 MB. Split it into smaller files.'); return; }
    setParsing(true);
    try {
      const p = await parseImportFile(file, defaultSection);
      setParsed(p);
      const first = SECTION_KEYS.find((k) => p[k].length > 0);
      setTab(p[defaultSection].length > 0 ? defaultSection : first ?? defaultSection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this file.');
    } finally {
      setParsing(false);
    }
  };

  // Rows are toggled in place (force re-render), so derive counts on every render
  const totals = parsed
    ? (Object.fromEntries(SECTION_KEYS.map((k) => [k, countIncluded(parsed, k)])) as Record<SectionKey, number>)
    : null;
  const totalIncluded = totals ? Object.values(totals).reduce((s, n) => s + n, 0) : 0;
  const tooMany = totals ? SECTION_KEYS.filter((k) => totals[k] > MAX_ROWS) : [];

  const toggleRow = (row: ParsedRow<unknown>) => { row.include = !row.include; force((n) => n + 1); };
  const toggleAll = (k: SectionKey, include: boolean) => {
    if (!parsed) return;
    (parsed[k] as ParsedRow<unknown>[]).forEach((r) => { r.include = include; });
    force((n) => n + 1);
  };

  const doImport = async () => {
    if (!parsed || totalIncluded === 0) return;
    setImporting(true); setError('');
    try {
      const { data } = await api.post('/import', toPayload(parsed, skipDuplicates), { timeout: 120000 });
      setResult(data.data as ImportResult);
      onImported?.(data.data as ImportResult);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Import failed. Please check the file and try again.'));
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  const sectionErrors = parsed?.errors.filter((e) => e.section === tab || e.section === 'unknown') ?? [];

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-card import-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="import-title">
        <div className="import-head">
          <div>
            <h2 id="import-title"><FileSpreadsheet size={20} /> Import from Excel / CSV</h2>
            <p>Upload expenses, income, budgets, obligations and goals in one go — or a plain bank statement.</p>
          </div>
          <button className="import-close" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>

        {/* ── Step 3: result ───────────────────────────────────────────── */}
        {result ? (
          <div className="import-result">
            <CheckCircle2 size={42} color="var(--success)" />
            <h3>Imported {result.total} record{result.total === 1 ? '' : 's'}</h3>
            <div className="import-result-grid">
              {SECTION_KEYS.map((k) => (
                <div key={k} className="import-result-cell">
                  <span>{SECTION_LABELS[k]}</span>
                  <strong>{result.created[k]}</strong>
                  {result.skipped[k] > 0 && <small>{result.skipped[k]} duplicate{result.skipped[k] === 1 ? '' : 's'} skipped</small>}
                </div>
              ))}
            </div>
            {isDemoMode() && <p className="import-note"><Info size={14} /> Demo mode: imported data is stored in this browser only.</p>}
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}><RotateCcw size={15} /> Import another file</button>
              <button className="btn btn-primary" onClick={close}>Done</button>
            </div>
          </div>
        ) : !parsed ? (
          /* ── Step 1: choose file ─────────────────────────────────────── */
          <>
            <div
              className={`import-drop ${dragOver ? 'drag' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            >
              {parsing ? <span className="spinner" /> : <Upload size={30} color="var(--primary-600)" />}
              <strong>{parsing ? 'Reading file…' : 'Drop a file here or click to browse'}</strong>
              <span>.xlsx, .xls, .csv or .json · up to 10 MB</span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.csv,.txt,.json,.ods"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <div className="import-help">
              <div>
                <strong>Not sure about the format?</strong>
                <p>Start from a template. Column names are flexible (Date, Amount, Narration, Debit/Credit…), dates can be DD/MM/YYYY, and words like Swiggy, Uber or Netflix are categorised automatically.</p>
              </div>
              <div className="import-help-buttons">
                <button className="btn btn-secondary btn-sm" onClick={downloadFullTemplate}><Download size={14} /> Full template (.xlsx)</button>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadSectionTemplate(defaultSection)}><Download size={14} /> {SECTION_LABELS[defaultSection]} only (.csv)</button>
              </div>
            </div>
            {error && <div className="alert-bar alert-bar-danger" style={{ marginTop: '1rem' }}><AlertTriangle size={16} />{error}</div>}
          </>
        ) : (
          /* ── Step 2: preview & confirm ───────────────────────────────── */
          <>
            <div className="import-file-row">
              <span><FileSpreadsheet size={15} /> <strong>{parsed.fileName}</strong></span>
              <button className="link-button" onClick={reset}>Choose a different file</button>
            </div>

            <div className="import-sheets">
              {parsed.sheets.map((s) => (
                <span key={s.name} className="import-sheet-chip" title={`${s.rows} rows`}>
                  {s.name}: <em>{s.detectedAs}</em>
                </span>
              ))}
            </div>

            {parsed.warnings.map((w) => (
              <div key={w} className="alert-bar alert-bar-warning" style={{ marginBottom: '0.6rem' }}><AlertTriangle size={16} />{w}</div>
            ))}

            <div className="import-tabs" role="tablist">
              {SECTION_KEYS.map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  className={`import-tab ${tab === k ? 'active' : ''}`}
                  onClick={() => setTab(k)}
                >
                  {SECTION_LABELS[k]}
                  <span className="import-tab-count">{totals?.[k] ?? 0}</span>
                  {parsed.errors.some((e) => e.section === k) && <span className="import-tab-err" title="Some rows have problems">!</span>}
                </button>
              ))}
            </div>

            <SectionPreview parsed={parsed} section={tab} onToggle={toggleRow} onToggleAll={toggleAll} />

            {sectionErrors.length > 0 && (
              <details className="import-errors" open={sectionErrors.length <= 5}>
                <summary><AlertTriangle size={14} /> {sectionErrors.length} row{sectionErrors.length === 1 ? '' : 's'} couldn't be read and will be skipped</summary>
                <ul>
                  {sectionErrors.slice(0, 100).map((e, i) => (
                    <li key={i}><strong>{e.sheet} · row {e.row}:</strong> {e.message}</li>
                  ))}
                  {sectionErrors.length > 100 && <li>…and {sectionErrors.length - 100} more</li>}
                </ul>
              </details>
            )}

            {tooMany.length > 0 && (
              <div className="alert-bar alert-bar-danger" style={{ marginTop: '0.75rem' }}>
                <AlertTriangle size={16} />
                {tooMany.map((k) => SECTION_LABELS[k]).join(', ')} has more than {MAX_ROWS.toLocaleString('en-IN')} rows. Split the file and import it in parts.
              </div>
            )}
            {error && <div className="alert-bar alert-bar-danger" style={{ marginTop: '0.75rem' }}><AlertTriangle size={16} />{error}</div>}

            <div className="import-footer">
              <label className="import-check">
                <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                Skip records that already exist (safe to re-upload)
              </label>
              <div className="import-actions">
                <button className="btn btn-secondary" onClick={close}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={doImport}
                  disabled={importing || totalIncluded === 0 || tooMany.length > 0}
                >
                  {importing ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Importing…</> : <>Import {totalIncluded} record{totalIncluded === 1 ? '' : 's'}</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const COLUMNS: { [K in SectionKey]: { label: string; render: (d: SectionData[K]) => React.ReactNode; align?: 'right' }[] } = {
  expenses: [
    { label: 'Date', render: (d) => formatDate(d.spentAt) },
    { label: 'Category', render: (d) => <span className="badge badge-primary">{d.category}</span> },
    { label: 'Description', render: (d) => d.description || '—' },
    { label: 'Method', render: (d) => d.paymentMethod.replace('_', ' ') },
    { label: 'Amount', render: (d) => formatCurrency(d.amount), align: 'right' },
  ],
  incomes: [
    { label: 'Date', render: (d) => formatDate(d.receivedAt) },
    { label: 'Source', render: (d) => d.source },
    { label: 'Frequency', render: (d) => d.frequency.replace('_', ' ') },
    { label: 'Amount', render: (d) => formatCurrency(d.amount), align: 'right' },
  ],
  budgets: [
    { label: 'Month', render: (d) => new Date(d.year, d.month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) },
    { label: 'Total', render: (d) => (d.totalBudget ? formatCurrency(d.totalBudget) : 'Sum of categories') },
    { label: 'Category limits', render: (d) => d.categories.map((c) => `${c.category} ${formatCurrency(c.limit)}`).join(' · ') || '—' },
  ],
  obligations: [
    { label: 'Name', render: (d) => d.name },
    { label: 'Type', render: (d) => d.type },
    { label: 'Due', render: (d) => formatDate(d.dueDate) },
    { label: 'Frequency', render: (d) => d.frequency.replace('_', ' ') },
    { label: 'Paid', render: (d) => (d.isPaid ? 'Yes' : 'No') },
    { label: 'Amount', render: (d) => formatCurrency(d.amount), align: 'right' },
  ],
  goals: [
    { label: 'Goal', render: (d) => d.name },
    { label: 'Category', render: (d) => d.category },
    { label: 'Priority', render: (d) => d.priority },
    { label: 'Deadline', render: (d) => (d.deadline ? formatDate(d.deadline) : '—') },
    { label: 'Saved', render: (d) => formatCurrency(d.currentAmount), align: 'right' },
    { label: 'Target', render: (d) => formatCurrency(d.targetAmount), align: 'right' },
  ],
};

const SectionPreview: React.FC<{
  parsed: ParsedImport;
  section: SectionKey;
  onToggle: (row: ParsedRow<unknown>) => void;
  onToggleAll: (k: SectionKey, include: boolean) => void;
}> = ({ parsed, section, onToggle, onToggleAll }) => {
  const rows = parsed[section] as ParsedRow<unknown>[];
  const cols = COLUMNS[section] as { label: string; render: (d: unknown) => React.ReactNode; align?: 'right' }[];
  if (rows.length === 0) {
    return <div className="import-empty">No {SECTION_LABELS[section].toLowerCase()} found in this file.</div>;
  }
  const allOn = rows.every((r) => r.include);
  return (
    <div className="import-preview table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <input type="checkbox" checked={allOn} onChange={() => onToggleAll(section, !allOn)} aria-label="Include all rows" />
            </th>
            {cols.map((c) => <th key={c.label} style={{ textAlign: c.align ?? 'left' }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, PREVIEW_LIMIT).map((r, i) => (
            <tr key={i} className={r.include ? '' : 'excluded'}>
              <td><input type="checkbox" checked={r.include} onChange={() => onToggle(r)} aria-label={`Include row ${r.row}`} /></td>
              {cols.map((c) => <td key={c.label} style={{ textAlign: c.align ?? 'left' }}>{c.render(r.data)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > PREVIEW_LIMIT && <p className="import-more">Showing the first {PREVIEW_LIMIT} of {rows.length} rows — all included rows will be imported.</p>}
      {rows.some((r) => r.note) && (
        <p className="import-more">Notes: {Array.from(new Set(rows.filter((r) => r.note).map((r) => r.note))).slice(0, 4).join('; ')}</p>
      )}
    </div>
  );
};

export default ImportDataModal;
