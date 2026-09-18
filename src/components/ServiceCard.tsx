import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Star, RefreshCw } from 'lucide-react';
import { Service, ServiceHealth } from '../types';
import { IconRenderer } from './IconRenderer';

interface ServiceCardProps {
  service: Service;
  health?: ServiceHealth;
  onCheckHealth?: (service: Service) => void;
  onSelectService?: (service: Service) => void;
  viewMode?: 'grid' | 'list';
  isPinned?: boolean;
  onTogglePin?: (serviceId: string) => void;
  useDynamicHost?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  health,
  onCheckHealth,
  onSelectService,
  viewMode = 'grid',
  isPinned = false,
  onTogglePin,
  useDynamicHost = false
}) => {
  const [copied, setCopied] = useState(false);

  // Compute effective URL (replacing localhost with current LAN hostname if dynamic host mode is enabled)
  const getEffectiveUrl = () => {
    if (!service.url) return '';
    if (useDynamicHost && typeof window !== 'undefined' && window.location.hostname) {
      try {
        const parsed = new URL(service.url);
        if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
          parsed.hostname = window.location.hostname;
          return parsed.toString();
        }
      } catch {
        return service.url;
      }
    }
    return service.url;
  };

  const effectiveUrl = getEffectiveUrl();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (effectiveUrl) {
      navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onTogglePin) {
      onTogglePin(service.id);
    }
  };

  const handleHealthBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onCheckHealth) {
      onCheckHealth(service);
    }
  };

  const handleCardClick = () => {
    if (onSelectService) {
      onSelectService(service);
    } else if (effectiveUrl) {
      window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const status = health?.status || 'unknown';
  const isOnline = status === 'online';
  const isOffline = status === 'offline';
  const isChecking = status === 'checking';
  const isUnknown = status === 'unknown';

  // Format URL display
  let cleanUrlDisplay = effectiveUrl.replace(/^https?:\/\//, '');
  if (cleanUrlDisplay.endsWith('/')) {
    cleanUrlDisplay = cleanUrlDisplay.slice(0, -1);
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className="group relative flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Favorite Pin Button */}
          {onTogglePin && (
            <button
              onClick={handlePin}
              title={isPinned ? 'Unpin from favorites' : 'Pin to favorites'}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                isPinned
                  ? 'text-amber-400 bg-amber-400/10'
                  : 'text-[var(--text-muted)] hover:text-amber-400 hover:bg-[var(--bg-elevated)] opacity-0 group-hover:opacity-100'
              }`}
            >
              <Star size={14} className={isPinned ? 'fill-amber-400' : ''} />
            </button>
          )}

          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:border-[var(--accent)] transition-colors">
            <IconRenderer name={service.icon} size={20} />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                {service.title || service.name}
              </h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                {service.category}
              </span>
              {service.source === 'docker' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent)]/30 shrink-0">
                  Docker
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] line-clamp-1">
              {service.description || 'Self-hosted internal microservice'}
            </p>
          </div>
        </div>

        {/* Status & Port */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-xs text-[var(--text-secondary)]">
              {cleanUrlDisplay}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              Port :{service.port}
            </span>
          </div>

          {/* Live Status Badge (Clickable for on-demand ping) */}
          <button
            onClick={handleHealthBadgeClick}
            title="Click to re-ping this service"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs transition-colors cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline
                  ? 'bg-[var(--status-online)] shadow-[0_0_6px_var(--status-online)]'
                  : isOffline
                  ? 'bg-[var(--status-offline)]'
                  : 'bg-zinc-400 dark:bg-zinc-500'
              } ${isChecking ? 'animate-ping' : ''}`}
            />
            <span className="text-[11px] font-mono text-[var(--text-secondary)] capitalize">
              {isUnknown ? 'untested' : status}
            </span>
            {health?.latencyMs && (
              <span className="text-[10px] font-mono text-[var(--text-muted)] hidden xs:inline">
                {health.latencyMs}ms
              </span>
            )}
            {isChecking ? (
              <RefreshCw size={10} className="animate-spin text-[var(--accent)]" />
            ) : null}
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              title="Sao chép URL (Copy URL)"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              {copied ? <Check size={14} className="text-[var(--accent)]" /> : <Copy size={14} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (effectiveUrl) window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
              }}
              title="Mở trong tab mới (Open in new tab)"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid Flashcard view
  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between p-5 rounded-xl border bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)] transition-all duration-200 cursor-pointer overflow-hidden shadow-xs hover:shadow-md ${
        isPinned ? 'border-amber-500/30' : 'border-[var(--border-subtle)]'
      }`}
    >
      {/* Top Accent Strip */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] transition-colors ${
          isPinned ? 'bg-amber-400' : 'bg-transparent group-hover:bg-[var(--accent)]'
        }`}
      />

      {/* Top Row: Icon, Pin & Status Badge */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:border-[var(--accent)] transition-colors">
            <IconRenderer name={service.icon} size={24} />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Favorite Pin Button */}
            {onTogglePin && (
              <button
                onClick={handlePin}
                title={isPinned ? 'Unpin from favorites' : 'Pin to favorites'}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPinned
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-[var(--text-muted)] hover:text-amber-400 hover:bg-[var(--bg-elevated)] opacity-0 group-hover:opacity-100'
                }`}
              >
                <Star size={14} className={isPinned ? 'fill-amber-400' : ''} />
              </button>
            )}

            {/* Live Health Badge (Click to re-ping) */}
            <button
              onClick={handleHealthBadgeClick}
              title={
                isChecking
                  ? 'Testing service health...'
                  : health?.error
                  ? `Error: ${health.error} (Click to re-test)`
                  : `Latency: ${health?.latencyMs || 10}ms (Click to re-test)`
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline
                    ? 'bg-[var(--status-online)] shadow-[0_0_6px_var(--status-online)]'
                    : isOffline
                    ? 'bg-[var(--status-offline)]'
                    : 'bg-zinc-400 dark:bg-zinc-500'
                } ${isChecking ? 'animate-ping' : ''}`}
              />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium">
                {isUnknown ? 'untested' : status}
              </span>
              {health?.latencyMs && isOnline && (
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {health.latencyMs}ms
                </span>
              )}
              {isChecking && (
                <RefreshCw size={10} className="animate-spin text-[var(--accent)]" />
              )}
            </button>
          </div>
        </div>

        {/* Title & Category Row */}
        <div className="mb-2">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              {service.category}
            </span>
            {service.source === 'docker' && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent)]/30">
                Docker
              </span>
            )}
            {isPinned && (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                Pinned
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors tracking-tight">
            {service.title || service.name}
          </h3>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-4">
          {service.description || 'Internal host service application and microservice portal.'}
        </p>
      </div>

      {/* Bottom Footer: Host / Port & Actions */}
      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-mono text-[var(--text-muted)] truncate group-hover:text-[var(--text-secondary)] transition-colors">
            {cleanUrlDisplay}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            title="Sao chép URL (Copy service URL)"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            {copied ? <Check size={14} className="text-[var(--accent)]" /> : <Copy size={14} />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (effectiveUrl) window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
            }}
            title="Mở trực tiếp trong tab mới (Open in new tab)"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
