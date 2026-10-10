import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import './Onboarding.css';

const OnboardingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [monthlyIncome, setMonthlyIncome] = useState(String(user?.declaredMonthlyIncome ?? ''));
  const [cashBalance, setCashBalance] = useState(String(user?.cashBalance ?? 0));
  const [savingsBalance, setSavingsBalance] = useState(String(user?.savingsBalance ?? 0));
  const [emergencyFundBalance, setEmergencyFundBalance] = useState(String(user?.emergencyFundBalance ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.patch('/users/profile', {
        declaredMonthlyIncome: Number(monthlyIncome),
        cashBalance: Number(cashBalance),
        savingsBalance: Number(savingsBalance),
        emergencyFundBalance: Number(emergencyFundBalance),
        onboardingComplete: true,
      });
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'We could not save your financial profile. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="onboarding-page">
      <header className="onboarding-brand">
        <span className="onboarding-brand-icon"><img src="/wealthmap-logo.png" alt="" /></span>
        <span>WealthMap</span>
      </header>

      <section className="onboarding-layout">
        <div className="onboarding-intro">
          <span className="onboarding-step-label">YOUR WORKSPACE · 1 OF 1</span>
          <h1>Start with your student budget.</h1>
          <p>Add your allowance, scholarship, stipend or part-time income. We’ll help you plan for campus costs and make it last between paydays.</p>
          <div className="onboarding-promise">
            <span><ShieldCheck size={19} /></span>
            <div><strong>Your data stays yours</strong><p>Only you can see the financial details you add.</p></div>
          </div>
          <div className="onboarding-progress" aria-label="Setup progress">
            <span />
          </div>
          <small>About 2 minutes to complete</small>
        </div>

        <div className="onboarding-card">
          <div className="onboarding-card-heading">
            <span className="onboarding-card-icon"><Wallet size={20} /></span>
            <div>
              <h2>Set up your finances</h2>
              <p>You can update these details anytime.</p>
            </div>
          </div>

          {error && <div className="alert-bar alert-bar-danger onboarding-error">{error}</div>}

          <form className="onboarding-form" onSubmit={handleSubmit}>
            <div className="onboarding-field">
              <label htmlFor="onboarding-income">Monthly income or allowance</label>
              <div className="onboarding-input-wrap">
                <span>₹</span>
                <input
                  id="onboarding-income"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={monthlyIncome}
                  onChange={(event) => setMonthlyIncome(event.target.value)}
                  placeholder="e.g. 12,000"
                />
              </div>
              <small>Add your allowance, scholarship, stipend or part-time pay.</small>
            </div>

            <div className="onboarding-balance-grid">
              <div className="onboarding-field">
                <label htmlFor="onboarding-cash">Money available</label>
                <input id="onboarding-cash" type="number" min="0" step="0.01" required value={cashBalance} onChange={(event) => setCashBalance(event.target.value)} placeholder="0" />
              </div>
              <div className="onboarding-field">
                <label htmlFor="onboarding-savings">Savings</label>
                <input id="onboarding-savings" type="number" min="0" step="0.01" required value={savingsBalance} onChange={(event) => setSavingsBalance(event.target.value)} placeholder="0" />
              </div>
              <div className="onboarding-field onboarding-field-wide">
                <label htmlFor="onboarding-emergency">Emergency fund</label>
                <input id="onboarding-emergency" type="number" min="0" step="0.01" required value={emergencyFundBalance} onChange={(event) => setEmergencyFundBalance(event.target.value)} placeholder="0" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : <>Build my workspace <ArrowRight size={17} /></>}
            </button>
            <p className="onboarding-footnote"><CheckCircle size={14} /> No bank connection required. You stay in control.</p>
          </form>
        </div>
      </section>
    </main>
  );
};

export default OnboardingPage;
