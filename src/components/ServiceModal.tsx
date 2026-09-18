import React, { useState, useEffect } from 'react';
import { X, Globe, Activity, Check, AlertCircle, Sparkles, Sliders } from 'lucide-react';
import { Service } from '../types';
import { IconRenderer } from './IconRenderer';
import { IconPickerModal } from './IconPickerModal';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: Partial<Service>) => Promise<void>;
  initialData?: Service | null;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [protocol, setProtocol] = useState<'http' | 'https'>('http');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState<number>(8080);
  const [path, setPath] = useState('');
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('DevOps');
  const [icon, setIcon] = useState('Boxes');
  const [isVisible, setIsVisible] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [healthCheckUrl, setHealthCheckUrl] = useState('');
  const [source, setSource] = useState<'docker' | 'manual'>('manual');
  const [containerId, setContainerId] = useState('');

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [healthTestResult, setHealthTestResult] = useState<{
    status: 'online' | 'offline';
    latencyMs?: number;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Compute live URL
  const computedUrl = `${protocol}://${host}${port ? `:${port}` : ''}${path.startsWith('/') ? path : path ? `/${path}` : ''}`;

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setCategory(initialData.category || 'DevOps');
      setIcon(initialData.icon || 'Boxes');
      setIsVisible(initialData.is_visible !== false);
      setDisplayOrder(initialData.display_order || 1);
      setHealthCheckUrl(initialData.health_check_url || '');
      setSource(initialData.source || 'manual');
      setContainerId(initialData.container_id || '');

      // Parse URL
      try {
        const u = new URL(initialData.url);
        setProtocol(u.protocol.replace(':', '') as any);
        setHost(u.hostname);
        setPort(u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80));
        setPath(u.pathname === '/' ? '' : u.pathname);
      } catch {
        setHost(initialData.url);
      }
    } else {
      // Reset defaults
      setProtocol('http');
      setHost('localhost');
      setPort(8080);
      setPath('');
      setTitle('');
      setName('');
      setDescription('');
      setCategory('DevOps');
      setIcon('Boxes');
      setIsVisible(true);
      setDisplayOrder(1);
      setHealthCheckUrl('');
      setSource('manual');
      setContainerId('');
    }
    setHealthTestResult(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleTestHealth = async () => {
    setIsTestingHealth(true);
    setHealthTestResult(null);

    const targetUrl = healthCheckUrl.trim() || computedUrl;
    try {
      const res = await fetch('/api/health/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      setHealthTestResult({
        status: data.status,
        latencyMs: data.latencyMs,
        error: data.error
      });
    } catch (err: any) {
      setHealthTestResult({
        status: 'offline',
        error: err.message
      });
    } finally {
      setIsTestingHealth(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload: Partial<Service> = {
      title: title.trim(),
      name: name.trim() || title.trim(),
      description: description.trim(),
      url: computedUrl,
      port: Number(port) || 80,
      category: category.trim() || 'General',
      icon: icon.trim() || 'Globe',
      is_visible: isVisible,
      display_order: Number(displayOrder) || 1,
      health_check_url: healthCheckUrl.trim() || computedUrl,
      source,
      container_id: containerId.trim()
    };

    if (initialData?.id) {
      payload.id = initialData.id;
    }

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save service:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const categoryPresets = [
    'Automation',
    'DevOps',
    'Monitoring',
    'Databases',
    'Security',
    'Storage',
    'Networking',
    'AI / ML',
    'Media',
    'General'
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="w-full max-w-2xl rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl overflow-hidden my-8">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {initialData ? 'Edit Service Flashcard' : 'Add New Service'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Configure endpoint routing, metadata, category tags, and health parameters.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Row 1: Title & Internal Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. N8N Automation"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Category Tag *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Automation"
                    className="flex-1 px-3.5 py-2 text-sm rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <select
                    onChange={(e) => {
                      if (e.target.value) setCategory(e.target.value);
                    }}
                    value=""
                    className="px-2 py-2 text-xs rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] cursor-pointer"
                  >
                    <option value="" disabled>Presets</option>
                    {categoryPresets.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Row 2: URL Builder (Protocol, Host, Port, Path) */}
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={13} className="text-[var(--accent)]" />
                  <span>Target Endpoint Configuration</span>
                </label>
                <span className="text-[11px] font-mono text-[var(--text-muted)] truncate max-w-[260px]">
                  {computedUrl}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3 sm:col-span-2">
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono"
                  >
                    <option value="http">http://</option>
                    <option value="https">https://</option>
                  </select>
                </div>

                <div className="col-span-9 sm:col-span-5">
                  <input
                    type="text"
                    required
                    placeholder="localhost or 192.168.1.10"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    placeholder="Port"
                    value={port || ''}
                    onChange={(e) => setPort(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
                  />
                </div>

                <div className="col-span-8 sm:col-span-3">
                  <input
                    type="text"
                    placeholder="/path (optional)"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of service purpose or internal tools provided..."
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            {/* Row 4: Icon & Display Order & Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Icon Selector trigger */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Service Icon
                </label>
                <button
                  type="button"
                  onClick={() => setIsIconPickerOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-sm text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[var(--bg-elevated)] text-[var(--accent)]">
                      <IconRenderer name={icon} size={16} />
                    </div>
                    <span className="text-xs truncate">{icon}</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">Change</span>
                </button>
              </div>

              {/* Display Order */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono"
                />
              </div>

              {/* Visibility Switch */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Public Visibility
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsVisible(!isVisible)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isVisible ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isVisible ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 5: Health Check URL & Live Ping */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Health Check URL (Optional override)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Defaults to service URL or custom /healthz endpoint"
                  value={healthCheckUrl}
                  onChange={(e) => setHealthCheckUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestHealth}
                  disabled={isTestingHealth}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-primary)] flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                >
                  <Activity size={14} className={isTestingHealth ? 'animate-pulse text-[var(--accent)]' : ''} />
                  <span>{isTestingHealth ? 'Testing...' : 'Test Health'}</span>
                </button>
              </div>

              {/* Health Test Result Banner */}
              {healthTestResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    healthTestResult.status === 'online'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${healthTestResult.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="font-semibold capitalize">{healthTestResult.status}</span>
                    {healthTestResult.error && (
                      <span className="text-[11px] text-red-300">({healthTestResult.error})</span>
                    )}
                  </div>
                  {healthTestResult.latencyMs !== undefined && (
                    <span className="font-mono text-[11px]">{healthTestResult.latencyMs}ms response</span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving...' : initialData ? 'Update Service' : 'Create Service'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Icon Picker Modal */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        selectedIcon={icon}
        onSelectIcon={(newIcon) => setIcon(newIcon)}
      />
    </>
  );
};
