import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, RefreshCw, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const OtpVerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthData } = useAuth();

  // Email can be passed via navigation state or query param
  const emailFromState = (location.state as any)?.email ?? '';
  const [email] = useState(emailFromState);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus next input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits
    const next = [...otp];
    next[index] = value.slice(-1); // only last char
    setOtp(next);
    setError('');

    // Auto advance
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      document.getElementById('otp-5')?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit OTP.'); return; }

    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp: code });
      if (data.success) {
        // Use setAuthData to update context state & localStorage
        setAuthData(data.data.token, data.data.user);
        setSuccess('OTP verified! Redirecting…');
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true); setError('');
    try {
      await api.post('/auth/send-otp', { email });
      setCountdown(60); setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setSuccess('A new OTP has been sent to your email.');
      setTimeout(() => setSuccess(''), 3000);
      document.getElementById('otp-0')?.focus();
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="auth-page">
        <div className="auth-right" style={{ width: '100%' }}>
          <div className="auth-card neu-raised fade-in">
            <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h2 style={{ textAlign: 'center' }}>Session Expired</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              Please go back and try logging in again.
            </p>
            <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/login')}>
              <ArrowLeft size={16} /> Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <ShieldCheck size={36} color="#fff" />
          </div>
          <h1>OTP Verification</h1>
          <p className="auth-tagline">Secure two-step authentication</p>
        </div>
        <div className="auth-checklist">
          <p className="auth-checklist-title">Why OTP verification?</p>
          {[
            'Protects your account from unauthorized access',
            'Ensures only you can log in, even if your password is stolen',
            'OTP expires in 10 minutes for maximum security',
            'One-time code sent directly to your email',
          ].map(item => (
            <div className="auth-checklist-item" key={item}>
              <CheckCircle size={16} color="var(--success)" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card neu-raised fade-in">
          <div className="auth-card-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--primary-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--neu-raised-sm)',
              }}>
                <Mail size={28} color="var(--primary-500)" />
              </div>
            </div>
            <h2>Check your email</h2>
            <p>We sent a 6-digit OTP to</p>
            <p style={{ fontWeight: 700, color: 'var(--primary-500)', wordBreak: 'break-all' }}>{email}</p>
          </div>

          {error && (
            <div className="alert-bar alert-bar-danger auth-error">
              <AlertCircle size={16} />{error}
            </div>
          )}
          {success && (
            <div className="alert-bar alert-bar-success auth-error">
              <CheckCircle size={16} />{success}
            </div>
          )}

          {/* OTP Input Boxes */}
          <div className="otp-input-row" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`otp-box ${digit ? 'otp-box-filled' : ''}`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            id="btn-verify-otp"
            className="btn btn-primary btn-full btn-lg"
            onClick={handleVerify}
            disabled={loading || otp.join('').length < 6}
            style={{ marginTop: '1.5rem' }}
          >
            {loading
              ? <><span className="spinner" style={{ width: 20, height: 20 }} /> Verifying…</>
              : <><ShieldCheck size={18} /> Verify OTP</>
            }
          </button>

          {/* Resend */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            {canResend ? (
              <button
                className="btn btn-secondary"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading
                  ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Sending…</>
                  : <><RefreshCw size={15} /> Resend OTP</>
                }
              </button>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Resend OTP in <strong style={{ color: 'var(--primary-500)' }}>{countdown}s</strong>
              </p>
            )}
          </div>

          <div className="divider" />
          <button
            className="btn btn-ghost btn-full"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={15} /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerifyPage;
