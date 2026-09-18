import React from 'react';
import { Boxes, Shield, RefreshCw, LayoutGrid, Palette, LogOut, CheckCircle2, User } from 'lucide-react';
import { ThemeMode, UserSession } from '../types';

interface NavbarProps {
  currentView: 'portal' | 'admin';
  onViewChange: (view: 'portal' | 'admin') => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  user: UserSession | null;
  onLogout: () => void;
  isCheckingHealth: boolean;
  onRefreshHealth: () => void;
  onlineCount: number;
  totalServices: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  theme,
  onThemeChange,
  user,
  onLogout,
  isCheckingHealth,
  onRefreshHealth,
  onlineCount,
  totalServices
}) => {
  const themes: Array<{ id: ThemeMode; label: string; color: string }> = [
    { id: 'forest', label: 'Dark Forest', color: '#22c55e' },
    { id: 'earth', label: 'Grey-Brown', color: '#d97706' },
    { id: 'slate', label: 'Slate Dark', color: '#06b6d4' },
    { id: 'light', label: 'Clean Light', color: '#16a34a' }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onViewChange('portal')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
              <Boxes size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)] tracking-tight">
                  Service Hub
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  Portal
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
                Docker &amp; Project Dashboard
              </p>
            </div>
          </div>

          {/* Quick status pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--status-online)] animate-pulse" />
            <span className="font-mono text-[11px] font-medium text-[var(--text-primary)]">{onlineCount}/{totalServices}</span>
            <span className="text-[11px] text-[var(--text-muted)]">online</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Health check refresh button */}
          <button
            onClick={onRefreshHealth}
            disabled={isCheckingHealth}
            title="Ping &amp; verify all service health checks"
            className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={isCheckingHealth ? 'animate-spin text-[var(--accent)]' : ''} />
          </button>

          {/* Theme Dropdown / Switcher */}
          <div className="relative group">
            <button
              aria-label="Change Theme"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Palette size={14} className="text-[var(--accent)]" />
              <span className="hidden sm:inline capitalize">{theme}</span>
            </button>

            <div className="absolute right-0 top-full mt-1 w-36 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Color Palette
              </div>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors ${
                    theme === t.id
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span>{t.label}</span>
                  </div>
                  {theme === t.id && <CheckCircle2 size={12} className="text-[var(--accent)]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-[1px] bg-[var(--border-subtle)]" />

          {/* Navigation View Switcher */}
          {currentView === 'admin' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewChange('portal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
              >
                <LayoutGrid size={14} />
                <span>View Public Portal</span>
              </button>

              {user && (
                <button
                  onClick={onLogout}
                  title="Sign out of Admin"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onViewChange('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                user
                  ? 'bg-[var(--accent-subtle)] border border-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent)] hover:text-white'
                  : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent)]'
              }`}
            >
              <Shield size={14} className={user ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
              <span>{user ? 'Admin Dashboard' : 'Admin Login'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
