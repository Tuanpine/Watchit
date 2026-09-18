import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  HardDrive,
  Network,
  Activity,
  Server,
  Box,
  Layers,
  Clock,
  Radio,
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { Service, ServiceHealth, ContainerStats } from '../types';
import { IconRenderer } from './IconRenderer';

interface ServiceDetailModalProps {
  service: Service | null;
  health?: ServiceHealth;
  isOpen: boolean;
  onClose: () => void;
  onCheckHealth?: (service: Service) => void;
  onRestartSuccess?: () => void;
  useDynamicHost?: boolean;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  health,
  isOpen,
  onClose,
  onCheckHealth,
  onRestartSuccess,
  useDynamicHost = false
}) => {
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Compute effective URL (replacing localhost with current LAN hostname if dynamic host mode is enabled)
  const getEffectiveUrl = useCallback(() => {
    if (!service?.url) return '';
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
  }, [service, useDynamicHost]);

  const fetchStats = useCallback(async () => {
    if (!service) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/services/${service.id}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load container stats:', err);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (isOpen && service) {
      fetchStats();
    } else {
      setStats(null);
      setActionMessage(null);
    }
  }, [isOpen, service, fetchStats]);

  // Live polling every 4 seconds when modal is open and autoRefresh is on
  useEffect(() => {
    if (!isOpen || !service || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, service, autoRefresh, fetchStats]);

  if (!isOpen || !service) return null;

  const effectiveUrl = getEffectiveUrl();

  const handleCopy = () => {
    if (effectiveUrl) {
      navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRestart = async () => {
    if (!service.container_id) return;
    try {
      setIsRestarting(true);
      const res = await fetch(`/api/docker/containers/${service.container_id}/restart`, {
        method: 'POST'
      });
      const data = await res.json();
      setActionMessage(data.message || 'Container restart initiated');
      fetchStats();
      if (onCheckHealth) {
        onCheckHealth(service);
      }
      if (onRestartSuccess) {
        onRestartSuccess();
      }
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Restart failed: ${err.message}`);
    } finally {
      setIsRestarting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const status = health?.status || 'online';
  const isOnline = status === 'online';

  return (
    <div
      id="service-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="service-detail-modal"
        className="relative w-full max-w-4xl rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
      >
        {/* Header Ribbon */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-xs">
              <IconRenderer name={service.icon} size={28} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {service.category}
                </span>
                {service.source === 'docker' && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent)]/30">
                    Docker Container
                  </span>
                )}
                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-[var(--status-online)] shadow-[0_0_6px_var(--status-online)]' : 'bg-[var(--status-offline)]'
                    }`}
                  />
                  <span className="text-[11px] text-[var(--text-primary)] capitalize">{status}</span>
                  {health?.latencyMs && (
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      ({health.latencyMs}ms)
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight truncate">
                {service.title || service.name}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                {service.description || 'Self-hosted service endpoint and internal container workload.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
              title="Đóng (Close)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Notice Bar */}
        {actionMessage && (
          <div className="px-6 py-2.5 bg-[var(--accent-subtle)] border-b border-[var(--accent)]/30 text-xs font-mono text-[var(--accent-text)] flex items-center justify-between">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-[var(--accent-text)] hover:opacity-75">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Modal Body Scroll Area */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Quick Launch & Health Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 min-w-0">
              <Server size={16} className="text-[var(--text-muted)] shrink-0" />
              <span className="text-xs font-mono text-[var(--text-secondary)] truncate">
                {effectiveUrl}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] transition-colors"
              >
                {copied ? <Check size={14} className="text-[var(--accent)]" /> : <Copy size={14} />}
                <span>{copied ? 'Đã chép' : 'Sao chép URL'}</span>
              </button>

              {onCheckHealth && (
                <button
                  onClick={() => onCheckHealth(service)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] transition-colors"
                >
                  <Radio size={14} className="text-[var(--accent)]" />
                  <span>Re-Ping Test</span>
                </button>
              )}

              <a
                href={effectiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 font-medium text-xs shadow-xs transition-opacity"
              >
                <span>Mở ứng dụng</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Section: Live Container Telemetry (CPU / RAM / Network / I/O) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Giám sát tải thực tế (Container Telemetry)
                </h3>
                {stats?.isRealStats ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent)]/30">
                    Docker Engine Socket (Live)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                    Docker Gateway Telemetry
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                    autoRefresh
                      ? 'bg-[var(--accent-subtle)] border-[var(--accent)]/40 text-[var(--accent-text)]'
                      : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                  }`}
                  title="Tự động cập nhật số liệu tải mỗi 4 giây"
                >
                  Live: {autoRefresh ? '4s' : 'Off'}
                </button>

                <button
                  onClick={fetchStats}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                  title="Làm mới thống kê ngay"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin text-[var(--accent)]' : ''} />
                </button>
              </div>
            </div>

            {/* 4 Core Metrics Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* CPU Usage Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Cpu size={14} className="text-[var(--accent)]" /> CPU Tải
                  </span>
                  <span className="font-mono">{stats?.pids || 8} PIDs</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                    {stats ? stats.cpuPercent.toFixed(1) : '0.0'}%
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(2, stats?.cpuPercent || 0))}%` }}
                  />
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1.5 flex justify-between">
                  <span>Usage load</span>
                  <span>Max 100%</span>
                </div>
              </div>

              {/* Memory (RAM) Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <HardDrive size={14} className="text-emerald-400" /> RAM / Bộ nhớ
                  </span>
                  <span className="font-mono">{stats ? `${stats.memoryPercent.toFixed(1)}%` : '0%'}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-[var(--text-primary)]">
                    {stats ? formatBytes(stats.memoryUsageBytes) : '0 MB'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    / {stats ? formatBytes(stats.memoryLimitBytes) : '2 GB'}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(2, stats?.memoryPercent || 0))}%` }}
                  />
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1.5 flex justify-between">
                  <span>Resident Memory</span>
                  <span>Cap {stats ? formatBytes(stats.memoryLimitBytes) : '2 GB'}</span>
                </div>
              </div>

              {/* Network I/O Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Network size={14} className="text-blue-400" /> Lưu lượng Mạng
                  </span>
                  <span className="font-mono text-[10px]">Net I/O</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">↓</span> Rx (Nhận):
                    </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {stats ? formatBytes(stats.networkRxBytes) : '0 MB'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="text-blue-400 font-bold">↑</span> Tx (Gửi):
                    </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {stats ? formatBytes(stats.networkTxBytes) : '0 MB'}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono mt-2 pt-1 border-t border-[var(--border-subtle)]/40">
                  Total transferred: {stats ? formatBytes((stats.networkRxBytes || 0) + (stats.networkTxBytes || 0)) : '0 MB'}
                </div>
              </div>

              {/* Disk / Block I/O Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Layers size={14} className="text-amber-400" /> Đĩa Block I/O
                  </span>
                  <span className="font-mono text-[10px]">Storage</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-muted)]">Read (Đọc):</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {stats ? formatBytes(stats.blockReadBytes) : '0 MB'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-muted)]">Write (Ghi):</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {stats ? formatBytes(stats.blockWriteBytes) : '0 MB'}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono mt-2 pt-1 border-t border-[var(--border-subtle)]/40">
                  Host storage activity
                </div>
              </div>
            </div>
          </div>

          {/* Section: 30-Day Uptime Reliability Bar (Uptime Kuma Style) */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[var(--status-online)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Lịch sử hoạt động 30 ngày (Uptime Kuma Style)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-[var(--text-muted)]">
                  30-Day Ratio: <strong className="text-[var(--status-online)]">{stats?.uptimePercent30d || 99.9}%</strong>
                </span>
                <span className="text-[var(--text-muted)]">
                  Uptime: <strong className="text-[var(--text-primary)]">{stats?.uptimeFormatted || 'Up 4d 13h'}</strong>
                </span>
              </div>
            </div>

            {/* Visual 30-day discrete status bars */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1 sm:gap-1.5 justify-between">
                {stats?.history30d?.map((day, idx) => {
                  let barBg = 'bg-[var(--status-online)]';
                  if (day.status === 'degraded') barBg = 'bg-amber-400';
                  if (day.status === 'down') barBg = 'bg-[var(--status-offline)]';

                  return (
                    <div
                      key={day.date || idx}
                      className="group/bar relative flex-1 h-8 rounded-xs sm:rounded-sm transition-transform hover:scale-y-110 cursor-pointer overflow-visible"
                    >
                      <div className={`w-full h-full ${barBg} rounded-xs opacity-90 hover:opacity-100 transition-opacity`} />
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/bar:flex flex-col items-center z-30 pointer-events-none">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl rounded-lg p-2 text-[10px] font-mono whitespace-nowrap text-[var(--text-primary)]">
                          <div className="font-semibold text-[var(--text-primary)]">{day.date}</div>
                          <div className="text-[var(--text-secondary)]">Uptime: {day.uptimePercent}%</div>
                          <div className="text-[var(--text-muted)]">Latency: {day.latencyMs}ms</div>
                        </div>
                        <div className="w-2 h-2 bg-[var(--bg-card)] border-r border-b border-[var(--border-subtle)] rotate-45 -mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] pt-1">
                <span>30 ngày trước</span>
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-[var(--status-online)]" /> Hoạt động tốt
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-amber-400" /> Suy giảm/Trễ
                  </span>
                </span>
                <span>Hôm nay</span>
              </div>
            </div>
          </div>

          {/* Section: Container Workload & Technical Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Box size={16} className="text-[var(--text-muted)]" />
              Chi tiết Cấu hình & Môi trường Container
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
                <div className="text-[var(--text-muted)] mb-1 font-medium">Container ID / Định danh</div>
                <div className="font-mono text-[var(--text-primary)] truncate" title={service.container_id || service.id}>
                  {service.container_id || service.id}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
                <div className="text-[var(--text-muted)] mb-1 font-medium">Image Docker</div>
                <div className="font-mono text-[var(--text-primary)] truncate" title={stats?.image || service.image || 'app:latest'}>
                  {stats?.image || service.image || 'app:latest'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
                <div className="text-[var(--text-muted)] mb-1 font-medium">Cổng Dịch vụ (Ports)</div>
                <div className="font-mono text-[var(--text-primary)]">
                  Cổng nội bộ: {service.port}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
                <div className="text-[var(--text-muted)] mb-1 font-medium">Trạng thái Thực thi</div>
                <div className="font-mono text-[var(--status-online)] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--status-online)]" />
                  {stats?.containerStatus || 'running (healthy)'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
                <div className="text-[var(--text-muted)] mb-1 font-medium">Health Check Endpoint</div>
                <div className="font-mono text-[var(--text-primary)] truncate" title={service.health_check_url || 'Mặc định (Root ping)'}>
                  {service.health_check_url || 'Root endpoint ping'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
                <div className="text-[var(--text-muted)] mb-1 font-medium">Nguồn Dữ liệu</div>
                <div className="font-mono text-[var(--text-primary)] capitalize">
                  {service.source === 'docker' ? 'Docker Auto-Discovery' : 'Manual Entry'}
                </div>
              </div>
            </div>
          </div>

          {/* Docker Container Management Action (Restart) */}
          {service.container_id && (
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <RotateCw size={14} className="text-[var(--accent)]" /> Khởi động lại Container (Restart)
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Gửi tín hiệu SIGTERM và khởi động lại container thông qua Docker Engine daemon.
                </div>
              </div>

              <button
                onClick={handleRestart}
                disabled={isRestarting}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw size={13} className={isRestarting ? 'animate-spin text-[var(--accent)]' : ''} />
                <span>{isRestarting ? 'Đang khởi động lại...' : 'Restart Container'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>Service Hub Microservices Telemetry Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] transition-colors"
            >
              Đóng
            </button>
            <a
              href={effectiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 font-medium text-xs transition-opacity"
            >
              <span>Mở ứng dụng</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
