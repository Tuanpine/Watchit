import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lock,
  ExternalLink,
  Sliders,
  Server,
  Network,
  Info
} from 'lucide-react';
import { SecurityAuditReport } from '../types';

interface SecurityAuditViewProps {
  report: SecurityAuditReport | null;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateToSettings: () => void;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  report,
  isLoading,
  onRefresh,
  onNavigateToSettings
}) => {
  if (isLoading && !report) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
        <RefreshCw className="animate-spin mx-auto text-[var(--accent)]" size={32} />
        <p className="text-sm font-medium text-[var(--text-primary)]">Đang quét và kiểm toán an ninh hệ thống...</p>
        <p className="text-xs text-[var(--text-muted)]">Kiểm tra mật khẩu, Docker socket, JWT token, headers và cơ chế chống tấn công.</p>
      </div>
    );
  }

  const scoreBadgeColors = {
    A: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    B: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    C: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    D: 'bg-rose-600/20 text-rose-300 border-rose-500/40'
  };

  const statusBadge = {
    secure: { text: 'Hệ thống An toàn', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    warning: { text: 'Cần lưu ý / Tối ưu hóa', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    critical: { text: 'Cảnh báo nguy cấp', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }
  };

  const currentScore = report?.score || 'B';
  const currentStatus = report?.overallStatus || 'warning';

  return (
    <div className="space-y-6">
      {/* Top Banner & Grade Summary */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-bold text-2xl shadow-inner ${
                scoreBadgeColors[currentScore]
              }`}
            >
              <span>{currentScore}</span>
              <span className="text-[9px] font-mono tracking-widest uppercase">GRADE</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Báo cáo Kiểm toán An ninh Toàn diện
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    statusBadge[currentStatus].bg
                  }`}
                >
                  {statusBadge[currentStatus].text}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                {report?.summary || 'Đã phân tích các bề mặt tấn công chính của portal: Docker socket, thông tin đăng nhập, phiên xác thực JWT, bảo vệ Brute-force và SSRF.'}
              </p>
              {report?.auditTimestamp && (
                <p className="text-[11px] text-[var(--text-muted)] font-mono pt-1">
                  Thời điểm kiểm toán gần nhất: {new Date(report.auditTimestamp).toLocaleString('vi-VN')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-end">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-surface)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Đang quét...' : 'Quét lại hệ thống'}</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-[var(--border-subtle)]">
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[var(--text-muted)] block">Hạng mục Đạt chuẩn</span>
              <span className="text-lg font-bold text-emerald-400">
                {report?.checks.filter((c) => c.status === 'pass').length || 0} / {report?.checks.length || 0}
              </span>
            </div>
            <CheckCircle2 size={24} className="text-emerald-400/60" />
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[var(--text-muted)] block">Khuyến nghị Tối ưu</span>
              <span className="text-lg font-bold text-amber-400">
                {report?.warningsCount || 0}
              </span>
            </div>
            <AlertTriangle size={24} className="text-amber-400/60" />
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[var(--text-muted)] block">Cảnh báo Nguy cấp</span>
              <span className={`text-lg font-bold ${report?.criticalCount ? 'text-rose-400' : 'text-[var(--text-secondary)]'}`}>
                {report?.criticalCount || 0}
              </span>
            </div>
            <ShieldAlert size={24} className={report?.criticalCount ? 'text-rose-400/80 animate-bounce' : 'text-[var(--text-muted)]'} />
          </div>
        </div>
      </div>

      {/* Detailed Security Checklist */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
          Chi tiết các tiêu chí kiểm tra bảo mật
        </h4>

        <div className="grid grid-cols-1 gap-3">
          {report?.checks.map((check) => {
            const isDanger = check.status === 'danger';
            const isWarning = check.status === 'warning';
            const isPass = check.status === 'pass';

            return (
              <div
                key={check.id}
                className={`p-4 rounded-xl border transition-colors ${
                  isDanger
                    ? 'bg-rose-500/5 border-rose-500/30'
                    : isWarning
                    ? 'bg-amber-500/5 border-amber-500/25'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isDanger && <ShieldAlert size={18} className="text-rose-400" />}
                      {isWarning && <AlertTriangle size={18} className="text-amber-400" />}
                      {isPass && <CheckCircle2 size={18} className="text-emerald-400" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {check.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded ${
                            isDanger
                              ? 'bg-rose-500/20 text-rose-300'
                              : isWarning
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {check.title}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {check.description}
                      </p>

                      {check.recommendation && (
                        <div className="mt-2 p-2.5 rounded-lg bg-black/20 border border-white/5 text-xs text-[var(--text-primary)] flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide block">
                              Khuyến nghị khắc phục:
                            </span>
                            <span className="text-[11px] text-[var(--text-secondary)]">
                              {check.recommendation}
                            </span>
                          </div>

                          {check.id === 'chk-password' && isDanger && (
                            <button
                              onClick={onNavigateToSettings}
                              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold transition-colors shadow-xs"
                            >
                              <Sliders size={11} />
                              <span>Đổi mật khẩu ngay</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production & Homelab Hardening Reference Guide */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-[var(--accent)]" />
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            Cẩm nang Bảo vệ & Thắt chặt An ninh (Hardening Best Practices)
          </h4>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Khi triển khai Service Hub trong gia đình (Homelab) hoặc trên máy chủ VPS có kết nối Internet, vui lòng áp dụng các nguyên tắc phòng thủ đa lớp sau:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <Server size={14} className="text-emerald-400" />
              <span>1. Bảo vệ Docker Socket an toàn</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Mount socket ở chế độ chỉ đọc: <code className="text-emerald-400 font-mono">/var/run/docker.sock:/var/run/docker.sock:ro</code>. Nếu không muốn trao quyền socket cho container, bạn có thể triển khai <code className="text-[var(--accent-text)] font-mono">tecnativa/docker-socket-proxy</code> để chỉ mở các API GET read-only.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <Network size={14} className="text-blue-400" />
              <span>2. Đừng mở cổng (Port Forward) trực tiếp</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Tránh NAT cổng 3000 ra Internet trên Router. Hãy sử dụng <strong className="text-[var(--text-primary)]">Cloudflare Tunnel (Zero Trust)</strong> hoặc mạng riêng ảo <strong className="text-[var(--text-primary)]">Tailscale / WireGuard</strong> để truy cập an toàn từ xa mà không lộ IP công cộng.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <ShieldCheck size={14} className="text-amber-400" />
              <span>3. Luôn sử dụng Reverse Proxy &amp; HTTPS</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Đặt portal đằng sau <strong className="text-[var(--text-primary)]">Nginx Proxy Manager, Caddy</strong> hoặc <strong className="text-[var(--text-primary)]">Traefik</strong> để mã hóa SSL/TLS Let&apos;s Encrypt tự động, ngăn chặn kẻ xấu nghe lén token trên đường truyền mạng.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <Lock size={14} className="text-purple-400" />
              <span>4. Khởi tạo biến môi trường bí mật ngẫu nhiên</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Khai báo <code className="text-amber-400 font-mono">ADMIN_PASSWORD</code> và <code className="text-amber-400 font-mono">JWT_SECRET</code> ngẫu nhiên trong file <code className="font-mono">.env</code> độc lập. Không lưu trữ file cấu hình chứa mật khẩu lên kho mã nguồn công khai (public git repository).
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--accent-text)]">
            <Info size={14} className="shrink-0" />
            <span>Xem chi tiết hướng dẫn đầy đủ tại <strong>SECURITY.md</strong> và <strong>docs/SECURITY_HARDENING.md</strong> trong thư mục dự án.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
