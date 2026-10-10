import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Zap, GitBranch, Cpu, Sparkles,
  ArrowRight, CheckCircle, BarChart2,
} from 'lucide-react';
import './Home.css';

const features = [
  {
    icon: <BarChart2 size={28} />,
    color: 'var(--primary-600)',
    bg: 'var(--primary-100)',
    title: 'See the month ahead',
    desc: 'Spot when food, travel, books or subscriptions could push you over your monthly plan.',
  },
  {
    icon: <Shield size={28} />,
    color: 'var(--danger-dark)',
    bg: 'var(--danger-light)',
    title: 'A student-friendly money check',
    desc: 'Understand whether your allowance or stipend can cover essentials and upcoming dues.',
  },
  {
    icon: <Zap size={28} />,
    color: 'var(--warning-dark)',
    bg: 'var(--warning-light)',
    title: 'Know your daily limit',
    desc: 'Keep room for hostel fees, rent, commute and bills before deciding what you can spend today.',
  },
  {
    icon: <GitBranch size={28} />,
    color: 'var(--success-dark)',
    bg: 'var(--success-light)',
    title: 'See where money goes',
    desc: 'Connect your allowance, part-time income, savings, campus costs and monthly commitments.',
  },
  {
    icon: <Cpu size={28} />,
    color: 'var(--primary-700)',
    bg: 'var(--primary-100)',
    title: 'Try a what-if first',
    desc: 'Check how a new phone, trip or course purchase could affect the rest of your month.',
  },
  {
    icon: <Sparkles size={28} />,
    color: 'var(--primary-500)',
    bg: 'var(--primary-100)',
    title: 'Helpful next steps',
    desc: 'Get clear suggestions based on your budget and spending—not one-size-fits-all advice.',
  },
];

const steps = [
  { n: '01', title: 'Create your account', desc: 'Set up your financial profile with income, budget and goals.' },
  { n: '02', title: 'Log your transactions', desc: 'Add income and expenses. The engines run automatically.' },
  { n: '03', title: 'Read your forecast',   desc: 'See projected month-end spending and risk score in real time.' },
  { n: '04', title: 'Simulate decisions',   desc: 'Ask "what if I buy this?" before you actually spend.' },
];

const stats = [
  { value: '11', label: 'Algorithms' },
  { value: '6',  label: 'Money health signals' },
  { value: '5',  label: 'Risk Dimensions' },
  { value: '∞',  label: 'What-If Scenarios' },
];

const HomePage: React.FC = () => (
  <div className="home-page">
    {/* ── Navbar ── */}
    <nav className="home-nav">
      <div className="home-nav-brand">
        <div className="home-nav-icon"><img src="/wealthmap-logo.png" alt="" /></div>
        <span>WealthMap</span>
      </div>
      <div className="home-nav-links">
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <Link to="/login" className="btn btn-secondary btn-sm">Log in</Link>
        <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
      </div>
    </nav>

    {/* ── Hero ── */}
    <section className="hero-section">
      <div className="hero-badge">
        <Sparkles size={14} /> Your student money companion
      </div>
      <h1 className="hero-title">
        Make student money<br />
        <span className="hero-gradient">go further.</span>
      </h1>
      <p className="hero-sub">
        Plan around your allowance, stipend, part-time income and campus costs.<br />
        See what’s safe to spend and what’s coming next—before the month gets away from you.
      </p>
      <div className="hero-cta">
        <Link to="/register" className="btn btn-primary btn-lg">
          Start for free <ArrowRight size={18} />
        </Link>
        <Link to="/login" className="btn btn-secondary btn-lg">
          Log in
        </Link>
      </div>

      <div className="hero-preview" aria-label="Preview of the WealthMap dashboard">
        <div className="preview-toolbar">
          <div className="preview-brand">
            <span className="preview-brand-mark"><img src="/wealthmap-logo.png" alt="" /></span>
            WealthMap <span>/</span> Overview
          </div>
          <span className="preview-period">This month</span>
        </div>
        <div className="preview-content">
          <div className="preview-intro">
            <div>
              <span className="preview-caption">YOUR FINANCIAL SNAPSHOT</span>
              <strong>Make your next campus-money move with confidence.</strong>
            </div>
            <span className="preview-status"><span /> All systems looking good</span>
          </div>
          <div className="preview-metrics">
            <div className="preview-metric">
              <span>Monthly income</span>
              <strong>₹ 12,000</strong>
              <small>Allowance + part-time income</small>
            </div>
            <div className="preview-metric">
              <span>Safe to spend</span>
              <strong>₹ 350 <small>/ day</small></strong>
              <small>After rent, fees and essentials</small>
            </div>
            <div className="preview-chart-card">
              <div className="preview-chart-heading">
                <span>Monthly spending outlook</span>
                <span>Forecast</span>
              </div>
              <div className="preview-chart" aria-hidden="true">
                {[35, 49, 42, 63, 51, 72, 60, 82, 67, 91, 73, 86].map((height, index) => (
                  <span
                    key={index}
                    className={index > 8 ? 'preview-chart-bar preview-chart-bar-muted' : 'preview-chart-bar'}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="preview-chart-labels"><span>Week 1</span><span>Week 4</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="hero-stats">
        {stats.map((s) => (
          <div className="hero-stat" key={s.label}>
            <span className="hero-stat-value">{s.value}</span>
            <span className="hero-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>

    {/* ── Features ── */}
    <section className="home-section" id="features">
      <div className="section-label">What makes WealthMap different</div>
      <h2 className="section-title">Built for real student life</h2>
      <p className="section-sub">
        From hostel rent and mess bills to books, travel, subscriptions and that end-of-month squeeze.
      </p>
      <div className="features-grid">
        {features.map((f) => (
          <div className="feature-card neu-raised" key={f.title}>
            <div className="feature-icon-wrap" style={{ background: f.bg, color: f.color }}>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ── How it works ── */}
    <section className="home-section home-section-alt" id="how-it-works">
      <div className="section-label">Getting started</div>
      <h2 className="section-title">Up and running in minutes</h2>
      <div className="steps-grid">
        {steps.map((s, i) => (
          <div className="step-card" key={i}>
            <div className="step-number">{s.n}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ── Why WealthMap ── */}
    <section className="home-section">
      <div className="why-grid">
        <div className="why-text">
          <div className="section-label">The core philosophy</div>
          <h2 className="section-title">Make your money last through the semester.</h2>
          <p>
            Student life has uneven expenses: fees, rent, books, travel, food and a social life.
            WealthMap helps you plan around the whole month, not just yesterday’s spending.
          </p>
          <ul className="why-list">
            {[
              'Track allowance, scholarships, stipends and part-time income',
              'Plan for tuition, hostel or rent, mess, books and travel',
              'See a realistic daily spending amount after upcoming costs',
              'Try a what-if purchase without changing your actual records',
              'Start with manual entries—no bank connection needed',
            ].map((item) => (
              <li key={item}><CheckCircle size={16} color="var(--success-dark)" /> {item}</li>
            ))}
          </ul>
          <Link to="/register" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            Try it free <ArrowRight size={16} />
          </Link>
        </div>
        <div className="why-visual neu-raised">
          <div className="mini-dashboard">
            <div className="mini-row">
              <span>Risk Score</span>
              <span className="badge badge-warning">42 / 100</span>
            </div>
            <div className="mini-row">
              <span>Health Score</span>
              <span className="badge badge-success">79 / 100</span>
            </div>
            <div className="mini-row">
              <span>Safe to Spend</span>
              <strong style={{ color: 'var(--success-dark)' }}>₹350 / day</strong>
            </div>
            <div className="mini-row">
              <span>Month-End Forecast</span>
              <strong style={{ color: 'var(--warning-dark)' }}>₹10,200</strong>
            </div>
            <div className="mini-divider" />
            <div className="mini-alert">
              <Shield size={14} color="var(--warning-dark)" />
              Food and travel are trending higher
            </div>
            <div className="mini-alert mini-alert-ok">
              <CheckCircle size={14} color="var(--success-dark)" />
              Upcoming rent is accounted for
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── CTA Banner ── */}
    <section className="cta-section">
      <h2>Make your next semester feel more manageable.</h2>
      <p>Start with your allowance, stipend or part-time income. No bank connection needed.</p>
      <Link to="/register" className="btn btn-primary btn-lg">
        Create your account <ArrowRight size={18} />
      </Link>
    </section>

    {/* ── Footer ── */}
    <footer className="home-footer">
      <div className="home-footer-brand">
        <div className="home-nav-icon home-footer-icon">
          <img src="/wealthmap-logo.png" alt="" />
        </div>
        <span>WealthMap</span>
      </div>
      <p>
        WealthMap provides computational insights based on user-provided data.
        It is not a replacement for professional financial advice.
      </p>
      <div className="home-footer-links">
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </div>
    </footer>
  </div>
);

export default HomePage;
