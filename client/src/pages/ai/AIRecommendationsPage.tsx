import React, { useState } from 'react';
import {
  Sparkles, RefreshCw, CheckCircle, AlertTriangle,
  Brain, Send, Shield, HeartPulse, TrendingUp,
} from 'lucide-react';
import api from '../../services/api';
import type { AIRecommendation } from '../../types';
import './AIRecommendations.css';

const exampleContexts = [
  'I want to save more this month',
  "My food budget is always exceeded",
  "I have a loan EMI coming up",
  "I'm planning a vacation next month",
  "Help me understand my risk score",
];

const AIRecommendationsPage: React.FC = () => {
  const [result, setResult] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState('');
  const [asked, setAsked] = useState(false);

  const fetchRecommendations = async (ctx?: string) => {
    setLoading(true); setError(''); setAsked(true);
    try {
      const { data } = await api.post('/ai/recommendations', {
        context: ctx ?? context,
      });
      setResult(data.data);
    } catch (e: any) {
      setError(
        e.response?.data?.error?.message ??
        'AI recommendations unavailable. Make sure the backend has an LLM API key configured.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickContext = (ctx: string) => {
    setContext(ctx);
    fetchRecommendations(ctx);
  };

  return (
    <div className="ai-page">
      {/* Header */}
      <div className="page-header">
        <div className="ai-page-header">
          <div>
            <h1>AI Recommendations</h1>
            <p>Get personalized financial advice powered by AI, based on your real financial data</p>
          </div>
          {result && (
            <button className="btn btn-secondary btn-sm" onClick={() => fetchRecommendations()}>
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="neu-raised ai-input-card fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="ai-brain-icon">
            <Brain size={22} color="var(--primary-700)" />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Ask for Advice</h3>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>Tell the AI your concern or goal (optional)</p>
          </div>
        </div>

        <div className="ai-input-row">
          <input
            id="ai-context-input"
            placeholder="e.g. 'I want to reduce spending on food' or leave blank for general advice…"
            value={context}
            onChange={e => setContext(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && fetchRecommendations()}
          />
          <button
            id="btn-get-ai-advice"
            className="btn btn-primary"
            onClick={() => fetchRecommendations()}
            disabled={loading}
          >
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18 }} />
              : <><Send size={16} /> Get Advice</>
            }
          </button>
        </div>

        {/* Quick Context Chips */}
        <div className="ai-chips-row">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Quick:</span>
          {exampleContexts.map(ctx => (
            <button
              key={ctx}
              className="ai-chip"
              onClick={() => handleQuickContext(ctx)}
              disabled={loading}
            >
              {ctx}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="ai-loading fade-in">
          <div className="ai-loading-inner">
            <div className="ai-pulse-ring" />
            <Brain size={28} color="var(--primary-500)" />
          </div>
          <h3>Analyzing your financial data…</h3>
          <p>The AI is reviewing your income, expenses, budget, risk profile, and goals.</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="alert-bar alert-bar-danger" style={{ borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Could not load recommendations</strong>
            <p style={{ margin: 0, fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="ai-results fade-in">

          {/* Summary Card */}
          <div className="neu-raised ai-summary-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Sparkles size={18} color="var(--primary-500)" />
              <h3 style={{ margin: 0 }}>Your financial snapshot</h3>
            </div>
            <div className="ai-summary-stats">
              <div className="ai-summary-stat">
                <Shield size={17} />
                <span>Risk level</span>
                <strong>{result.context.riskLevel}</strong>
                <small>{result.context.riskScore}/100 risk score</small>
              </div>
              <div className="ai-summary-stat">
                <HeartPulse size={17} />
                <span>Financial health</span>
                <strong>{result.context.healthGrade}</strong>
                <small>{result.context.healthScore}/100 health score</small>
              </div>
              <div className="ai-summary-stat">
                <TrendingUp size={17} />
                <span>Month-end outlook</span>
                <strong>{result.context.willExceedBudget ? 'Review spending' : 'On track'}</strong>
                <small>{result.context.willExceedBudget ? 'Projected over budget' : 'Within your planned budget'}</small>
              </div>
            </div>
          </div>

          <div className="ai-two-col">
            {/* Recommendations */}
            <div className="neu-raised ai-recs-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <CheckCircle size={18} color="var(--success-dark)" />
                <h3 style={{ margin: 0 }}>Recommendations</h3>
                <span className="badge badge-success">{result.recommendations?.length ?? 0}</span>
              </div>
              <div className="ai-recs-list">
                {(result.recommendations ?? []).map((rec, i) => (
                  <div key={i} className="ai-rec-item">
                    <div className="ai-rec-num">{i + 1}</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ai-disclaimer">
            <AlertTriangle size={14} color="var(--text-muted)" />
            <span>AI-generated advice is based on your WealthMap data and is for informational purposes only. Always consult a certified financial advisor for major financial decisions.</span>
          </div>
        </div>
      )}

      {/* Empty state before first load */}
      {!result && !loading && !asked && (
        <div className="ai-empty-state fade-in">
          <div className="ai-empty-icon">
            <Sparkles size={40} color="var(--primary-300)" />
          </div>
          <h3>Ready to analyze your finances</h3>
          <p>Click "Get Advice" or choose a quick context above to receive personalized AI recommendations based on your actual financial data.</p>
          <button id="btn-start-ai" className="btn btn-primary btn-lg" onClick={() => fetchRecommendations()}>
            <Brain size={18} /> Get My Financial Advice
          </button>
        </div>
      )}
    </div>
  );
};

export default AIRecommendationsPage;
