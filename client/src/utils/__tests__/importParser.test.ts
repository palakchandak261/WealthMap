import * as XLSX from 'xlsx';
import {
  parseDate, parseAmount, normalizeCategory, normalizePaymentMethod, normalizeFrequency,
  normalizeGoalCategory, normalizePriority, parseMonth, parseImportFile, toPayload, countIncluded,
} from '../importParser';

const ymd = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);

describe('value parsers', () => {
  it('parses Indian day-first dates, ISO dates and Excel serials', () => {
    expect(ymd(parseDate('05/11/2026'))).toBe('2026-11-5');
    expect(ymd(parseDate('2026-11-05'))).toBe('2026-11-5');
    expect(ymd(parseDate('5th Nov 2026'))).toBe('2026-11-5');
    expect(ymd(parseDate('05-Nov-26'))).toBe('2026-11-5');
    expect(ymd(parseDate(46331))).toBe('2026-11-5');
    expect(ymd(parseDate('11/25/2026'))).toBe('2026-11-25'); // unambiguous US format
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });

  it('parses rupee amounts, brackets and Dr/Cr markers', () => {
    expect(parseAmount('₹1,00,000.50')?.value).toBe(100000.5);
    expect(parseAmount('(500)')).toMatchObject({ value: 500, negative: true });
    expect(parseAmount('500 Dr')).toMatchObject({ value: 500, credit: false });
    expect(parseAmount('Rs. 2,000 CR')).toMatchObject({ value: 2000, credit: true });
    expect(parseAmount('abc')).toBeNull();
  });

  it('maps categories from labels or descriptions', () => {
    expect(normalizeCategory('Groceries').category).toBe('FOOD');
    expect(normalizeCategory('', 'Swiggy order').category).toBe('FOOD');
    expect(normalizeCategory('', 'Uber to airport').category).toBe('TRANSPORT');
    expect(normalizeCategory('Pets')).toEqual({ category: 'OTHER', matched: false });
  });

  it('normalises payment method, frequency, goal type and priority', () => {
    expect(normalizePaymentMethod('GPay')).toBe('UPI');
    expect(normalizePaymentMethod('Credit Card')).toBe('CARD');
    expect(normalizeFrequency('Annual')).toBe('YEARLY');
    expect(normalizeFrequency('Fortnightly')).toBe('BIWEEKLY');
    expect(normalizeGoalCategory('', 'New MacBook')).toBe('GADGET');
    expect(normalizeGoalCategory('Emergency Fund')).toBe('EMERGENCY');
    expect(normalizePriority('High')).toBe('HIGH');
    expect(normalizePriority('')).toBe('MEDIUM');
  });

  it('parses budget months', () => {
    expect(parseMonth('2026-11')).toEqual({ month: 11, year: 2026 });
    expect(parseMonth('11/2026')).toEqual({ month: 11, year: 2026 });
  });
});

describe('parseImportFile', () => {
  it('reads an expenses CSV with flexible headers', async () => {
    const csv = 'Txn Date,Category,Amount,Narration,Mode\n05/11/2026,Food,450,Lunch,UPI\n06/11/2026,,"1,200",Uber to airport,Card\n';
    const p = await parseImportFile(new File([csv], 'my-expenses.csv', { type: 'text/csv' }), 'expenses');
    expect(p.expenses).toHaveLength(2);
    expect(p.expenses[0].data).toMatchObject({ category: 'FOOD', amount: 450, paymentMethod: 'UPI' });
    expect(p.expenses[1].data).toMatchObject({ category: 'TRANSPORT', amount: 1200, paymentMethod: 'CARD' });
    expect(ymd(new Date(p.expenses[0].data.spentAt))).toBe('2026-11-5');
  });

  it('splits a bank statement into expenses (debits) and income (credits)', async () => {
    const csv = 'Date,Narration,Withdrawal Amt,Deposit Amt\n01/11/2026,SALARY NOV,,75000\n02/11/2026,SWIGGY ORDER,450,\n03/11/2026,NETFLIX,649,\n';
    const p = await parseImportFile(new File([csv], 'statement.csv', { type: 'text/csv' }));
    expect(p.expenses.map((r) => r.data.amount)).toEqual([450, 649]);
    expect(p.incomes.map((r) => r.data.amount)).toEqual([75000]);
  });

  it('reads a multi-sheet workbook into every section', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Date: '2026-11-02', Category: 'FOOD', Amount: 300, Description: 'Snacks' }]), 'Expenses');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Date: '2026-11-01', Source: 'Salary', Amount: 75000, Frequency: 'Monthly' }]), 'Income');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Month: '2026-11', Category: 'TOTAL', Limit: 50000 },
      { Month: '2026-11', Category: 'FOOD', Limit: 8000 },
    ]), 'Budgets');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Name: 'Bike EMI', Type: 'EMI', Amount: 4500, 'Due Date': '2026-11-28', Frequency: 'Monthly' }]), 'Obligations');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Name: 'Japan trip', 'Target Amount': 200000, 'Current Amount': 25000, Deadline: '2027-12-01', Priority: 'High' }]), 'Goals');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const p = await parseImportFile(new File([buf], 'wealthmap.xlsx'));
    expect(p.expenses).toHaveLength(1);
    expect(p.incomes[0].data).toMatchObject({ source: 'Salary', amount: 75000, frequency: 'MONTHLY' });
    expect(p.budgets[0].data).toMatchObject({ month: 11, year: 2026, totalBudget: 50000 });
    expect(p.budgets[0].data.categories).toEqual([{ category: 'FOOD', limit: 8000 }]);
    expect(p.obligations[0].data).toMatchObject({ name: 'Bike EMI', type: 'EMI', amount: 4500 });
    expect(p.goals[0].data).toMatchObject({ name: 'Japan trip', category: 'TRAVEL', priority: 'HIGH', targetAmount: 200000 });
  });

  it('reports bad rows instead of importing them', async () => {
    const csv = 'Date,Category,Amount\n05/11/2026,Food,abc\n31/02/2026,Food,100\n06/11/2026,Food,250\n';
    const p = await parseImportFile(new File([csv], 'expenses.csv'), 'expenses');
    expect(p.expenses).toHaveLength(1);
    expect(p.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('only sends rows that are still included', async () => {
    const csv = 'Date,Category,Amount\n05/11/2026,Food,100\n06/11/2026,Food,200\n';
    const p = await parseImportFile(new File([csv], 'expenses.csv'), 'expenses');
    p.expenses[0].include = false;
    expect(countIncluded(p, 'expenses')).toBe(1);
    const payload = toPayload(p, false);
    expect(payload.expenses.map((e) => e.amount)).toEqual([200]);
    expect(payload.options.skipDuplicates).toBe(false);
  });

  it('rejects unsupported file types', async () => {
    await expect(parseImportFile(new File(['x'], 'photo.png'))).rejects.toThrow(/Unsupported/);
  });
});
