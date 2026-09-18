import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Zap,
  Power,
  Server,
  HardDrive,
  Printer,
  Cpu,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Send,
  RotateCcw,
  Clock
} from 'lucide-react';
import { NetworkDevice, TcpPingResult, WolSendResult } from '../types';

interface NetworkToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkToolsModal: React.FC<NetworkToolsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'wol_manual' | 'tcp_manual'>('devices');

  // Device list
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<NetworkDevice> | null>(null);
  const [isDeviceFormOpen, setIsDeviceFormOpen] = useState(false);

  // Manual WoL form state
  const [wolMac, setWolMac] = useState('');
  const [wolBroadcastIp, setWolBroadcastIp] = useState('255.255.255.255');
  const [wolPort, setWolPort] = useState(9);
  const [isSendingWol, setIsSendingWol] = useState(false);
  const [wolResult, setWolResult] = useState<WolSendResult | null>(null);

  // Manual TCP Ping form state
  const [tcpHost, setTcpHost] = useState('');
  const [tcpPort, setTcpPort] = useState(80);
  const [tcpTimeout, setTcpTimeout] = useState(2500);
  const [isPingingTcp, setIsPingingTcp] = useState(false);
  const [tcpResult, setTcpResult] = useState<TcpPingResult | null>(null);

  // Per-device in-progress operations
  const [operatingDeviceId, setOperatingDeviceId] = useState<string | null>(null);
  const [deviceActionMessage, setDeviceActionMessage] = useState<{ id: string; text: string; success: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen]);

  const fetchDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fetch('/api/network/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.error('Failed to fetch network devices:', e);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleSendManualWol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wolMac) return;

    setIsSendingWol(true);
    setWolResult(null);

    try {
      const res = await fetch('/api/network/wol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac: wolMac,
          broadcastIp: wolBroadcastIp,
          port: wolPort
        })
      });
      const data = await res.json();
      if (res.ok) {
        setWolResult({
          mac: wolMac,
          broadcastIp: wolBroadcastIp,
          port: wolPort,
          success: true,
          message: data.message || 'Đã phát sóng gói tin Magic Packet thành công!',
          timestamp: new Date().toLocaleTimeString()
        });
        fetchDevices();
      } else {
        setWolResult({
          mac: wolMac,
          broadcastIp: wolBroadcastIp,
          port: wolPort,
          success: false,
          message: data.error || 'Gửi gói tin thất bại',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err: any) {
      setWolResult({
        mac: wolMac,
        broadcastIp: wolBroadcastIp,
        port: wolPort,
        success: false,
        message: err.message,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsSendingWol(false);
    }
  };

  const handleSendManualTcpPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tcpHost) return;

    setIsPingingTcp(true);
    setTcpResult(null);

    try {
      const res = await fetch('/api/network/tcp-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: tcpHost,
          port: tcpPort,
          timeoutMs: tcpTimeout
        })
      });
      const data = await res.json();
      setTcpResult(data);
    } catch (err: any) {
      setTcpResult({
        host: tcpHost,
        port: tcpPort,
        status: 'closed',
        latencyMs: 0,
        message: `Lỗi kết nối: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsPingingTcp(false);
    }
  };

  const handleDeviceWol = async (device: NetworkDevice) => {
    setOperatingDeviceId(device.id);
    setDeviceActionMessage(null);
    try {
      const res = await fetch(`/api/network/devices/${device.id}/wol`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setDeviceActionMessage({ id: device.id, text: `Magic Packet đã gửi tới ${device.mac}!`, success: true });
        fetchDevices();
      } else {
        setDeviceActionMessage({ id: device.id, text: data.error || 'Thất bại', success: false });
      }
    } catch (err: any) {
      setDeviceActionMessage({ id: device.id, text: err.message, success: false });
    } finally {
      setOperatingDeviceId(null);
      setTimeout(() => setDeviceActionMessage(null), 4000);
    }
  };

  const handleDevicePing = async (device: NetworkDevice) => {
    setOperatingDeviceId(device.id);
    setDeviceActionMessage(null);
    try {
      const res = await fetch(`/api/network/devices/${device.id}/ping`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        const latency = data.result?.latencyMs ?? 0;
        const status = data.result?.status;
        const msg = status === 'open' ? `Cổng mở (${latency}ms)` : `Cổng đóng/timeout`;
        setDeviceActionMessage({ id: device.id, text: msg, success: status === 'open' });
        fetchDevices();
      } else {
        setDeviceActionMessage({ id: device.id, text: data.error || 'Thất bại', success: false });
      }
    } catch (err: any) {
      setDeviceActionMessage({ id: device.id, text: err.message, success: false });
    } finally {
      setOperatingDeviceId(null);
      setTimeout(() => setDeviceActionMessage(null), 4000);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này khỏi danh sách quản lý?')) return;
    try {
      await fetch(`/api/network/devices/${id}`, { method: 'DELETE' });
      fetchDevices();
    } catch (e) {
      console.error('Failed to delete device:', e);
    }
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice?.name || !editingDevice?.ip || !editingDevice?.mac) return;

    try {
      const res = await fetch('/api/network/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDevice)
      });
      if (res.ok) {
        setIsDeviceFormOpen(false);
        setEditingDevice(null);
        fetchDevices();
      }
    } catch (e) {
      console.error('Failed to save device:', e);
    }
  };

  const getDeviceIcon = (category?: string) => {
    switch (category) {
      case 'NAS':
        return <HardDrive size={18} className="text-amber-500" />;
      case 'Server':
        return <Server size={18} className="text-blue-500" />;
      case 'Printer':
        return <Printer size={18} className="text-emerald-500" />;
      case 'Switch':
      case 'Router':
        return <Radio size={18} className="text-purple-500" />;
      default:
        return <Cpu size={18} className="text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Network Tools &amp; Wake-on-LAN (WoL)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Đánh thức thiết bị qua gói tin Magic Packet và kiểm tra cổng mạng TCP / Switch / NAS / Printer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] shrink-0">
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'devices'
                ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Thiết bị mạng đã lưu ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('wol_manual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'wol_manual'
                ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Gửi Magic Packet WoL tự do
          </button>
          <button
            onClick={() => setActiveTab('tcp_manual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'tcp_manual'
                ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Dò cổng TCP / Ping Host
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SAVED DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Danh sách thiết bị mạng nội bộ &amp; Homelab
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Quản lý máy chủ, NAS, Switch, máy in để đánh thức nhanh hoặc kiểm tra độ trễ phản hồi
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingDevice({
                      name: '',
                      ip: '192.168.1.',
                      mac: '',
                      port: 80,
                      category: 'Server',
                      broadcastIp: '192.168.1.255',
                      wolPort: 9
                    });
                    setIsDeviceFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium shadow-xs transition-colors"
                >
                  <Plus size={14} />
                  <span>Thêm thiết bị mới</span>
                </button>
              </div>

              {/* Devices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          {getDeviceIcon(device.category)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[var(--text-primary)] leading-tight">
                            {device.name}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {device.description || device.category || 'Thiết bị mạng'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          title="Xóa thiết bị"
                          className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Network info tags */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                        <span className="text-[10px] text-[var(--text-muted)] block">IP &amp; Port:</span>
                        <span className="text-[var(--text-primary)] truncate block">
                          {device.ip}{device.port ? `:${device.port}` : ''}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                        <span className="text-[10px] text-[var(--text-muted)] block">MAC Address:</span>
                        <span className="text-[var(--text-primary)] truncate block" title={device.mac}>
                          {device.mac}
                        </span>
                      </div>
                    </div>

                    {/* Status & Last Checked */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            device.lastPingStatus === 'open'
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : device.lastPingStatus === 'timeout'
                              ? 'bg-amber-500'
                              : device.lastPingStatus === 'closed'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span className="text-[var(--text-secondary)]">
                          {device.lastPingStatus === 'open'
                            ? `Online (${device.lastPingLatency ?? 0}ms)`
                            : device.lastPingStatus === 'closed'
                            ? 'Port Closed'
                            : device.lastPingStatus === 'timeout'
                            ? 'Timeout'
                            : 'Chưa ping'}
                        </span>
                      </div>

                      {device.lastWolSentAt && (
                        <span className="text-[var(--text-muted)] text-[10px]">
                          WoL: {new Date(device.lastWolSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Per-device action banner */}
                    {deviceActionMessage?.id === device.id && (
                      <div
                        className={`text-xs p-2 rounded-lg flex items-center gap-1.5 ${
                          deviceActionMessage.success
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        }`}
                      >
                        {deviceActionMessage.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                        <span>{deviceActionMessage.text}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-subtle)]">
                      <button
                        onClick={() => handleDeviceWol(device)}
                        disabled={operatingDeviceId === device.id}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent-subtle)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent-text)] text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <Power size={13} />
                        <span>Đánh thức (WoL)</span>
                      </button>

                      <button
                        onClick={() => handleDevicePing(device)}
                        disabled={operatingDeviceId === device.id}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <Radio size={13} className="text-[var(--accent)]" />
                        <span>Ping TCP Port</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add / Edit Device Form Modal */}
              {isDeviceFormOpen && editingDevice && (
                <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Thêm Thiết Bị Mới Vào Danh Sách</h4>
                    <button
                      onClick={() => setIsDeviceFormOpen(false)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Đóng
                    </button>
                  </div>

                  <form onSubmit={handleSaveDevice} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tên thiết bị *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Proxmox Server 02"
                        value={editingDevice.name || ''}
                        onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Loại thiết bị</label>
                      <select
                        value={editingDevice.category || 'Server'}
                        onChange={(e: any) => setEditingDevice({ ...editingDevice, category: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value="Server">Máy chủ (Server / Hypervisor)</option>
                        <option value="NAS">Ổ cứng mạng (NAS / SAN)</option>
                        <option value="Switch">Switch / Router</option>
                        <option value="Printer">Máy in mạng (Printer)</option>
                        <option value="PC">Máy trạm (Desktop PC)</option>
                        <option value="Other">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Địa chỉ IP *</label>
                      <input
                        type="text"
                        required
                        placeholder="192.168.1.50"
                        value={editingDevice.ip || ''}
                        onChange={(e) => setEditingDevice({ ...editingDevice, ip: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Địa chỉ MAC (WoL) *</label>
                      <input
                        type="text"
                        required
                        placeholder="AA:BB:CC:DD:EE:FF"
                        value={editingDevice.mac || ''}
                        onChange={(e) => setEditingDevice({ ...editingDevice, mac: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Cổng TCP Ping (Probe)</label>
                      <input
                        type="number"
                        placeholder="80, 22, 445, 9100..."
                        value={editingDevice.port || ''}
                        onChange={(e) => setEditingDevice({ ...editingDevice, port: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Địa chỉ Broadcast WoL</label>
                      <input
                        type="text"
                        placeholder="192.168.1.255 hoặc 255.255.255.255"
                        value={editingDevice.broadcastIp || '192.168.1.255'}
                        onChange={(e) => setEditingDevice({ ...editingDevice, broadcastIp: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsDeviceFormOpen(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs"
                      >
                        Lưu thiết bị
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL WOL MAGIC PACKET */}
          {activeTab === 'wol_manual' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Power size={16} className="text-[var(--accent)]" />
                  <span>Phát sóng gói tin Wake-on-LAN (Magic Packet)</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Gửi 102-byte Magic Packet chuẩn UDP (gồm 6 byte 0xFF kèm 16 lần lặp MAC address) qua địa chỉ Broadcast nội bộ để đánh thức bo mạch chủ (Motherboard NIC) đang ở trạng thái ngủ S3/S4/S5.
                </p>
              </div>

              <form onSubmit={handleSendManualWol} className="space-y-4 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Địa chỉ MAC Card mạng (Target MAC) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: 00:11:22:33:44:55 hoặc 00-11-22-33-44-55"
                    value={wolMac}
                    onChange={(e) => setWolMac(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                    Có thể lấy MAC bằng lệnh <code className="bg-[var(--bg-canvas)] px-1 rounded">ip link</code> (Linux) hoặc <code className="bg-[var(--bg-canvas)] px-1 rounded">getmac</code> (Windows).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      Broadcast IP (Mạng con)
                    </label>
                    <input
                      type="text"
                      value={wolBroadcastIp}
                      onChange={(e) => setWolBroadcastIp(e.target.value)}
                      placeholder="255.255.255.255 hoặc 192.168.1.255"
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      Cổng UDP (WoL Port)
                    </label>
                    <input
                      type="number"
                      value={wolPort}
                      onChange={(e) => setWolPort(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSendingWol || !wolMac}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Send size={14} className={isSendingWol ? 'animate-pulse' : ''} />
                    <span>{isSendingWol ? 'Đang gửi Magic Packet...' : 'Gửi Magic Packet ngay'}</span>
                  </button>
                </div>
              </form>

              {/* WoL Result Banner */}
              {wolResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    wolResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  {wolResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <XCircle size={18} className="shrink-0 mt-0.5" />}
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">{wolResult.message}</div>
                    <div className="text-[11px] opacity-80 font-mono">
                      Target: {wolResult.mac} | Broadcast: {wolResult.broadcastIp}:{wolResult.port} | Lúc {wolResult.timestamp}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANUAL TCP PORT PING */}
          {activeTab === 'tcp_manual' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Radio size={16} className="text-[var(--accent)]" />
                  <span>Dò cổng TCP &amp; Đo độ trễ kết nối (TCP Ping)</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Thiết lập kết nối TCP 3-way handshake đến địa chỉ IP và cổng dịch vụ (22 SSH, 80 HTTP, 443 HTTPS, 445 SMB, 3389 RDP, 9100 Printer...) để đo chính xác thời gian phản hồi (ms).
                </p>
              </div>

              <form onSubmit={handleSendManualTcpPing} className="space-y-4 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      Địa chỉ IP hoặc Hostname *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="192.168.1.1, router.local, google.com"
                      value={tcpHost}
                      onChange={(e) => setTcpHost(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      Cổng TCP *
                    </label>
                    <input
                      type="number"
                      required
                      value={tcpPort}
                      onChange={(e) => setTcpPort(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Common Port presets */}
                <div>
                  <span className="text-[11px] text-[var(--text-muted)] block mb-1.5">Cổng dịch vụ thông dụng:</span>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {[
                      { name: 'HTTP (80)', port: 80 },
                      { name: 'HTTPS (443)', port: 443 },
                      { name: 'SSH (22)', port: 22 },
                      { name: 'SMB (445)', port: 445 },
                      { name: 'DNS (53)', port: 53 },
                      { name: 'RDP (3389)', port: 3389 },
                      { name: 'Printer (9100)', port: 9100 },
                      { name: 'Postgres (5432)', port: 5432 },
                      { name: 'Proxmox (8006)', port: 8006 }
                    ].map((p) => (
                      <button
                        key={p.port}
                        type="button"
                        onClick={() => setTcpPort(p.port)}
                        className={`px-2 py-0.5 rounded text-[11px] border border-[var(--border-subtle)] transition-colors ${
                          tcpPort === p.port
                            ? 'bg-[var(--accent)] text-white font-semibold'
                            : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPingingTcp || !tcpHost}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Radio size={14} className={isPingingTcp ? 'animate-pulse' : ''} />
                    <span>{isPingingTcp ? 'Đang kiểm tra kết nối...' : 'Thử kết nối TCP ngay'}</span>
                  </button>
                </div>
              </form>

              {/* TCP Ping Result Banner */}
              {tcpResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    tcpResult.status === 'open'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : tcpResult.status === 'timeout'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  {tcpResult.status === 'open' ? (
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  ) : tcpResult.status === 'timeout' ? (
                    <Clock size={18} className="shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={18} className="shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">{tcpResult.message}</div>
                    <div className="text-[11px] opacity-80 font-mono">
                      Host: {tcpResult.host}:{tcpResult.port} | Độ trễ:{' '}
                      <span className="font-bold">{tcpResult.latencyMs}ms</span> | Trạng thái: {tcpResult.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)] shrink-0">
          <span>Hỗ trợ mạng nội bộ LAN / Subnet Broadcast / UDP Port 9 &amp; 7</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
