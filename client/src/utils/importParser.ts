/**
 * Spreadsheet Import Parser (CSV / Excel / JSON)
 * ──────────────────────────────────────────────
 * Turns any reasonable spreadsheet into WealthMap records:
 *   • A WealthMap template workbook (sheets: Expenses, Income, Budgets, Obligations, Goals)
 *   • A single-sheet CSV/Excel of expenses (any column names — "Date", "Amount", "Narration"…)
 *   • A bank statement with Debit / Credit columns (debits → expenses, credits → income)
 *   • A mixed sheet with a "Section" / "Record type" column
 *   • A JSON export from WealthMap
 *
 * Indian formats are understood: dd/mm/yyyy dates, ₹1,00,000 amounts, "Dr"/"Cr",
 * GPay/PhonePe/Paytm (→ UPI), NEFT/IMPS (→ Net banking) and common category words.
 * Each row is validated; bad rows are reported with sheet + row number.
 */
import * as XLSX from 'xlsx';
import type { GoalCategory, GoalPriority, Frequency, ObligationType } from '../types';

export type SectionKey = 'expenses' | 'incomes' | 'budgets' | 'obligations' | 'goals';
export const SECTION_KEYS: SectionKey[] = ['expenses', 'incomes', 'budgets', 'obligations', 'goals'];
export const SECTION_LABELS: Record<SectionKey, string> = {
  expenses: 'Expenses', incomes: 'Income', budgets: 'Budgets', obligations: 'Obligations', goals: 'Goals',
};

export const EXPENSE_CATEGORIES = [
  'FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH', 'EDUCATION',
  'UTILITIES', 'RENT', 'EMI', 'INSURANCE', 'TRAVEL', 'OTHER',
] as const;

export interface ImportExpense { category: string; amount: number; description?: string; paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'OTHER'; isRecurring: boolean; spentAt: string }
export interface ImportIncome { source: string; amount: number; frequency: Frequency; isRecurring: boolean; receivedAt: string }
export interface ImportObligation { name: string; type: ObligationType; amount: number; dueDate: string; frequency: Frequency; isRecurring: boolean; isPaid: boolean }
export interface ImportGoal { name: string; targetAmount: number; currentAmount: number; deadline: string | null; category: GoalCategory; priority: GoalPriority; inflationRate: number | null; status?: 'ACTIVE' | 'COMPLETED' | 'PAUSED' }
export interface ImportBudget { month: number; year: number; totalBudget: number | null; categories: { category: string; limit: number }[] }

export interface SectionData {
  expenses: ImportExpense;
  incomes: ImportIncome;
  budgets: ImportBudget;
  obligations: ImportObligation;
  goals: ImportGoal;
}

export interface ParsedRow<T> { data: T; sheet: string; row: number; include: boolean; note?: string }
export interface RowIssue { section: SectionKey | 'unknown'; sheet: string; row: number; message: string }

export interface ParsedImport {
  fileName: string;
  expenses: ParsedRow<ImportExpense>[];
  incomes: ParsedRow<ImportIncome>[];
  budgets: ParsedRow<ImportBudget>[];
  obligations: ParsedRow<ImportObligation>[];
  goals: ParsedRow<ImportGoal>[];
  errors: RowIssue[];
  warnings: string[];
  sheets: { name: string; detectedAs: string; rows: number }[];
}

export interface ImportPayload {
  expenses: ImportExpense[];
  incomes: ImportIncome[];
  budgets: ImportBudget[];
  obligations: ImportObligation[];
  goals: ImportGoal[];
  options: { skipDuplicates: boolean };
}

type RawRow = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Value parsers
// ─────────────────────────────────────────────────────────────────────────────
export const normKey = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const isBlank = (v: unknown) => str(v) === '';

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const fullYear = (y: number) => (y < 100 ? 2000 + y : y);
const validYmd = (y: number, m: number, d: number) => {
  if (!(y >= 1900 && y <= 2200 && m >= 0 && m <= 11 && d >= 1 && d <= 31)) return null;
  const dt = new Date(y, m, d, 12, 0, 0);
  return dt.getMonth() === m ? dt : null;     // rejects 31 Feb etc.
};

/** Parse a date cell. Day-first (Indian) unless the value is unambiguously month-first. Returns local-noon Date. */
export const parseDate = (v: unknown): Date | null => {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : validYmd(v.getFullYear(), v.getMonth(), v.getDate());
  if (typeof v === 'number') {
    if (v >= 19000101 && v <= 22001231 && Number.isInteger(v)) {          // 20261105
      return validYmd(Math.floor(v / 10000), Math.floor(v / 100) % 100 - 1, v % 100);
    }
    if (v > 20000 && v < 80000) {                                          // Excel serial date
      const ms = Math.round((v - 25569) * 86400) * 1000;
      const d = new Date(ms);
      return validYmd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    return null;
  }
  const s = str(v).replace(/(\d)(st|nd|rd|th)\b/gi, '$1').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return parseDate(Number(s));

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/);                 // 2026-11-05
  if (m) return validYmd(+m[1], +m[2] - 1, +m[3]);

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T].*)?$/);                     // 05/11/2026
  if (m) {
    const a = +m[1], b = +m[2], y = fullYear(+m[3]);
    if (a > 12 || b <= 12) return validYmd(y, b - 1, a);                                // day-first
    return validYmd(y, a - 1, b);                                                        // 11/25/2026 (US)
  }

  m = s.match(/^(\d{1,2})[ -/]?([a-z]{3,9})[ -/]?(\d{2,4})$/i);                         // 5 Nov 2026, 05-Nov-26
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) return validYmd(fullYear(+m[3]), MONTHS[m[2].toLowerCase()], +m[1]);

  m = s.match(/^([a-z]{3,9})[ -/]?(\d{1,2})[ -/]+(\d{2,4})$/i);                         // Nov 5 2026
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) return validYmd(fullYear(+m[3]), MONTHS[m[1].toLowerCase()], +m[2]);

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : validYmd(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
};

export const toIsoNoon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString();

/** "₹1,00,000.50", "(500)", "500 Dr", "Rs. 2,000 CR", "-750" → { value, negative, credit } */
export const parseAmount = (v: unknown): { value: number; negative: boolean; credit: boolean | null } | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? { value: Math.abs(v), negative: v < 0, credit: null } : null;
  let s = str(v);
  if (!s) return null;
  let credit: boolean | null = null;
  if (/\bcr\.?$/i.test(s)) credit = true;
  if (/\bdr\.?$/i.test(s)) credit = false;
  const negative = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s);
  s = s.replace(/(inr|rs\.?|₹|\$|€|£|cr\.?|dr\.?|[()\s,])/gi, '').replace(/^-|-$/g, '');
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const value = Number(s);
  return Number.isFinite(value) ? { value, negative, credit } : null;
};

export const parseBool = (v: unknown, fallback: boolean): boolean => {
  if (typeof v === 'boolean') return v;
  const s = normKey(v);
  if (!s) return fallback;
  if (['yes', 'y', 'true', '1', 'paid', 'done', 'completed', 'recurring', 'x', 'settled'].includes(s)) return true;
  if (['no', 'n', 'false', '0', 'unpaid', 'pending', 'due', 'onetime', 'notpaid', 'open'].includes(s)) return false;
  return fallback;
};

const CATEGORY_WORDS: [string, string[]][] = [
  ['RENT', ['rent', 'houserent', 'housing', 'pg', 'hostel', 'accommodation', 'landlord', 'flatrent']],
  ['EMI', ['emi', 'loanemi', 'installment', 'instalment']],
  ['INSURANCE', ['insurance', 'premium', 'lic', 'policy', 'mediclaim']],
  ['UTILITIES', ['utilities', 'utility', 'electricity', 'water', 'gas', 'lpg', 'internet', 'wifi', 'broadband', 'mobile', 'phone', 'recharge', 'bill', 'bills', 'dth', 'jio', 'airtel', 'postpaid', 'prepaid']],
  ['FOOD', ['food', 'groceries', 'grocery', 'dining', 'restaurant', 'swiggy', 'zomato', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'snacks', 'eatingout', 'fooddining', 'blinkit', 'zepto', 'bigbasket', 'vegetables', 'veggies', 'milk', 'dairy', 'meal', 'canteen', 'mess', 'tea']],
  ['TRANSPORT', ['transport', 'transportation', 'fuel', 'petrol', 'diesel', 'uber', 'ola', 'rapido', 'metro', 'bus', 'cab', 'taxi', 'auto', 'rickshaw', 'commute', 'parking', 'toll', 'fastag', 'conveyance']],
  ['TRAVEL', ['travel', 'trip', 'vacation', 'holiday', 'flight', 'hotel', 'train', 'irctc', 'makemytrip', 'goibibo', 'airbnb', 'tour']],
  ['HEALTH', ['health', 'medical', 'medicine', 'medicines', 'pharmacy', 'doctor', 'hospital', 'gym', 'fitness', 'healthcare', 'clinic', 'dental', 'vitamins', 'pharmeasy', 'apollo']],
  ['EDUCATION', ['education', 'course', 'courses', 'tuition', 'fees', 'fee', 'books', 'book', 'textbook', 'textbooks', 'college', 'school', 'exam', 'udemy', 'coursera', 'stationery', 'study', 'coaching']],
  ['ENTERTAINMENT', ['entertainment', 'movie', 'movies', 'cinema', 'netflix', 'spotify', 'prime', 'hotstar', 'subscription', 'subscriptions', 'ott', 'games', 'gaming', 'music', 'concert', 'party', 'bookmyshow', 'youtube']],
  ['SHOPPING', ['shopping', 'amazon', 'flipkart', 'myntra', 'ajio', 'clothes', 'clothing', 'apparel', 'electronics', 'gadgets', 'shoes', 'meesho', 'nykaa', 'mall']],
  ['OTHER', ['other', 'others', 'misc', 'miscellaneous', 'general', 'uncategorized', 'uncategorised']],
];

/** Map a category label (or, failing that, a description) to a WealthMap category. */
export const normalizeCategory = (category: unknown, description?: unknown): { category: string; matched: boolean } => {
  const key = normKey(category);
  if (key) {
    const exact = EXPENSE_CATEGORIES.find((c) => normKey(c) === key);
    if (exact) return { category: exact, matched: true };
    for (const [cat, words] of CATEGORY_WORDS) if (words.includes(key)) return { category: cat, matched: true };
    for (const [cat, words] of CATEGORY_WORDS) if (words.some((w) => w.length > 3 && key.includes(w))) return { category: cat, matched: true };
  }
  const desc = str(description).toLowerCase();
  if (desc) {
    const tokens = desc.split(/[^a-z0-9]+/).filter(Boolean);
    for (const [cat, words] of CATEGORY_WORDS) {
      if (cat === 'OTHER') continue;
      if (tokens.some((tk) => words.includes(tk))) return { category: cat, matched: !key };
    }
  }
  return { category: 'OTHER', matched: !key };
};

export const normalizePaymentMethod = (v: unknown): ImportExpense['paymentMethod'] => {
  const s = normKey(v);
  if (!s) return 'OTHER';
  if (/cash/.test(s)) return 'CASH';
  if (/upi|gpay|googlepay|phonepe|paytm|bhim|amazonpay|whatsapppay/.test(s)) return 'UPI';
  if (/card|visa|mastercard|rupay|amex|credit|debit/.test(s)) return 'CARD';
  if (/net|neft|imps|rtgs|banktransfer|transfer|online|bank/.test(s)) return 'NET_BANKING';
  return 'OTHER';
};

export const normalizeFrequency = (v: unknown, fallback: Frequency = 'MONTHLY'): Frequency => {
  const s = normKey(v);
  if (!s) return fallback;
  if (/^(onetime|once|single|oneoff|adhoc)/.test(s)) return 'ONE_TIME';
  if (/biweek|fortnight|2week/.test(s)) return 'BIWEEKLY';
  if (/week/.test(s)) return 'WEEKLY';
  if (/quarter|3month/.test(s)) return 'QUARTERLY';
  if (/year|annual|perannum|^pa$|12month/.test(s)) return 'YEARLY';
  if (/month|^pm$|^mo$/.test(s)) return 'MONTHLY';
  return fallback;
};

export const normalizeObligationType = (type: unknown, name?: unknown): ObligationType => {
  const s = `${normKey(type)} ${normKey(name)}`;
  if (/emi|installment|instalment/.test(s)) return 'EMI';
  if (/rent|landlord|pg|hostel/.test(s)) return 'RENT';
  if (/insurance|premium|lic|policy|mediclaim/.test(s)) return 'INSURANCE';
  if (/subscription|netflix|spotify|prime|hotstar|gym|membership|ott|youtube/.test(s)) return 'SUBSCRIPTION';
  if (/loan|credit card|creditcard/.test(s)) return 'LOAN';
  if (/bill|electricity|water|gas|internet|wifi|broadband|mobile|phone|postpaid|utility/.test(s)) return 'BILL';
  return 'OTHER';
};

const GOAL_WORDS: [GoalCategory, RegExp][] = [
  ['EMERGENCY', /emergency|rainyday|buffer|contingency/],
  ['EDUCATION', /education|study|studies|mba|college|course|degree|masters|school|fees|tuition/],
  ['TRAVEL', /travel|trip|vacation|holiday|tour|europe|japan|goa|abroad/],
  ['GADGET', /gadget|laptop|phone|mobile|macbook|iphone|ipad|camera|electronics|pc|computer|console|tv/],
  ['VEHICLE', /vehicle|car|bike|scooter|\bev\b|^ev|motorcycle|cycle/],
  ['HOME', /home|house|flat|apartment|property|downpayment|furniture|renovation/],
  ['WEDDING', /wedding|marriage|shaadi/],
  ['HEALTH', /health|medical|surgery|treatment/],
  ['RETIREMENT', /retire|pension|corpus/],
];
export const normalizeGoalCategory = (category: unknown, name?: unknown): GoalCategory => {
  const c = normKey(category);
  const exact = GOAL_WORDS.find(([k]) => normKey(k) === c);
  if (exact) return exact[0];
  for (const [k, re] of GOAL_WORDS) if (c && re.test(c)) return k;
  const n = str(name).toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  for (const [k, re] of GOAL_WORDS) if (re.test(n.replace(/\s+/g, ''))) return k;
  return 'OTHER';
};

export const normalizePriority = (v: unknown): GoalPriority => {
  const s = normKey(v);
  if (/^(high|h|1|urgent|top|critical)/.test(s)) return 'HIGH';
  if (/^(low|l|3|later|optional)/.test(s)) return 'LOW';
  return 'MEDIUM';
};

const parseRate = (v: unknown): number | null => {
  if (isBlank(v)) return null;
  const hasPct = /%/.test(str(v));
  const n = Number(str(v).replace(/[%\s]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  const pct = !hasPct && n > 0 && n < 0.5 ? n * 100 : n;
  return pct <= 50 ? Math.round(pct * 100) / 100 : null;
};

/** "2026-11", "Nov 2026", "November", "11/2026", 11 → { month, year? } */
export const parseMonth = (v: unknown, yearCell?: unknown): { month: number; year: number } | null => {
  const yearFromCell = Number(str(yearCell)) || undefined;
  const fallbackYear = yearFromCell ?? new Date().getFullYear();
  if (v instanceof Date || (typeof v === 'number' && v > 20000)) {
    const d = parseDate(v);
    return d ? { month: d.getMonth() + 1, year: d.getFullYear() } : null;
  }
  const s = str(v).toLowerCase();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) return +m[2] >= 1 && +m[2] <= 12 ? { month: +m[2], year: +m[1] } : null;
  m = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) return +m[1] >= 1 && +m[1] <= 12 ? { month: +m[1], year: +m[2] } : null;
  m = s.match(/^([a-z]{3,9})[\s\-/']*(\d{2,4})?$/);
  if (m && MONTHS[m[1]] !== undefined) return { month: MONTHS[m[1]] + 1, year: m[2] ? fullYear(+m[2]) : fallbackYear };
  if (/^\d{1,2}$/.test(s) && +s >= 1 && +s <= 12) return { month: +s, year: fallbackYear };
  const d = parseDate(v);
  return d ? { month: d.getMonth() + 1, year: d.getFullYear() } : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Column mapping
// ─────────────────────────────────────────────────────────────────────────────
type FieldMap = Record<string, string[]>;

const FIELDS: Record<SectionKey, FieldMap> = {
  expenses: {
    spentAt: ['date', 'spentat', 'spentdate', 'spenton', 'transactiondate', 'txndate', 'trandate', 'transdate', 'postingdate', 'valuedate', 'valuedt', 'expensedate', 'dateofexpense', 'paymentdate', 'day', 'when'],
    amount: ['amount', 'amt', 'expense', 'expenseamount', 'spent', 'cost', 'price', 'value', 'debit', 'debitamount', 'withdrawal', 'withdrawalamount', 'withdrawalamt', 'amountinr', 'amountrs', 'inr', 'rs', 'total'],
    category: ['category', 'cat', 'expensecategory', 'categoryname', 'head', 'expensehead', 'group', 'tag', 'expensetype'],
    description: ['description', 'desc', 'details', 'detail', 'narration', 'particulars', 'note', 'notes', 'remarks', 'remark', 'item', 'merchant', 'payee', 'title', 'name', 'purpose', 'paidto'],
    paymentMethod: ['paymentmethod', 'method', 'mode', 'paymentmode', 'paidvia', 'paidby', 'via', 'instrument', 'paymenttype', 'modeofpayment'],
    isRecurring: ['recurring', 'isrecurring', 'repeat', 'repeats', 'fixed'],
    direction: ['drcr', 'crdr', 'transactiontype', 'txntype', 'debitcredit', 'creditdebit'],
    credit: ['credit', 'creditamount', 'deposit', 'depositamount', 'depositamt', 'received', 'moneyin', 'inflow'],
  },
  incomes: {
    receivedAt: ['date', 'receivedat', 'receiveddate', 'receivedon', 'creditdate', 'paydate', 'paymentdate', 'transactiondate', 'valuedate', 'incomedate'],
    amount: ['amount', 'amt', 'income', 'incomeamount', 'credit', 'creditamount', 'deposit', 'salary', 'received', 'value', 'amountinr', 'total'],
    source: ['source', 'incomesource', 'from', 'payer', 'employer', 'client', 'description', 'narration', 'particulars', 'name', 'details', 'title'],
    frequency: ['frequency', 'freq', 'interval', 'period', 'cycle', 'repeat'],
    isRecurring: ['recurring', 'isrecurring', 'fixed'],
  },
  obligations: {
    name: ['name', 'obligation', 'obligationname', 'title', 'description', 'particulars', 'payee', 'item', 'bill', 'billname', 'details'],
    type: ['type', 'obligationtype', 'kind', 'category'],
    amount: ['amount', 'amt', 'emi', 'emiamount', 'installment', 'instalment', 'value', 'dueamount', 'payment', 'premium'],
    dueDate: ['duedate', 'due', 'dueon', 'nextdue', 'nextduedate', 'date', 'paymentdate', 'deadline'],
    frequency: ['frequency', 'freq', 'interval', 'period', 'cycle'],
    isRecurring: ['recurring', 'isrecurring', 'repeat'],
    isPaid: ['paid', 'ispaid', 'status', 'paymentstatus', 'settled'],
  },
  goals: {
    name: ['name', 'goal', 'goalname', 'title', 'description', 'purpose'],
    targetAmount: ['target', 'targetamount', 'goalamount', 'amountneeded', 'required', 'requiredamount', 'cost', 'totalamount', 'amount'],
    currentAmount: ['current', 'currentamount', 'saved', 'savedamount', 'savedsofar', 'amountsaved', 'progress', 'accumulated', 'balance'],
    deadline: ['deadline', 'targetdate', 'date', 'by', 'duedate', 'enddate', 'achieveby', 'goaldate'],
    category: ['category', 'type', 'goaltype', 'goalcategory'],
    priority: ['priority', 'importance'],
    inflationRate: ['inflation', 'inflationrate', 'inflationpct', 'inflationpercent'],
    status: ['status'],
  },
  budgets: {
    month: ['month', 'period', 'budgetmonth', 'monthyear'],
    year: ['year', 'budgetyear'],
    category: ['category', 'cat', 'head', 'expensecategory'],
    limit: ['limit', 'budget', 'categorylimit', 'budgetamount', 'allocated', 'allocation', 'cap', 'amount', 'planned'],
    totalBudget: ['totalbudget', 'overallbudget', 'monthlybudget', 'overall', 'total'],
  },
};

const SECTION_COLUMN = ['section', 'recordtype', 'record', 'entity', 'datatype', 'sheet', 'kind'];

/** Resolve each logical field to the first matching header in this sheet. */
const mapColumns = (headers: string[], fields: FieldMap) => {
  const byNorm = new Map(headers.map((h) => [normKey(h), h]));
  const used = new Set<string>();
  const out: Record<string, string | undefined> = {};
  for (const [field, synonyms] of Object.entries(fields)) {
    for (const syn of synonyms) {
      const h = byNorm.get(syn);
      if (h && !used.has(h)) { out[field] = h; used.add(h); break; }
    }
  }
  return out;
};

const sectionFromName = (name: string): SectionKey | null => {
  const s = name.toLowerCase();
  if (/goal|target|dream|wish/.test(s)) return 'goals';
  if (/budget|limit|allocation|plan/.test(s)) return 'budgets';
  if (/obligat|emi|bill|loan|due|commitment|subscription/.test(s)) return 'obligations';
  if (/income|salary|earning|receipt|inflow/.test(s)) return 'incomes';
  if (/expens|spend|transaction|purchase|outflow|debit|statement/.test(s)) return 'expenses';
  return null;
};

const sectionFromValue = (v: unknown): SectionKey | null => {
  const s = normKey(v);
  if (!s) return null;
  if (/^goal/.test(s)) return 'goals';
  if (/^budget/.test(s)) return 'budgets';
  if (/^(obligation|emi|bill|loan|due|subscription)/.test(s)) return 'obligations';
  if (/^(income|salary|earning|credit)/.test(s)) return 'incomes';
  if (/^(expense|spend|debit|purchase)/.test(s)) return 'expenses';
  return null;
};

const sectionFromHeaders = (headers: string[]): SectionKey | null => {
  const h = new Set(headers.map(normKey));
  const has = (...keys: string[]) => keys.some((k) => h.has(k));
  if (has('targetamount', 'goalamount', 'goal', 'goalname', 'target', 'savedsofar', 'amountneeded')) return 'goals';
  if (has('limit', 'categorylimit', 'budgetamount', 'allocated', 'totalbudget') && !has('date', 'spentat', 'transactiondate')) return 'budgets';
  if (has('duedate', 'dueon', 'nextdue', 'nextduedate', 'emiamount', 'ispaid')) return 'obligations';
  if (has('source', 'incomesource', 'employer', 'receivedat', 'salary') && !has('category')) return 'incomes';
  if (has(...FIELDS.expenses.spentAt) && has(...FIELDS.expenses.amount, ...FIELDS.expenses.credit)) return 'expenses';
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Row parsers
// ─────────────────────────────────────────────────────────────────────────────
type RowResult<T> = { ok: T; note?: string } | { error: string } | { skip: true };
type Ctx = { cols: Record<string, string | undefined>; row: RawRow };
const cell = ({ cols, row }: Ctx, field: string) => (cols[field] ? row[cols[field]!] : undefined);

const parseExpenseRow = (ctx: Ctx): RowResult<ImportExpense | ImportIncome> => {
  const date = parseDate(cell(ctx, 'spentAt'));
  const debit = parseAmount(cell(ctx, 'amount'));
  const creditCol = parseAmount(cell(ctx, 'credit'));
  const description = str(cell(ctx, 'description')).slice(0, 200);
  const rawCategory = cell(ctx, 'category');
  if (!date && !debit && !creditCol) return { skip: true };
  if (!date) return { error: `Invalid or missing date "${str(cell(ctx, 'spentAt'))}" — use DD/MM/YYYY or YYYY-MM-DD` };

  const direction = normKey(cell(ctx, 'direction'));
  const isCredit = (debit?.value ?? 0) === 0 && (creditCol?.value ?? 0) > 0
    || /^(cr|credit|c|deposit|in)$/.test(direction)
    || (debit?.credit === true);
  if (isCredit) {
    const amt = (creditCol?.value ?? 0) > 0 ? creditCol!.value : debit?.value ?? 0;
    if (!(amt > 0)) return { error: 'Amount must be greater than 0' };
    return { ok: { source: description || 'Imported credit', amount: amt, frequency: 'ONE_TIME', isRecurring: false, receivedAt: toIsoNoon(date) }, note: 'credit → income' };
  }

  if (!debit || !(debit.value > 0)) return { error: `Invalid amount "${str(cell(ctx, 'amount'))}"` };
  const { category, matched } = normalizeCategory(rawCategory, description);
  const unknownLabel = !matched && !isBlank(rawCategory) ? str(rawCategory) : '';
  return {
    ok: {
      category,
      amount: Math.round(debit.value * 100) / 100,
      description: unknownLabel ? `${unknownLabel}${description ? ' – ' + description : ''}`.slice(0, 200) : description || undefined,
      paymentMethod: normalizePaymentMethod(cell(ctx, 'paymentMethod')),
      isRecurring: parseBool(cell(ctx, 'isRecurring'), false),
      spentAt: toIsoNoon(date),
    },
    note: unknownLabel ? `category "${unknownLabel}" → OTHER` : undefined,
  };
};

const parseIncomeRow = (ctx: Ctx): RowResult<ImportIncome> => {
  const date = parseDate(cell(ctx, 'receivedAt'));
  const amt = parseAmount(cell(ctx, 'amount'));
  const source = str(cell(ctx, 'source')).slice(0, 120);
  if (!date && !amt && !source) return { skip: true };
  if (!date) return { error: `Invalid or missing date "${str(cell(ctx, 'receivedAt'))}"` };
  if (!amt || !(amt.value > 0)) return { error: `Invalid amount "${str(cell(ctx, 'amount'))}"` };
  const frequency = normalizeFrequency(cell(ctx, 'frequency'), 'MONTHLY');
  return {
    ok: {
      source: source || 'Imported income', amount: amt.value, frequency,
      isRecurring: parseBool(cell(ctx, 'isRecurring'), frequency !== 'ONE_TIME'),
      receivedAt: toIsoNoon(date),
    },
  };
};

const parseObligationRow = (ctx: Ctx): RowResult<ImportObligation> => {
  const name = str(cell(ctx, 'name')).slice(0, 100);
  const date = parseDate(cell(ctx, 'dueDate'));
  const amt = parseAmount(cell(ctx, 'amount'));
  if (!name && !date && !amt) return { skip: true };
  if (!name) return { error: 'Name is required' };
  if (!amt || !(amt.value > 0)) return { error: `Invalid amount "${str(cell(ctx, 'amount'))}"` };
  if (!date) return { error: `Invalid or missing due date "${str(cell(ctx, 'dueDate'))}"` };
  const frequency = normalizeFrequency(cell(ctx, 'frequency'), 'MONTHLY');
  return {
    ok: {
      name, type: normalizeObligationType(cell(ctx, 'type'), name), amount: amt.value, dueDate: toIsoNoon(date), frequency,
      isRecurring: parseBool(cell(ctx, 'isRecurring'), frequency !== 'ONE_TIME'),
      isPaid: parseBool(cell(ctx, 'isPaid'), false),
    },
  };
};

const parseGoalRow = (ctx: Ctx): RowResult<ImportGoal> => {
  const name = str(cell(ctx, 'name')).slice(0, 100);
  const target = parseAmount(cell(ctx, 'targetAmount'));
  if (!name && !target) return { skip: true };
  if (!name) return { error: 'Goal name is required' };
  if (!target || !(target.value > 0)) return { error: `Invalid target amount "${str(cell(ctx, 'targetAmount'))}"` };
  const current = parseAmount(cell(ctx, 'currentAmount'));
  const rawDeadline = cell(ctx, 'deadline');
  const deadline = parseDate(rawDeadline);
  if (!isBlank(rawDeadline) && !deadline) return { error: `Invalid deadline "${str(rawDeadline)}"` };
  const status = normKey(cell(ctx, 'status'));
  return {
    ok: {
      name, targetAmount: target.value, currentAmount: current?.value ?? 0,
      deadline: deadline ? toIsoNoon(deadline) : null,
      category: normalizeGoalCategory(cell(ctx, 'category'), name),
      priority: normalizePriority(cell(ctx, 'priority')),
      inflationRate: parseRate(cell(ctx, 'inflationRate')),
      ...(status.startsWith('complete') || status === 'done' ? { status: 'COMPLETED' as const } : status.startsWith('pause') ? { status: 'PAUSED' as const } : {}),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Workbook → ParsedImport
// ─────────────────────────────────────────────────────────────────────────────
const emptyResult = (fileName: string): ParsedImport => ({
  fileName, expenses: [], incomes: [], budgets: [], obligations: [], goals: [], errors: [], warnings: [], sheets: [],
});

const ROW_OFFSET = 2; // header row is row 1 in the spreadsheet

const ingestRows = (out: ParsedImport, sheet: string, section: SectionKey, rows: RawRow[], headers: string[], rowNumbers?: number[]) => {
  const cols = mapColumns(headers, FIELDS[section]);
  const at = (i: number) => rowNumbers?.[i] ?? i + ROW_OFFSET;

  if (section === 'budgets') {
    if (!cols.limit && !cols.totalBudget) {
      out.errors.push({ section, sheet, row: 1, message: 'Budget sheet needs a "Limit" (per category) or "Total Budget" column' });
      return;
    }
    const groups = new Map<string, { b: ImportBudget; row: number }>();
    rows.forEach((row, i) => {
      const ctx = { cols, row };
      const catRaw = cell(ctx, 'category');
      const limit = parseAmount(cell(ctx, 'limit'));
      const total = parseAmount(cell(ctx, 'totalBudget'));
      if (isBlank(catRaw) && !limit && !total && isBlank(cell(ctx, 'month'))) return;
      const period = isBlank(cell(ctx, 'month'))
        ? { month: new Date().getMonth() + 1, year: Number(str(cell(ctx, 'year'))) || new Date().getFullYear() }
        : parseMonth(cell(ctx, 'month'), cell(ctx, 'year'));
      if (!period) { out.errors.push({ section, sheet, row: at(i), message: `Invalid month "${str(cell(ctx, 'month'))}" — use e.g. 2026-11 or Nov 2026` }); return; }
      const key = `${period.year}-${period.month}`;
      const g = groups.get(key) ?? { b: { month: period.month, year: period.year, totalBudget: null, categories: [] }, row: at(i) };
      groups.set(key, g);
      const isTotalRow = /^(total|overall|all)$/.test(normKey(catRaw));
      if (total && total.value > 0) g.b.totalBudget = total.value;
      if (isTotalRow) {
        if (limit && limit.value > 0) g.b.totalBudget = limit.value;
        return;
      }
      if (!isBlank(catRaw)) {
        if (!limit || !(limit.value > 0)) { out.errors.push({ section, sheet, row: at(i), message: `Invalid limit for "${str(catRaw)}"` }); return; }
        const { category } = normalizeCategory(catRaw);
        const existing = g.b.categories.find((c) => c.category === category);
        if (existing) existing.limit += limit.value; else g.b.categories.push({ category, limit: limit.value });
      }
    });
    for (const { b, row } of groups.values()) {
      if (b.totalBudget == null && b.categories.length === 0) continue;
      out.budgets.push({ data: b, sheet, row, include: true });
    }
    return;
  }

  rows.forEach((row, i) => {
    const ctx = { cols, row };
    const r: RowResult<unknown> =
      section === 'expenses' ? parseExpenseRow(ctx)
      : section === 'incomes' ? parseIncomeRow(ctx)
      : section === 'obligations' ? parseObligationRow(ctx)
      : parseGoalRow(ctx);
    if ('skip' in r) return;
    if ('error' in r) { out.errors.push({ section, sheet, row: at(i), message: r.error }); return; }
    if (section === 'expenses' && 'source' in (r.ok as object)) {
      out.incomes.push({ data: r.ok as ImportIncome, sheet, row: at(i), include: true, note: r.note });
      return;
    }
    (out[section] as ParsedRow<unknown>[]).push({ data: r.ok, sheet, row: at(i), include: true, note: r.note });
  });
};

const ingestSheet = (out: ParsedImport, name: string, rows: RawRow[], preferred?: SectionKey) => {
  if (rows.length === 0) { out.sheets.push({ name, detectedAs: 'empty', rows: 0 }); return; }
  if (/^(instructions?|readme|help|notes?|guide|about)$/i.test(name.trim())) { out.sheets.push({ name, detectedAs: 'skipped (instructions)', rows: rows.length }); return; }
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  // A "Section" column routes each row to its own section
  const sectionCol = headers.find((h) => SECTION_COLUMN.includes(normKey(h)) && rows.some((r) => sectionFromValue(r[h])));
  if (sectionCol) {
    const buckets = new Map<SectionKey, { rows: RawRow[]; nums: number[] }>();
    rows.forEach((r, i) => {
      const s = sectionFromValue(r[sectionCol]);
      if (!s) { if (Object.values(r).some((v) => !isBlank(v))) out.errors.push({ section: 'unknown', sheet: name, row: i + ROW_OFFSET, message: `Unknown section "${str(r[sectionCol])}"` }); return; }
      const b = buckets.get(s) ?? { rows: [], nums: [] };
      b.rows.push(r); b.nums.push(i + ROW_OFFSET);
      buckets.set(s, b);
    });
    for (const [s, b] of buckets) ingestRows(out, name, s, b.rows, headers, b.nums);
    out.sheets.push({ name, detectedAs: `mixed (${[...buckets.keys()].map((k) => SECTION_LABELS[k]).join(', ')})`, rows: rows.length });
    return;
  }

  const section = sectionFromName(name) ?? sectionFromHeaders(headers) ?? preferred ?? null;
  if (!section) {
    out.sheets.push({ name, detectedAs: 'not recognised', rows: rows.length });
    out.warnings.push(`Sheet "${name}" was skipped — its columns (${headers.slice(0, 5).join(', ')}) don't match any WealthMap section. Use the template or add a "Section" column.`);
    return;
  }
  const isStatement = section === 'expenses' && headers.some((h) => FIELDS.expenses.credit.includes(normKey(h)));
  out.sheets.push({ name, detectedAs: isStatement ? 'bank statement (debits → expenses, credits → income)' : SECTION_LABELS[section], rows: rows.length });
  ingestRows(out, name, section, rows, headers);
};

/** Parse an uploaded .xlsx / .xls / .csv / .json file. `preferred` is used when a single sheet is ambiguous. */
export const parseImportFile = async (file: File, preferred?: SectionKey): Promise<ParsedImport> => {
  const out = emptyResult(file.name);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'json') {
    let json: unknown;
    try { json = JSON.parse(await file.text()); } catch { throw new Error('This JSON file could not be read.'); }
    const obj = (json && typeof json === 'object' ? (json as Record<string, unknown>) : {});
    const root = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Record<string, unknown>;
    if (Array.isArray(json)) ingestSheet(out, 'JSON', json as RawRow[], preferred ?? 'expenses');
    else {
      const aliases: Record<string, SectionKey> = { expenses: 'expenses', incomes: 'incomes', income: 'incomes', budgets: 'budgets', obligations: 'obligations', goals: 'goals' };
      for (const [k, v] of Object.entries(root)) {
        const s = aliases[k.toLowerCase()];
        if (!s || !Array.isArray(v)) continue;
        if (s === 'budgets') {
          // WealthMap JSON budgets: { month, year, totalBudget, categoryBudgets|categories: [{category, limit}] }
          const flat: RawRow[] = [];
          for (const b of v as RawRow[]) {
            const cats = (b.categories ?? b.categoryBudgets ?? []) as RawRow[];
            flat.push({ Month: `${b.year}-${b.month}`, Category: 'TOTAL', Limit: b.totalBudget });
            for (const c of cats) flat.push({ Month: `${b.year}-${b.month}`, Category: c.category, Limit: c.limit });
          }
          ingestRows(out, 'JSON', 'budgets', flat, ['Month', 'Category', 'Limit']);
          out.sheets.push({ name: 'JSON budgets', detectedAs: 'Budgets', rows: v.length });
        } else {
          const rows = v as RawRow[];
          ingestRows(out, 'JSON', s, rows, Array.from(new Set(rows.flatMap((r) => Object.keys(r)))));
          out.sheets.push({ name: `JSON ${k}`, detectedAs: SECTION_LABELS[s], rows: rows.length });
        }
      }
    }
  } else if (['xlsx', 'xls', 'xlsm', 'csv', 'txt', 'ods'].includes(ext)) {
    const isText = ext === 'csv' || ext === 'txt';
    const wb = isText
      ? XLSX.read(await file.text(), { type: 'string', raw: true })        // keep "05/11/2026" as text → parsed day-first
      : XLSX.read(await file.arrayBuffer(), { type: 'array' });
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<RawRow>(wb.Sheets[name], { defval: '', raw: true, blankrows: false });
      const label = isText && wb.SheetNames.length === 1 ? file.name.replace(/\.[^.]+$/, '') : name;
      ingestSheet(out, label, rows, wb.SheetNames.length === 1 ? preferred : undefined);
    }
  } else {
    throw new Error('Unsupported file type. Upload an Excel (.xlsx, .xls), CSV or JSON file.');
  }

  if (SECTION_KEYS.every((k) => out[k].length === 0) && out.errors.length === 0 && out.warnings.length === 0) {
    out.warnings.push('No data rows were found in this file.');
  }
  return out;
};

export const countIncluded = (p: ParsedImport, k: SectionKey) => (p[k] as ParsedRow<unknown>[]).filter((r) => r.include).length;

export const toPayload = (p: ParsedImport, skipDuplicates = true): ImportPayload => ({
  expenses: p.expenses.filter((r) => r.include).map((r) => r.data),
  incomes: p.incomes.filter((r) => r.include).map((r) => r.data),
  budgets: p.budgets.filter((r) => r.include).map((r) => r.data),
  obligations: p.obligations.filter((r) => r.include).map((r) => r.data),
  goals: p.goals.filter((r) => r.include).map((r) => r.data),
  options: { skipDuplicates },
});

// ─────────────────────────────────────────────────────────────────────────────
// Templates & export (round-trip with the parser)
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (d: Date | string) => {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
};

const templateRows = (): Record<SectionKey, RawRow[]> => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const day = (d: number, mo = m) => fmtDate(new Date(y, mo, d));
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
  return {
    expenses: [
      { Date: day(2), Category: 'Food', Amount: 1850, Description: 'Weekly groceries', 'Payment Method': 'UPI', Recurring: 'No' },
      { Date: day(3), Category: 'Transport', Amount: 450, Description: 'Metro card recharge', 'Payment Method': 'UPI', Recurring: 'No' },
      { Date: day(1), Category: 'Rent', Amount: 20000, Description: 'House rent', 'Payment Method': 'Net Banking', Recurring: 'Yes' },
      { Date: day(5), Category: 'Entertainment', Amount: 499, Description: 'Netflix subscription', 'Payment Method': 'Card', Recurring: 'Yes' },
    ],
    incomes: [
      { Date: day(1), Source: 'Salary', Amount: 75000, Frequency: 'Monthly', Recurring: 'Yes' },
      { Date: day(10), Source: 'Freelance project', Amount: 15000, Frequency: 'One-time', Recurring: 'No' },
    ],
    budgets: [
      { Month: ym, Category: 'TOTAL', Limit: 55000 },
      { Month: ym, Category: 'Food', Limit: 12000 },
      { Month: ym, Category: 'Rent', Limit: 20000 },
      { Month: ym, Category: 'Transport', Limit: 4000 },
      { Month: ym, Category: 'Entertainment', Limit: 5000 },
    ],
    obligations: [
      { Name: 'Laptop EMI', Type: 'EMI', Amount: 4500, 'Due Date': day(28), Frequency: 'Monthly', Recurring: 'Yes', Paid: 'No' },
      { Name: 'Health insurance', Type: 'Insurance', Amount: 12000, 'Due Date': day(15, m + 2), Frequency: 'Yearly', Recurring: 'Yes', Paid: 'No' },
    ],
    goals: [
      { Name: 'Emergency fund', Category: 'Emergency', 'Target Amount': 180000, 'Current Amount': 50000, Deadline: fmtDate(new Date(y + 1, m, 1)), Priority: 'High', 'Inflation %': '' },
      { Name: 'Japan trip', Category: 'Travel', 'Target Amount': 250000, 'Current Amount': 20000, Deadline: fmtDate(new Date(y + 2, 3, 15)), Priority: 'Medium', 'Inflation %': 7 },
    ],
  };
};

const SHEET_NAMES: Record<SectionKey, string> = { expenses: 'Expenses', incomes: 'Income', budgets: 'Budgets', obligations: 'Obligations', goals: 'Goals' };

const INSTRUCTIONS = [
  ['WealthMap import template'],
  [''],
  ['• Keep the sheet names (Expenses, Income, Budgets, Obligations, Goals). Delete sheets you don\'t need.'],
  ['• Dates: DD/MM/YYYY (e.g. 05/11/2026) or YYYY-MM-DD. Excel date cells also work.'],
  ['• Amounts: plain numbers or ₹1,850 — commas and the ₹ sign are fine.'],
  ['• Expense categories: Food, Transport, Shopping, Entertainment, Health, Education, Utilities, Rent, EMI, Insurance, Travel, Other.'],
  ['  Words like Swiggy, Uber, Netflix or Groceries are recognised automatically.'],
  ['• Payment method: Cash, UPI (GPay/PhonePe/Paytm), Card, Net Banking.'],
  ['• Budgets: one row per category for a month (Month = 2026-11 or Nov 2026). A row with Category = TOTAL sets the overall budget.'],
  ['• Goals: Priority = High/Medium/Low. Leave "Inflation %" empty to use the default rate for the goal category.'],
  ['• Bank statements with Debit/Credit columns can be uploaded directly: debits become expenses, credits become income.'],
  ['• Re-uploading the same file is safe — exact duplicates are skipped.'],
];

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const writeWorkbook = (sheets: [string, RawRow[] | string[][]][], fileName: string) => {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of sheets) {
    const ws = Array.isArray(rows[0]) ? XLSX.utils.aoa_to_sheet(rows as string[][]) : XLSX.utils.json_to_sheet(rows as RawRow[]);
    const width = Array.isArray(rows[0]) ? [{ wch: 110 }] : Object.keys((rows as RawRow[])[0] ?? {}).map((k) => ({ wch: Math.max(14, k.length + 4) }));
    ws['!cols'] = width;
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
};

/** Full 5-sheet Excel template (+ instructions). */
export const downloadFullTemplate = () => {
  const rows = templateRows();
  writeWorkbook([
    ['Instructions', INSTRUCTIONS],
    ...SECTION_KEYS.map((k) => [SHEET_NAMES[k], rows[k]] as [string, RawRow[]]),
  ], 'wealthmap-import-template.xlsx');
};

/** Single-section CSV template. */
export const downloadSectionTemplate = (section: SectionKey) => {
  const ws = XLSX.utils.json_to_sheet(templateRows()[section]);
  const csv = XLSX.utils.sheet_to_csv(ws);
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `wealthmap-${section}-template.csv`);
};

export interface ExportData {
  expenses: { spentAt: string; category: string; amount: number; description?: string | null; paymentMethod: string; isRecurring: boolean }[];
  incomes: { receivedAt: string; source: string; amount: number; frequency: string; isRecurring: boolean }[];
  budgets: { month: number; year: number; totalBudget: number; categoryBudgets?: { category: string; limit: number }[]; categories?: { category: string; limit: number }[] }[];
  obligations: { name: string; type: string; amount: number; dueDate: string; frequency: string; isRecurring: boolean; isPaid: boolean }[];
  goals: { name: string; category?: string; targetAmount: number; currentAmount: number; deadline?: string | null; priority?: string; inflationRate?: number | null; status: string }[];
}

const yesNo = (b: boolean) => (b ? 'Yes' : 'No');

/** Export everything in the template format so it can be re-imported (backup / move between accounts). */
export const exportAllData = (d: ExportData) => {
  const sheets: [string, RawRow[]][] = [
    ['Expenses', d.expenses.map((e) => ({ Date: fmtDate(e.spentAt), Category: e.category, Amount: Number(e.amount), Description: e.description ?? '', 'Payment Method': e.paymentMethod, Recurring: yesNo(e.isRecurring) }))],
    ['Income', d.incomes.map((i) => ({ Date: fmtDate(i.receivedAt), Source: i.source, Amount: Number(i.amount), Frequency: i.frequency, Recurring: yesNo(i.isRecurring) }))],
    ['Budgets', d.budgets.flatMap((b) => {
      const ym = `${b.year}-${String(b.month).padStart(2, '0')}`;
      const cats = b.categories ?? b.categoryBudgets ?? [];
      return [{ Month: ym, Category: 'TOTAL', Limit: Number(b.totalBudget) }, ...cats.map((c) => ({ Month: ym, Category: c.category, Limit: Number(c.limit) }))];
    })],
    ['Obligations', d.obligations.map((o) => ({ Name: o.name, Type: o.type, Amount: Number(o.amount), 'Due Date': fmtDate(o.dueDate), Frequency: o.frequency, Recurring: yesNo(o.isRecurring), Paid: yesNo(o.isPaid) }))],
    ['Goals', d.goals.map((g) => ({ Name: g.name, Category: g.category ?? 'OTHER', 'Target Amount': Number(g.targetAmount), 'Current Amount': Number(g.currentAmount), Deadline: g.deadline ? fmtDate(g.deadline) : '', Priority: g.priority ?? 'MEDIUM', 'Inflation %': g.inflationRate ?? '', Status: g.status }))],
  ];
  const nonEmpty = sheets.map(([n, r]) => [n, r.length ? r : [{ Note: 'No records' }]] as [string, RawRow[]]);
  writeWorkbook(nonEmpty, `wealthmap-data-${new Date().toISOString().slice(0, 10)}.xlsx`);
};
