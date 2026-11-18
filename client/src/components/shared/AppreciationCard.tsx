import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import type { SpendingAppreciation } from '../../types';

const ICONS: Record<SpendingAppreciation['level'], string> = {
  CHAMPION: '🏆',
  GREAT: '🎉',
  GOOD: '👏',
  OVER: '⚠️',
  NO_BUDGET: '🎯',
};

const BADGES: Record<SpendingAppreciation['level'], string> = {
  CHAMPION: 'Savings champion',
  GREAT: 'Great discipline',
  GOOD: 'Under safe-to-spend',
  OVER: 'Heads-up',
  NO_BUDGET: 'Get started',
};

interface Props {
  appreciation: SpendingAppreciation | null | undefined;
  /** Hide the card when the user has no budget yet (keeps the dashboard clean) */
  hideWhenNoBudget?: boolean;
  style?: React.CSSProperties;
}

/**
 * Rewards the user when day-to-day spending is below their safe-to-spend allowance
 * and nudges them (without shaming) when they are ahead of the safe pace.
 */
const AppreciationCard: React.FC<Props> = ({ appreciation: a, hideWhenNoBudget = false, style }) => {
  if (!a) return null;
  if (a.level === 'NO_BUDGET' && hideWhenNoBudget) return null;

  const showStats = a.level !== 'NO_BUDGET';

  return (
    <div className={`appreciation-card level-${a.level} fade-in`} style={style} role="status">
      <div className="appreciation-icon" aria-hidden="true">{ICONS[a.level]}</div>
      <div className="appreciation-body">
        <span className={`appreciation-badge level-${a.level}`}>{BADGES[a.level]}</span>
        <h3>{a.title}</h3>
        <p>{a.message}</p>

        {showStats && (
          <div className="appreciation-stats">
            <span>Safe allowance so far<strong>{formatCurrency(a.allowanceToDate)}</strong></span>
            <span>Day-to-day spent<strong>{formatCurrency(a.discretionarySpent)}</strong></span>
            {a.eligible
              ? <span>Saved vs safe-to-spend<strong className="text-success">+{formatCurrency(a.savedSoFar)} ({a.savedPct}%)</strong></span>
              : <span>Over safe pace by<strong className="text-warning">{formatCurrency(Math.abs(a.savedSoFar))}</strong></span>}
            <span>Today left<strong className={a.todayRemaining >= 0 ? '' : 'text-warning'}>{formatCurrency(a.todayRemaining)}</strong></span>
            {a.streakDays > 0 && <span>Streak<strong>{a.streakDays} day{a.streakDays === 1 ? '' : 's'} 🔥</strong></span>}
          </div>
        )}

        {a.suggestion && (
          <div className="appreciation-suggestion">
            {a.eligible
              ? <Link to="/goals" className="appreciation-cta">{a.suggestion} <ArrowRight size={14} /></Link>
              : a.suggestion}
          </div>
        )}
        {a.level === 'NO_BUDGET' && (
          <div className="appreciation-suggestion">
            <Link to="/budgets" className="appreciation-cta">Set up a budget <ArrowRight size={14} /></Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppreciationCard;
