import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Shield, Boxes, HelpCircle, ExternalLink } from 'lucide-react';

interface DockerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  socketPath?: string;
  socketAvailable?: boolean;
}

export const DockerGuideModal: React.FC<DockerGuideModalProps> = ({
  isOpen,
  onClose,
  socketPath = '/var/run/docker.sock',
  socketAvailable = false
}) => {
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const dockerComposeSnippet = `version: '3.8'

services:
  service-portal:
    # Build trực tiếp từ source repository hiện tại:
    build: .
    # Hoặc chỉ định prebuilt image:
    # image: your-registry/watchit-portal:latest
    container_name: service-hub-portal
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ADMIN_PASSWORD=admin
      - JWT_SECRET=service-hub-jwt-secret-key-32chars
      - DOCKER_SOCKET_PATH=/var/run/docker.sock
    volumes:
      # Data persistence for services & configurations
      - ./data:/app/data
      # Mount host Docker socket:
      # - :ro (Read-only) an toàn cho giám sát và khám phá container
      # - :rw nếu cần quyền restart container từ web UI
      - /var/run/docker.sock:/var/run/docker.sock:ro
`;

  const dockerRunSnippet = `# 1. Build image cục bộ:
docker build -t watchit-portal .

# 2. Chạy container:
docker run -d \\
  --name service-hub-portal \\
  -p 3000:3000 \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  -v $(pwd)/data:/app/data \\
  -e ADMIN_PASSWORD=admin \\
  -e JWT_SECRET=service-hub-jwt-secret-key-32chars \\
  watchit-portal:latest`;

  const handleCopy = (text: string, type: 'compose' | 'cmd') => {
    navigator.clipboard.writeText(text);
    if (type === 'compose') {
      setCopiedCompose(true);
      setTimeout(() => setCopiedCompose(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)]">
              <Boxes size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Docker Socket Deployment &amp; Discovery Guide
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                How to mount <code className="font-mono text-[var(--accent-text)]">/var/run/docker.sock</code> to discover local containers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Socket Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            socketAvailable
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          }`}>
            <Shield size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-sm">
                {socketAvailable ? 'Docker Socket Connected' : 'Simulated Container Mode Active'}
              </div>
              <p className="leading-relaxed opacity-90">
                {socketAvailable
                  ? `Host Docker socket found at ${socketPath}. Live containers are queried directly from the Docker Engine API.`
                  : `Docker socket is not mounted at ${socketPath} (standard in isolated sandbox containers). The portal seamlessly displays realistic container simulations so you can test discovery and import workflows immediately.`}
              </p>
            </div>
          </div>

          {/* docker-compose.yml Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={14} className="text-[var(--accent)]" />
                <span>docker-compose.yml Configuration</span>
              </label>
              <button
                onClick={() => handleCopy(dockerComposeSnippet, 'compose')}
                className="flex items-center gap-1 text-xs text-[var(--accent-text)] hover:underline"
              >
                {copiedCompose ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedCompose ? 'Copied' : 'Copy Compose'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto leading-relaxed">
              {dockerComposeSnippet}
            </pre>
          </div>

          {/* Docker Run Command */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={14} className="text-[var(--accent)]" />
                <span>Docker CLI Run Command</span>
              </label>
              <button
                onClick={() => handleCopy(dockerRunSnippet, 'cmd')}
                className="flex items-center gap-1 text-xs text-[var(--accent-text)] hover:underline"
              >
                {copiedCmd ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedCmd ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto">
              {dockerRunSnippet}
            </pre>
          </div>

          {/* Key Architecture Notes */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] space-y-2 text-xs">
            <div className="font-semibold text-[var(--text-primary)]">Security Best Practice:</div>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
              <li>Always mount <code className="font-mono text-[var(--accent-text)]">/var/run/docker.sock:ro</code> with the <strong className="text-[var(--text-primary)]">:ro</strong> (read-only) flag to prevent the portal from manipulating containers.</li>
              <li>Change the default <code className="font-mono">ADMIN_PASSWORD</code> and <code className="font-mono">JWT_SECRET</code> in production.</li>
              <li>Data is saved in <code className="font-mono">./data/services.json</code> and survives container restarts.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
