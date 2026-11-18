/**
 * Smoke test: render the pages changed for inflation / appreciation / goals /
 * import / AI advice in demo mode (in-browser backend) and check they load.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { resetMockStore } from '../../services/mockData';
import DashboardPage from '../dashboard/DashboardPage';
import GoalsPage from '../goals/GoalsPage';
import ExpensesPage from '../expenses/ExpensesPage';
import RiskPage from '../risk/RiskPage';
import AIRecommendationsPage from '../ai/AIRecommendationsPage';
import IncomePage from '../income/IncomePage';
import BudgetsPage from '../budgets/BudgetsPage';
import ObligationsPage from '../obligations/ObligationsPage';

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;

const renderPage = (ui: React.ReactElement, path = '/') => render(
  <MemoryRouter initialEntries={[path]}>
    <AuthProvider>{ui}</AuthProvider>
  </MemoryRouter>,
);

beforeEach(() => {
  localStorage.clear();
  const store = resetMockStore();
  localStorage.setItem('wm_demo_mode', 'true');
  localStorage.setItem('wm_token', 'demo-token');
  localStorage.setItem('wm_user', JSON.stringify(store.user));
});

const T = { timeout: 5000 };

describe('pages render in demo mode', () => {
  it('Dashboard shows the safe-to-spend appreciation card', async () => {
    renderPage(<DashboardPage />, '/dashboard');
    expect(await screen.findByRole('status', {}, T)).toHaveClass('appreciation-card');
  });

  it('Goals shows the savings plan, goal plans and yearly inflation', async () => {
    renderPage(<GoalsPage />, '/goals');
    expect(await screen.findByText(/Your monthly savings plan/, {}, T)).toBeInTheDocument();
    expect(screen.getByText(/Active goals/)).toBeInTheDocument();
    expect(screen.getByText(/Yearly expenses with inflation/)).toBeInTheDocument();
    expect(screen.getAllByText(/\/month/).length).toBeGreaterThan(0);

    // Switch to a flat inflation rate and back off
    fireEvent.click(screen.getByRole('button', { name: 'Flat rate' }));
    expect((await screen.findAllByText(/6% p\.a\. \(flat\)/, {}, T)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect((await screen.findAllByText('Inflation off', {}, T)).length).toBeGreaterThan(0);

    // Open the add-goal form and see the live plan preview
    fireEvent.click(screen.getByRole('button', { name: /Add Goal/ }));
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: 'Test laptop' } });
    fireEvent.change(screen.getByLabelText(/Target \(today/), { target: { value: '100000' } });
    fireEvent.change(screen.getByLabelText('Target date'), { target: { value: `${new Date().getFullYear() + 1}-12-01` } });
    expect(screen.getByText('Plan preview')).toBeInTheDocument();
  }, 20000);

  it('Expenses shows the yearly inflation strip and opens the importer', async () => {
    renderPage(<ExpensesPage />, '/expenses');
    expect(await screen.findByText(/Yearly spend today/, {}, T)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Import Excel \/ CSV/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Drop a file here/)).toBeInTheDocument();

    // Upload a CSV through the modal and import it
    const csv = new File(['Date,Category,Amount,Description\n05/11/2026,Food,450,Smoke test lunch\n'], 'expenses.csv', { type: 'text/csv' });
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [csv] } });
    expect(await within(dialog).findByText('Smoke test lunch', {}, T)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Import 1 record/ }));
    expect(await within(dialog).findByText(/Imported 1 record/, {}, T)).toBeInTheDocument();
  });

  it('Safe-to-spend view shows bills due this month and appreciation', async () => {
    renderPage(<RiskPage />, '/safe-to-spend');
    expect(await screen.findByText('Bills due this month', {}, T)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('appreciation-card');
  });

  it('AI page shows insights and the goal savings table', async () => {
    renderPage(<AIRecommendationsPage />, '/recommendations');
    fireEvent.click(screen.getByRole('button', { name: /Get my financial advice/ }));
    expect(await screen.findByText(/Save this much to reach your goals/, {}, T)).toBeInTheDocument();
    expect(screen.getByText('Built-in advisor')).toBeInTheDocument();
    expect(document.querySelectorAll('.insight-card').length).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['Income', <IncomePage />, '/income'],
    ['Budgets', <BudgetsPage />, '/budgets'],
    ['Obligations', <ObligationsPage />, '/obligations'],
  ])('%s page has an import button', async (_name, page, path) => {
    renderPage(page, path);
    const btn = await screen.findByRole('button', { name: /Import/ }, T);
    fireEvent.click(btn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
