import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiErrors';
import './Auth.css';

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = (pw: string): { strength: number; label: string; color: string } => {
    let s = 0;
    if (pw.length >= 8)            s++;
    if (/[A-Z]/.test(pw))         s++;
    if (/[0-9]/.test(pw))         s++;
    if (/[^A-Za-z0-9]/.test(pw))  s++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'var(--danger)', 'var(--warning)', 'var(--primary-500)', 'var(--success)'];
    return { strength: s, label: labels[s] ?? '', color: colors[s] ?? '' };
  };

  const pwInfo = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPw) { setError('All fields are required.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/onboarding');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <img src="/wealthmap-logo.png" alt="WealthMap" />
          </div>
          <h1>WealthMap</h1>
          <p className="auth-tagline">Your student money companion</p>
        </div>

        <div className="auth-checklist">
          <p className="auth-checklist-title">What you get with WealthMap:</p>
          {[
            'Balance allowance, stipend and part-time income',
            'Plan monthly costs for food, travel and books',
            'Keep rent, fees and bills in view',
            'See what a big purchase could change',
            'Get a daily spending guide',
            'No bank connection required',
          ].map((item) => (
            <div className="auth-checklist-item" key={item}>
              <CheckCircle size={16} color="var(--success)" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-right">
        <div className="auth-card neu-raised fade-in">
          <div className="auth-card-header">
            <h2>Your money, less stressful.</h2>
            <p>Create a free account and build a budget around student life.</p>
          </div>

          {error && (
            <div className="alert-bar alert-bar-danger auth-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="reg-name">Full Name</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email Address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (
                <div className="pw-strength">
                  <div className="pw-strength-bars">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="pw-strength-bar"
                        style={{ background: i <= pwInfo.strength ? pwInfo.color : 'var(--bg-subtle)' }}
                      />
                    ))}
                  </div>
                  <span style={{ color: pwInfo.color, fontSize: '0.75rem', fontWeight: 600 }}>
                    {pwInfo.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="reg-confirm"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              id="btn-register"
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
            >
              {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Create Account'}
            </button>
          </form>

          <div className="divider" />
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
