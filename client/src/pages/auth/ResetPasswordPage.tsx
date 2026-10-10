import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Lock } from 'lucide-react';
import api from '../../services/api';
import './Auth.css';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('This password reset link is missing its token. Request a new link to continue.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password, confirmPassword });
      setComplete(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'We could not reset your password. Request a new link and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon"><img src="/wealthmap-logo.png" alt="WealthMap" /></div>
          <h1>WealthMap</h1>
          <p className="auth-tagline">A clearer view of your money.</p>
        </div>
        <div className="auth-checklist">
          <p className="auth-checklist-title">Keep your account secure</p>
          <div className="auth-checklist-item"><CheckCircle size={16} /><span>Use a unique password</span></div>
          <div className="auth-checklist-item"><CheckCircle size={16} /><span>At least 8 characters</span></div>
          <div className="auth-checklist-item"><CheckCircle size={16} /><span>Include an uppercase letter and a number</span></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card neu-raised fade-in">
          {complete ? (
            <div className="auth-success-state">
              <div className="auth-success-icon"><CheckCircle size={30} /></div>
              <h2>Password updated</h2>
              <p>Your new password is ready. Sign in to continue to your WealthMap workspace.</p>
              <button className="btn btn-primary btn-lg btn-full" onClick={() => navigate('/login')}>
                Continue to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <h2>Set a new password</h2>
                <p>Choose a strong password you haven't used before.</p>
              </div>

              {error && <div className="alert-bar alert-bar-danger auth-error"><AlertCircle size={16} />{error}</div>}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="reset-password">New password</label>
                  <div className="input-icon-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="reset-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="reset-confirm-password">Confirm new password</label>
                  <div className="input-icon-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="reset-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Enter your new password again"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                  {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Update password'}
                </button>
              </form>
              <div className="divider" />
              <p className="auth-switch">Remembered your password? <Link to="/login">Sign in</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
