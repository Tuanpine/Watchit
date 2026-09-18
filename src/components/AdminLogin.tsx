import React, { useState } from 'react';
import { Shield, Lock, User, AlertTriangle, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string, user: { username: string; role: string }) => void;
  onBackToPortal: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToPortal }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        if (data.waitSeconds !== undefined) {
          setWaitSeconds(data.waitSeconds);
        }
        setIsLoading(false);
        return;
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError('Network connection error: ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[var(--accent-subtle)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] mb-4 shadow-xs">
            <Shield size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Admin Authentication
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs mx-auto">
            Protected management portal with bcrypt hashing, rate limiting, and JWT tokens.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400 flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                {waitSeconds && waitSeconds > 0 && (
                  <p className="text-[11px] text-red-300 mt-1 font-mono">
                    Locked for {waitSeconds} seconds
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Password
              </label>
              {remainingAttempts !== null && (
                <span className="text-[10px] text-amber-400 font-mono">
                  {remainingAttempts} attempts left
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || (waitSeconds !== null && waitSeconds > 0)}
            className="w-full py-2.5 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Quick Default Credentials Tip */}
          <div className="pt-3 border-t border-[var(--border-subtle)] text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] font-mono">
              <CheckCircle2 size={13} className="text-[var(--accent)]" />
              <span>Default credentials: <strong>admin</strong> / <strong>admin</strong></span>
            </div>
          </div>

          {/* Back to Portal button */}
          <div className="text-center">
            <button
              type="button"
              onClick={onBackToPortal}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Return to Public Service Portal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
