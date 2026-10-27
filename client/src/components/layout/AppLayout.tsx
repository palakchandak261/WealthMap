import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, CreditCard, Target,
  DollarSign, Calendar, BarChart2, Shield, Zap,
  GitBranch, Cpu, Sparkles, LogOut, Menu, X,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resetMockStore } from '../../services/mockData';
import './Layout.css';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  group?: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard',  icon: <LayoutDashboard size={20} />, label: 'Dashboard', group: 'Overview' },
  { to: '/income',     icon: <DollarSign size={20} />,      label: 'Income',    group: 'Finances' },
  { to: '/expenses',   icon: <CreditCard size={20} />,      label: 'Expenses',  group: 'Finances' },
  { to: '/budgets',    icon: <Target size={20} />,           label: 'Budgets',   group: 'Finances' },
  { to: '/obligations',icon: <Calendar size={20} />,         label: 'Obligations',group: 'Finances' },
  { to: '/goals',      icon: <TrendingUp size={20} />,       label: 'Goals',     group: 'Finances' },
  { to: '/forecast',   icon: <BarChart2 size={20} />,        label: 'Forecast',  group: 'Intelligence' },
  { to: '/risk',       icon: <Shield size={20} />,           label: 'Risk',      group: 'Intelligence' },
  { to: '/safe-to-spend', icon: <Zap size={20} />,          label: 'Safe to Spend', group: 'Intelligence' },
  { to: '/dependency-graph', icon: <GitBranch size={20} />, label: 'Dep. Graph', group: 'Advanced' },
  { to: '/simulation', icon: <Cpu size={20} />,             label: 'Simulator', group: 'Advanced' },
  { to: '/recommendations', icon: <Sparkles size={20} />,   label: 'AI Advice', group: 'Advanced' },
];

const groups = ['Overview', 'Finances', 'Intelligence', 'Advanced'];

const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void; onNavigate?: () => void }> = ({
  collapsed,
  onToggle,
  onNavigate,
}) => {
  const { user, logout } = useAuth();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img src="/wealthmap-logo.png" alt="WealthMap" />
        </div>
        {!collapsed && <span className="sidebar-logo-text">WealthMap</span>}
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Nav items grouped */}
      <nav className="sidebar-nav">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group);
          return (
            <div className="nav-group" key={group}>
              {!collapsed && <span className="nav-group-label">{group}</span>}
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-item-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User profile at bottom */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name ?? 'User'}</span>
              <span className="sidebar-user-email">{user?.email ?? ''}</span>
            </div>
            <button
              className="sidebar-logout"
              onClick={logout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            className="nav-item"
            onClick={logout}
            title="Logout"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="nav-item-icon"><LogOut size={20} /></span>
          </button>
        )}
      </div>
    </aside>
  );
};

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/income': 'Income',
  '/expenses': 'Expenses',
  '/budgets': 'Budgets',
  '/obligations': 'Obligations',
  '/goals': 'Goals',
  '/forecast': 'Forecast',
  '/risk': 'Risk overview',
  '/safe-to-spend': 'Safe to spend',
  '/dependency-graph': 'Dependency graph',
  '/simulation': 'Scenario simulator',
  '/recommendations': 'AI recommendations',
};

const Topbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] ?? 'Your workspace';

  const handleResetDemo = () => {
    resetMockStore();
    localStorage.setItem('wm_demo_mode', 'true');
    window.location.reload();
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="topbar-heading">
          <span className="topbar-eyebrow">WEALTHMAP WORKSPACE</span>
          <strong className="topbar-title">{pageTitle}</strong>
        </div>
      </div>
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
          onClick={handleResetDemo}
          title="Reload fresh demo mock data"
        >
          <Sparkles size={13} color="var(--primary-600)" />
          <RefreshCw size={11} /> Demo Data
        </button>

        <div className="topbar-user-copy">
          <span className="topbar-user-greeting">Signed in as</span>
          <strong>{user?.name ?? 'Demo User'}</strong>
        </div>
        <div className="topbar-avatar" aria-hidden="true">
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  );
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed-shell' : ''}`}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
          <div
            className="sidebar mobile-sidebar"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: 'translateX(0)' }}
          >
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
            <button className="mobile-close" onClick={() => setMobileOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="sidebar-wrapper">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Main content */}
      <div className="main-wrapper">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="main-content fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
