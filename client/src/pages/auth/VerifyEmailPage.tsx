import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import './Auth.css';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(Boolean(token));
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!token) return () => { active = false; };

    api.get(`/auth/verify-email/${encodeURIComponent(token)}`)
      .then(() => {
        if (active) setVerified(true);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'We could not verify this link. It may have expired.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token]);
  const visibleError = error || (!token ? 'This verification link is missing its token. Open the link from your email or sign in to continue.' : '');

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon"><img src="/wealthmap-logo.png" alt="WealthMap" /></div>
          <h1>WealthMap</h1>
          <p className="auth-tagline">A clearer view of your money.</p>
        </div>
        <div className="auth-checklist">
          <p className="auth-checklist-title">One last step</p>
          <div className="auth-checklist-item"><CheckCircle size={16} /><span>Verify your email address</span></div>
          <div className="auth-checklist-item"><CheckCircle size={16} /><span>Set up your financial workspace</span></div>
          <div className="auth-checklist-item"><CheckCircle size={16} /><span>Start planning with confidence</span></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card neu-raised fade-in auth-result-card">
          {loading ? (
            <div className="auth-success-state">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <h2>Verifying your email</h2>
              <p>This will only take a moment.</p>
            </div>
          ) : verified ? (
            <div className="auth-success-state">
              <div className="auth-success-icon"><CheckCircle size={30} /></div>
              <h2>Email verified</h2>
              <p>Your account is confirmed. Sign in to finish setting up your financial workspace.</p>
              <Link to="/login" className="btn btn-primary btn-lg btn-full">Continue to sign in</Link>
            </div>
          ) : (
            <div className="auth-success-state">
              <div className="auth-error-icon"><AlertCircle size={30} /></div>
              <h2>Could not verify this link</h2>
              <p>{visibleError}</p>
              <Link to="/login" className="btn btn-secondary btn-lg btn-full">Back to sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
