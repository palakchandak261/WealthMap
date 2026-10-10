import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import './Auth.css';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
          <p className="auth-tagline">Your student money companion</p>
        </div>
        <div className="auth-features">
          {[
            { emoji: '🔒', title: 'Secure Reset', desc: 'Token expires in 1 hour for your safety' },
            { emoji: '📧', title: 'Email Delivery', desc: 'Check your inbox and spam folder' },
            { emoji: '🔑', title: 'New Password', desc: 'Choose a strong password with uppercase & numbers' },
          ].map((f) => (
            <div className="auth-feature-card" key={f.title}>
              <span className="auth-feature-icon">{f.emoji}</span>
              <div><strong>{f.title}</strong><p>{f.desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card neu-raised fade-in">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: 64, height: 64, background: 'var(--success-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <CheckCircle size={32} color="var(--success-dark)" />
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>Check your email</h2>
              <p style={{ marginBottom: '1.5rem' }}>
                If <strong>{email}</strong> is registered, we've sent a password reset link. Check your inbox and spam folder.
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                The link expires in 1 hour.
              </p>
              <Link to="/login" className="btn btn-secondary" style={{ width: '100%' }}>
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <h2>Forgot password?</h2>
                <p>Enter your email and we'll send you a reset link</p>
              </div>

              {error && (
                <div className="alert-bar alert-bar-danger auth-error">
                  <AlertCircle size={16} />{error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="forgot-email">Email Address</label>
                  <div className="input-icon-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                  {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Send Reset Link'}
                </button>
              </form>

              <div className="divider" />
              <p className="auth-switch">
                <Link to="/login"><ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Back to Login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
