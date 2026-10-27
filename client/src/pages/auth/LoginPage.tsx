import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiErrors';
import api from '../../services/api';
import { INITIAL_DEMO_USER, resetMockStore } from '../../services/mockData';
import './Auth.css';

// Google reCAPTCHA v2 test site key (always passes in dev — replace with real key in production)
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const LoginPage: React.FC = () => {
  const { login, setAuthData } = useAuth();
  const navigate = useNavigate();
  const captchaRef = useRef<ReCAPTCHA>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [useOtp, setUseOtp] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (!captchaToken) { setError('Please complete the CAPTCHA verification.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Invalid credentials. Please try again.'));
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async () => {
    setError('');
    if (!email) { setError('Please enter your email address first.'); return; }
    if (!captchaToken) { setError('Please complete the CAPTCHA verification.'); return; }
    setOtpLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      navigate('/verify-otp', { state: { email } });
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Failed to send OTP. Please try again.');
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDemoAccess = () => {
    resetMockStore();
    localStorage.setItem('wm_demo_mode', 'true');
    localStorage.setItem('wm_token', 'mock-demo-jwt-token-wealthmap');
    localStorage.setItem('wm_user', JSON.stringify(INITIAL_DEMO_USER));
    setAuthData('mock-demo-jwt-token-wealthmap', INITIAL_DEMO_USER);
    navigate('/dashboard');
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
          <p className="auth-tagline">Your intelligent financial companion</p>
        </div>

        <div className="auth-features">
          {[
            { emoji: '📊', title: 'Inflation-Aware Goals', desc: 'Real purchasing power and future costs calculated' },
            { emoji: '🛡️', title: 'Safe-To-Spend Tracking', desc: 'Positive feedback & appreciation when you spend safely' },
            { emoji: '📁', title: 'Excel & CSV Importer', desc: 'Upload spreadsheet expenses with instant auto-parsing' },
            { emoji: '🤖', title: 'AI Financial Advisor', desc: 'Actionable monthly saving recommendations powered by AI' },
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
            <h2>Welcome to WealthMap</h2>
            <p>Sign in to your account or jump into the interactive demo.</p>
          </div>

          {/* Quick Demo Mode Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(47, 167, 122, 0.12), rgba(23, 110, 83, 0.08))',
            border: '1px solid var(--primary-300)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-700)', fontWeight: 600, fontSize: '0.9rem' }}>
              <Sparkles size={16} /> Instant Demo Presentation
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Explore all features with complete mock data, inflation calculations, safe-to-spend appreciation, and CSV upload!
            </p>
            <button
              type="button"
              id="btn-demo-login"
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-start', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={handleDemoAccess}
            >
              <Sparkles size={14} /> Launch Demo Workspace
            </button>
          </div>

          {error && (
            <div className="alert-bar alert-bar-danger auth-error">
              <AlertCircle size={16} />{error}
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
                  placeholder="demo@wealthmap.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {!useOtp && (
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-icon-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter password"
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
            )}

            {/* reCAPTCHA */}
            <div className="captcha-wrapper">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>

            {!useOtp ? (
              <button
                id="btn-login"
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading || !captchaToken}
              >
                {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Sign In'}
              </button>
            ) : (
              <button
                id="btn-send-otp"
                type="button"
                className="btn btn-primary btn-lg btn-full"
                onClick={handleOtpLogin}
                disabled={otpLoading || !captchaToken}
              >
                {otpLoading
                  ? <><span className="spinner" style={{ width: 20, height: 20 }} /> Sending OTP…</>
                  : <><ShieldCheck size={18} /> Send OTP to Email</>
                }
              </button>
            )}
          </form>

          {/* OTP toggle */}
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
              onClick={() => { setUseOtp(!useOtp); setError(''); }}
            >
              {useOtp ? '🔑 Use password instead' : <><ShieldCheck size={14} /> Login with OTP instead</>}
            </button>
          </div>

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
