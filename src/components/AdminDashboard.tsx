import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  Shield,
  Key,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  HardDrive,
  Copy,
  Terminal,
  Activity,
  Zap,
  Check,
  RotateCcw,
  Send
} from 'lucide-react';
import { Service, DockerContainer, DockerStatusResponse, UserSession, WebhookInfo } from '../types';
import { IconRenderer } from './IconRenderer';
import { ServiceModal } from './ServiceModal';
import { DockerGuideModal } from './DockerGuideModal';
import { ServiceDetailModal } from './ServiceDetailModal';
import { NetworkToolsModal } from './NetworkToolsModal';

interface AdminDashboardProps {
  user: UserSession;
  token: string | null;
  onLogout: () => void;
  onServicesUpdated: () => void;
  portalTitle: string;
  portalSubtitle: string;
  onUpdatePortalConfig: (title: string, subtitle: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  token,
  onLogout,
  onServicesUpdated,
  portalTitle,
  portalSubtitle,
  onUpdatePortalConfig
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'docker' | 'settings'>('services');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDockerGuideOpen, setIsDockerGuideOpen] = useState(false);

  // Docker Discovery state
  const [dockerStatus, setDockerStatus] = useState<DockerStatusResponse | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [isLoadingDocker, setIsLoadingDocker] = useState(false);
  const [dockerSearch, setDockerSearch] = useState('');
  const [dockerFilter, setDockerFilter] = useState<'all' | 'unimported' | 'running'>('all');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Portal config edit state
  const [editTitle, setEditTitle] = useState(portalTitle);
  const [editSubtitle, setEditSubtitle] = useState(portalSubtitle);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Status message
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deep detail telemetry modal
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<Service | null>(null);

  // Network Tools modal state (WoL & TCP Ping)
  const [isNetworkToolsOpen, setIsNetworkToolsOpen] = useState(false);

  // Webhook management state
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isTriggeringWebhook, setIsTriggeringWebhook] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Fetch all services for admin
  const fetchServices = async () => {
    setIsLoadingServices(true);
    try {
      const res = await fetch('/api/admin/services', {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('Failed to load admin services:', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Fetch Docker containers & status
  const fetchDockerData = async () => {
    setIsLoadingDocker(true);
    try {
      const [statusRes, containersRes] = await Promise.all([
        fetch('/api/docker/status'),
        fetch('/api/docker/containers')
      ]);

      const statusData = await statusRes.json();
      const containersData = await containersRes.json();

      setDockerStatus(statusData);
      setContainers(containersData.containers || []);
    } catch (err) {
      console.error('Failed to fetch Docker containers:', err);
    } finally {
      setIsLoadingDocker(false);
    }
  };

  // Fetch CI/CD Webhook configuration
  const fetchWebhookInfo = async () => {
    try {
      const res = await fetch('/api/admin/webhook-info', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setWebhookInfo(data);
      }
    } catch (e) {
      console.error('Failed to load webhook info:', e);
    }
  };

  const handleRegenerateWebhookToken = async () => {
    if (!confirm('Tạo lại Token mới sẽ vô hiệu hóa Webhook URL cũ trong các quy trình CI/CD. Bạn có chắc chắn không?')) return;
    try {
      const res = await fetch('/api/admin/webhook-token/regenerate', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setWebhookInfo(data);
        showBanner('success', 'Đã làm mới Webhook Token thành công!');
      }
    } catch {
      showBanner('error', 'Không thể tạo lại webhook token');
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookInfo?.webhookUrl) return;
    setIsTriggeringWebhook(true);
    setWebhookTestStatus(null);
    try {
      const res = await fetch(webhookInfo.webhookUrl, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setWebhookTestStatus(`Kích hoạt thành công! Đã quét và cập nhật ${data.scannedContainers || 0} container.`);
        fetchServices();
        fetchWebhookInfo();
      } else {
        setWebhookTestStatus(`Lỗi: ${data.error || 'Thất bại'}`);
      }
    } catch (err: any) {
      setWebhookTestStatus(`Lỗi kết nối: ${err.message}`);
    } finally {
      setIsTriggeringWebhook(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchDockerData();
    fetchWebhookInfo();
  }, []);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 3500);
  };

  // Toggle service visibility
  const handleToggleVisibility = async (service: Service) => {
    const newVisibility = !service.is_visible;
    // Optimistic UI update
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_visible: newVisibility } : s))
    );

    try {
      const res = await fetch(`/api/admin/services/${service.id}/visibility`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_visible: newVisibility })
      });

      if (!res.ok) {
        throw new Error('Failed to update visibility');
      }
      onServicesUpdated();
    } catch (err: any) {
      showBanner('error', err.message);
      fetchServices();
    }
  };

  // Delete service
  const handleDeleteService = async (service: Service) => {
    if (!window.confirm(`Are you sure you want to remove "${service.title || service.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Failed to delete service');

      showBanner('success', `Service "${service.title}" removed`);
      fetchServices();
      onServicesUpdated();
    } catch (err: any) {
      showBanner('error', err.message);
    }
  };

  // Save (Create or Update)
  const handleSaveService = async (serviceData: Partial<Service>) => {
    const isEdit = !!serviceData.id;
    const url = isEdit ? `/api/admin/services/${serviceData.id}` : '/api/admin/services';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(serviceData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save service');
    }

    showBanner('success', isEdit ? 'Service updated successfully' : 'Service added to portal');
    fetchServices();
    fetchDockerData();
    onServicesUpdated();
  };

  // Move Order (Up or Down)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const newServices = [...services];
    const temp = newServices[index];
    newServices[index] = newServices[targetIndex];
    newServices[targetIndex] = temp;

    // Recalculate display_order
    const orderedIds = newServices.map((s) => s.id);
    setServices(newServices);

    try {
      const res = await fetch('/api/admin/services/reorder', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ orderedIds })
      });
      if (!res.ok) throw new Error('Failed to save order');
      onServicesUpdated();
    } catch (err: any) {
      showBanner('error', err.message);
      fetchServices();
    }
  };

  // Import container into portal
  const handleImportContainer = (container: DockerContainer) => {
    const suggested = container.suggestedService || {};
    setEditingService({
      id: '',
      name: container.names[0].replace(/^\//, ''),
      title: suggested.title || container.names[0],
      description: suggested.description || `Docker service running ${container.image}`,
      icon: suggested.icon || 'Boxes',
      url: suggested.url || 'http://localhost:80',
      port: suggested.port || 80,
      category: suggested.category || 'DevOps',
      source: 'docker',
      container_id: container.id,
      is_visible: true,
      display_order: services.length + 1,
      health_check_url: suggested.health_check_url || suggested.url || ''
    });
    setIsServiceModalOpen(true);
  };

  // Export JSON backup
  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/admin/export', {
        headers: getAuthHeaders()
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showBanner('success', 'Backup JSON exported');
    } catch (err: any) {
      showBanner('error', 'Export failed: ' + err.message);
    }
  };

  // Import JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const servicesArray = Array.isArray(json) ? json : json.services;
        if (!Array.isArray(servicesArray)) {
          throw new Error('Invalid JSON format: missing services array');
        }

        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ services: servicesArray, mode: 'merge' })
        });

        if (!res.ok) throw new Error('Import request failed');

        showBanner('success', `Imported ${servicesArray.length} services`);
        fetchServices();
        onServicesUpdated();
      } catch (err: any) {
        showBanner('error', 'Import error: ' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // Change admin password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: 'error', text: data.error || 'Password update failed' });
        return;
      }

      setPasswordMsg({ type: 'success', text: 'Password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Update portal title/subtitle
  const handleSavePortalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdatePortalConfig(editTitle, editSubtitle);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 2500);
      showBanner('success', 'Portal branding saved');
    } catch (err: any) {
      showBanner('error', err.message);
    }
  };

  // Filter services in admin
  const filteredServices = services.filter((s) => {
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.url || '').toLowerCase().includes(q) ||
      s.port.toString().includes(q)
    );
  });

  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  // Filter docker containers
  const filteredContainers = containers.filter((c) => {
    if (dockerFilter === 'unimported' && c.isImported) return false;
    if (dockerFilter === 'running' && !(c.state === 'running' || (c.status && c.status.toLowerCase().includes('up')))) return false;
    if (!dockerSearch.trim()) return true;
    const q = dockerSearch.toLowerCase();
    return (
      c.image.toLowerCase().includes(q) ||
      c.names.some((n) => n.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Banner message */}
      {bannerMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{bannerMessage.text}</span>
          </div>
        </div>
      )}

      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-xs uppercase tracking-wider font-mono text-[var(--accent-text)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded border border-[var(--accent)]/20">
              Admin Control Panel
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Signed in as <strong>{user.username}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Service Management &amp; Discovery
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1">
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'services'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Boxes size={14} />
            <span>Services ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('docker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'docker'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <HardDrive size={14} />
            <span>Docker Discovery</span>
            {containers.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/20 text-white">
                {containers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders size={14} />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setIsNetworkToolsOpen(true)}
            title="Mở bảng công cụ Wake-on-LAN & Kiểm tra cổng mạng TCP"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[var(--accent-text)] bg-[var(--accent-subtle)] hover:bg-[var(--accent)] hover:text-white transition-colors"
          >
            <Zap size={14} />
            <span>WoL &amp; Network</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SERVICES MANAGER */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                <input
                  type="text"
                  placeholder="Filter admin services..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingService(null);
                  setIsServiceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Add Service</span>
              </button>

              <button
                onClick={handleExportBackup}
                title="Export JSON backup"
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
              >
                <Download size={14} />
              </button>

              <label
                title="Import JSON backup"
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
              >
                <Upload size={14} />
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>

              <button
                onClick={fetchServices}
                disabled={isLoadingServices}
                title="Refresh table"
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
              >
                <RefreshCw size={14} className={isLoadingServices ? 'animate-spin text-[var(--accent)]' : ''} />
              </button>
            </div>
          </div>

          {/* Services Table */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">Order</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Endpoint URL</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Source</th>
                    <th className="py-3 px-4 text-center">Visibility</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                  {filteredServices.length > 0 ? (
                    filteredServices.map((service, idx) => (
                      <tr
                        key={service.id}
                        className="hover:bg-[var(--bg-card-hover)] transition-colors group"
                      >
                        {/* Order & Move buttons */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveOrder(idx, 'up')}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <span className="font-mono text-[11px] text-[var(--text-muted)] w-4 text-center">
                              {service.display_order}
                            </span>
                            <button
                              disabled={idx === filteredServices.length - 1}
                              onClick={() => handleMoveOrder(idx, 'down')}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </td>

                        {/* Service Icon & Title */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                              <IconRenderer name={service.icon} size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                                {service.title || service.name}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">
                                {service.description}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Endpoint URL */}
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[var(--accent)] hover:underline inline-flex items-center gap-1 max-w-[200px] truncate"
                          >
                            <span>{service.url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink size={10} className="shrink-0 text-[var(--text-muted)]" />
                          </a>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {service.category}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              service.source === 'docker'
                                ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent)]/30'
                                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                            }`}
                          >
                            {service.source}
                          </span>
                        </td>

                        {/* Visibility Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleVisibility(service)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                              service.is_visible
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-stone-500/15 text-stone-400 border border-stone-500/30'
                            }`}
                          >
                            {service.is_visible ? (
                              <>
                                <Eye size={12} />
                                <span>Visible</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={12} />
                                <span>Hidden</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedServiceForDetail(service)}
                              title="Xem giám sát CPU/RAM & Telemetry (Flashcard Details)"
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                            >
                              <Activity size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingService(service);
                                setIsServiceModalOpen(true);
                              }}
                              title="Edit service metadata"
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service)}
                              title="Delete service"
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                        No services match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCKER AUTO-DISCOVERY */}
      {activeTab === 'docker' && (
        <div className="space-y-5">
          {/* Socket Status Banner */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                dockerStatus?.socketAvailable
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                <HardDrive size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    {dockerStatus?.socketAvailable ? 'Docker Engine Socket Connected' : 'Simulated Container Mode'}
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    dockerStatus?.socketAvailable
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {dockerStatus?.socketAvailable ? 'LIVE SOCKET' : 'SIMULATION'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Path: <code className="font-mono text-[var(--accent-text)]">{dockerStatus?.socketPath || '/var/run/docker.sock'}</code>
                  {' • '}
                  <span>{dockerStatus?.serverVersion}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDockerGuideOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors"
              >
                <HelpCircle size={14} className="text-[var(--accent)]" />
                <span>Docker Mount Guide</span>
              </button>

              <button
                onClick={fetchDockerData}
                disabled={isLoadingDocker}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={isLoadingDocker ? 'animate-spin' : ''} />
                <span>Scan Containers</span>
              </button>
            </div>
          </div>

          {/* Docker Search & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
              <input
                type="text"
                placeholder="Filter discovered containers by name or image..."
                value={dockerSearch}
                onChange={(e) => setDockerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter tabs */}
              <div className="flex items-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 text-xs">
                <button
                  onClick={() => setDockerFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    dockerFilter === 'all'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  All ({containers.length})
                </button>
                <button
                  onClick={() => setDockerFilter('unimported')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    dockerFilter === 'unimported'
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-medium shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Unimported ({containers.filter((c) => !c.isImported).length})
                </button>
                <button
                  onClick={() => setDockerFilter('running')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    dockerFilter === 'running'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Running
                </button>
              </div>

              <div className="text-xs text-[var(--text-muted)] font-mono hidden md:block">
                Showing {filteredContainers.length}
              </div>
            </div>
          </div>

          {/* Container Cards / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContainers.map((container) => {
              const cleanName = container.names[0].replace(/^\//, '');
              const firstPort = container.ports[0];
              const isAlreadyImported = container.isImported;

              return (
                <div
                  key={container.id}
                  className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                        <IconRenderer name={container.suggestedService?.icon || 'Boxes'} size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                            {cleanName}
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                            {container.shortId}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[var(--text-secondary)] truncate">
                          {container.image}
                        </p>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-mono shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[var(--text-secondary)]">{container.status}</span>
                    </div>
                  </div>

                  {/* Ports & Labels */}
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {container.ports.length > 0 ? (
                        container.ports.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                          >
                            {p.publicPort ? `:${p.publicPort} → ` : ''}:{p.privatePort}/{p.type}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">Host network / No port exposed</span>
                      )}
                    </div>

                    {/* One-click Import button */}
                    <button
                      onClick={() => handleImportContainer(container)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${
                        isAlreadyImported
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs'
                      }`}
                    >
                      {isAlreadyImported ? (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>Imported</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Import to Portal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS & SECURITY */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Security / Change Password */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Key size={18} className="text-[var(--accent)]" />
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                Admin Password Management
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Update password with secure bcrypt hashing (cost factor 10) to guard administrative access.
            </p>

            {passwordMsg && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {passwordMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  New Password (min 4 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
              >
                {isChangingPassword ? 'Encrypting & Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Portal Branding Config */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Sliders size={18} className="text-[var(--accent)]" />
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                Portal Branding &amp; Metadata
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Customize the public portal title, descriptive subtitle, and header branding.
            </p>

            <form onSubmit={handleSavePortalConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Portal Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Portal Subtitle / Description
                </label>
                <textarea
                  rows={2}
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                {configSuccess && <CheckCircle2 size={14} />}
                <span>{configSuccess ? 'Saved!' : 'Save Portal Branding'}</span>
              </button>
            </form>
          </div>

          {/* CI/CD & GitOps Webhooks Integration Card */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    CI/CD &amp; GitOps Webhook Trigger
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Kích hoạt tự động quét container hoặc reload danh mục dịch vụ từ GitHub Actions, Portainer, hoặc Watchtower.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestWebhook}
                  disabled={isTriggeringWebhook || !webhookInfo}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  <Send size={12} className={isTriggeringWebhook ? 'animate-pulse' : ''} />
                  <span>{isTriggeringWebhook ? 'Đang test...' : 'Test Webhook Trigger'}</span>
                </button>
                <button
                  onClick={handleRegenerateWebhookToken}
                  title="Tạo lại token bảo mật mới"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Reset Token</span>
                </button>
              </div>
            </div>

            {webhookTestStatus && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>{webhookTestStatus}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Webhook Endpoint URL (Bao gồm Token)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookInfo?.webhookUrl || 'Đang tải Webhook URL...'}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (webhookInfo?.webhookUrl) {
                        navigator.clipboard.writeText(webhookInfo.webhookUrl);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {copiedWebhook ? <Check size={14} className="text-[var(--accent)]" /> : <Copy size={14} />}
                    <span>{copiedWebhook ? 'Đã sao chép' : 'Sao chép URL'}</span>
                  </button>
                </div>
              </div>

              {/* Ready-to-use curl snippet */}
              <div>
                <span className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Mẫu lệnh gọi cURL (GitHub Actions / CI/CD)
                </span>
                <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                  <code>curl -X POST "{webhookInfo?.webhookUrl || 'http://localhost:3000/api/webhooks/refresh?token=YOUR_TOKEN'}"</code>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[var(--text-muted)]">
                <div>
                  Lần kích hoạt gần nhất:{' '}
                  <span className="font-mono text-[var(--text-secondary)]">
                    {webhookInfo?.lastTriggered
                      ? new Date(webhookInfo.lastTriggered).toLocaleString()
                      : 'Chưa có lượt kích hoạt nào'}
                  </span>
                </div>
                <div>Phương thức: POST | Trạng thái: Sẵn sàng nhận tín hiệu CI/CD</div>
              </div>
            </div>
          </div>

          {/* Storage & Backup Details */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-[var(--accent)]" />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  Data Persistence &amp; Backups
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportBackup}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors"
                >
                  <Download size={13} />
                  <span>Download Backup JSON</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block mb-0.5">Database File</span>
                <span className="font-mono text-[var(--text-primary)]">./data/services.json</span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block mb-0.5">Settings File</span>
                <span className="font-mono text-[var(--text-primary)]">./data/settings.json</span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block mb-0.5">Docker Socket</span>
                <span className="font-mono text-[var(--text-primary)]">{dockerStatus?.socketPath || '/var/run/docker.sock'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Create/Edit Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSave={handleSaveService}
        initialData={editingService}
      />

      {/* Docker Guide Modal */}
      <DockerGuideModal
        isOpen={isDockerGuideOpen}
        onClose={() => setIsDockerGuideOpen(false)}
        socketPath={dockerStatus?.socketPath}
        socketAvailable={dockerStatus?.socketAvailable}
      />

      {/* Service Detail & Live Telemetry Modal */}
      <ServiceDetailModal
        service={selectedServiceForDetail}
        isOpen={!!selectedServiceForDetail}
        onClose={() => setSelectedServiceForDetail(null)}
        onRestartSuccess={() => {
          fetchServices();
          fetchDockerData();
        }}
      />

      {/* Network Tools: Wake-on-LAN & TCP Ping Modal */}
      <NetworkToolsModal
        isOpen={isNetworkToolsOpen}
        onClose={() => setIsNetworkToolsOpen(false)}
      />
    </div>
  );
};
