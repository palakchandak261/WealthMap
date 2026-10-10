import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiErrors';
import './Auth.css';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Invalid credentials. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel — brand illustration */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <img src="/wealthmap-logo.png" alt="WealthMap" />
          </div>
          <h1>WealthMap</h1>
          <p className="auth-tagline">Your student money companion</p>
        </div>

        <div className="auth-features">
          {[
            { emoji: '📊', title: 'Campus-life budgets', desc: 'Plan for food, travel, books and more' },
            { emoji: '🔮', title: 'Know what’s coming', desc: 'See if your money can last the month' },
            { emoji: '⚡', title: 'Try a what-if', desc: 'Check a purchase before committing' },
            { emoji: '🤖', title: 'Clear next steps', desc: 'Get useful insights from your own numbers' },
          ].map((f) => (
            <div className="auth-feature-card" key={f.title}>
              <span className="auth-feature-icon">{f.emoji}</span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-right">
        <div className="auth-card neu-raised fade-in">
          <div className="auth-card-header">
            <h2>Welcome back</h2>
            <p>Pick up where you left off with your student budget.</p>
          </div>

          {error && (
            <div className="alert-bar alert-bar-danger auth-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(!showPw)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="auth-form-meta">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
            >
              {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Sign In'}
            </button>
          </form>

          <div className="divider" />
          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
