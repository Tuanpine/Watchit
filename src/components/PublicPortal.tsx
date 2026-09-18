import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  X,
  Radio,
  ArrowUpDown,
  Filter,
  Star,
  Globe,
  Clock,
  Layers,
  Zap
} from 'lucide-react';
import { Service, ServiceHealth } from '../types';
import { ServiceCard } from './ServiceCard';
import { ServiceDetailModal } from './ServiceDetailModal';
import { MiniDashboardWidget } from './MiniDashboardWidget';
import { NetworkToolsModal } from './NetworkToolsModal';

interface PublicPortalProps {
  services: Service[];
  healthMap: Record<string, ServiceHealth>;
  onCheckHealth: (service: Service) => void;
  onRefreshAllHealth: () => void;
  isCheckingHealth: boolean;
  portalTitle?: string;
  portalSubtitle?: string;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  services,
  healthMap,
  onCheckHealth,
  onRefreshAllHealth,
  isCheckingHealth,
  portalTitle = 'Service Hub & Project Portal',
  portalSubtitle = 'Aggregated local Docker services, microtools, and self-hosted project endpoints'
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'pinned'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'az' | 'za' | 'category' | 'recent'>('order');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(0); // 0 = Off
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isNetworkToolsOpen, setIsNetworkToolsOpen] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState<boolean>(() => {
    return localStorage.getItem('portal_group_by_category') === 'true';
  });

  const toggleGroupByCategory = () => {
    setGroupByCategory((prev) => {
      const next = !prev;
      localStorage.setItem('portal_group_by_category', String(next));
      return next;
    });
  };

  // Dynamic host mode (replaces localhost with current window.location.hostname for LAN/remote users)
  const [useDynamicHost, setUseDynamicHost] = useState<boolean>(() => {
    return localStorage.getItem('portal_dynamic_host') === 'true';
  });

  // Local storage for pinned/favorite service IDs
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('portal_pinned_services');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync pinned to localStorage
  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('portal_pinned_services', JSON.stringify(next));
      return next;
    });
  };

  const handleToggleDynamicHost = () => {
    setUseDynamicHost((prev) => {
      const next = !prev;
      localStorage.setItem('portal_dynamic_host', String(next));
      return next;
    });
  };

  // Keyboard shortcut listener: '/' or 'Ctrl+K' / 'Cmd+K' to search, 'Esc' to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearch('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-refresh interval timer
  useEffect(() => {
    if (autoRefreshSecs <= 0) return;
    const interval = setInterval(() => {
      if (!isCheckingHealth) {
        onRefreshAllHealth();
      }
    }, autoRefreshSecs * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSecs, isCheckingHealth, onRefreshAllHealth]);

  // Derive categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [services]);

  // Filter & Sort
  const filteredServices = useMemo(() => {
    return services
      .filter((service) => {
        // Category filter
        if (selectedCategory !== 'All' && service.category !== selectedCategory) {
          return false;
        }

        // Pinned status filter
        if (statusFilter === 'pinned' && !pinnedIds.includes(service.id)) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all' && statusFilter !== 'pinned') {
          const sHealth = healthMap[service.id];
          const isOnline = sHealth ? sHealth.status === 'online' : true;
          if (statusFilter === 'online' && !isOnline) return false;
          if (statusFilter === 'offline' && isOnline) return false;
        }

        // Search query
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const matchesTitle = (service.title || '').toLowerCase().includes(q);
        const matchesName = (service.name || '').toLowerCase().includes(q);
        const matchesDesc = (service.description || '').toLowerCase().includes(q);
        const matchesCat = (service.category || '').toLowerCase().includes(q);
        const matchesUrl = (service.url || '').toLowerCase().includes(q);
        const matchesPort = service.port ? service.port.toString().includes(q) : false;

        return matchesTitle || matchesName || matchesDesc || matchesCat || matchesUrl || matchesPort;
      })
      .sort((a, b) => {
        // Pinned always bubble to top when in default order
        if (sortBy === 'order') {
          const isAPinned = pinnedIds.includes(a.id);
          const isBPinned = pinnedIds.includes(b.id);
          if (isAPinned && !isBPinned) return -1;
          if (!isAPinned && isBPinned) return 1;
          return (a.display_order ?? 999) - (b.display_order ?? 999);
        }

        if (sortBy === 'az') return (a.title || a.name).localeCompare(b.title || b.name);
        if (sortBy === 'za') return (b.title || b.name).localeCompare(a.title || a.name);
        if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
        if (sortBy === 'recent') {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        }
        return (a.display_order ?? 999) - (b.display_order ?? 999);
      });
  }, [services, selectedCategory, statusFilter, search, sortBy, healthMap, pinnedIds]);

  const onlineCount = useMemo(() => {
    return services.filter((s) => {
      const h = healthMap[s.id];
      return h ? h.status === 'online' : true;
    }).length;
  }, [services, healthMap]);

  const isAccessingViaRemote = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header / Intro Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-xs uppercase tracking-wider font-mono text-[var(--accent-text)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded border border-[var(--accent)]/20">
              Self-Hosted Gateway
            </span>
            {isAccessingViaRemote && (
              <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border-subtle)] hidden sm:inline-block">
                Host: {window.location.hostname}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {portalTitle}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            {portalSubtitle}
          </p>
        </div>

        {/* Quick Stats & Controls Pill */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dynamic Hostname Switcher */}
          <button
            onClick={handleToggleDynamicHost}
            title={
              useDynamicHost
                ? `Dynamic LAN Host active: Replaces localhost with ${window.location.hostname}`
                : 'Click to enable Dynamic LAN Host mode (opens services using your current browser hostname)'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              useDynamicHost
                ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent-text)] font-medium'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Globe size={13} />
            <span className="hidden xs:inline">Dynamic LAN Host:</span>
            <span className="font-mono font-semibold">{useDynamicHost ? 'ON' : 'OFF'}</span>
          </button>

          {/* Operational Count */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
            <Radio size={14} className="text-[var(--status-online)]" />
            <span className="text-[var(--text-secondary)]">Health:</span>
            <span className="font-mono font-semibold text-[var(--text-primary)]">{onlineCount}</span>
            <span className="text-[var(--text-muted)]">/ {services.length}</span>
          </div>

          {/* Auto Refresh Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <Clock size={13} className="text-[var(--text-muted)]" />
            <select
              value={autoRefreshSecs}
              onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
              title="Automatic background health check interval"
              className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1"
            >
              <option value={0} className="bg-[var(--bg-card)]">Auto: Off</option>
              <option value={30} className="bg-[var(--bg-card)]">Auto: 30s</option>
              <option value={60} className="bg-[var(--bg-card)]">Auto: 1m</option>
              <option value={300} className="bg-[var(--bg-card)]">Auto: 5m</option>
            </select>
          </div>

          {/* Quick Network Tools (WoL & TCP Ping) */}
          <button
            onClick={() => setIsNetworkToolsOpen(true)}
            title="Mở bảng công cụ Wake-on-LAN & Kiểm tra cổng TCP"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-subtle)] hover:bg-[var(--accent)] hover:text-white text-xs font-semibold text-[var(--accent-text)] border border-[var(--accent)]/30 shadow-2xs transition-colors"
          >
            <Zap size={13} />
            <span className="hidden sm:inline">WoL &amp; TCP Tools</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={onRefreshAllHealth}
            disabled={isCheckingHealth}
            title="Refresh all service health status"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs text-[var(--text-primary)] transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={isCheckingHealth ? 'animate-spin text-[var(--accent)]' : ''} />
            <span className="hidden sm:inline">Check Now</span>
          </button>
        </div>
      </div>

      {/* Mini-Dashboard Widget: Weather, Clock, & 30-Day Reliability Bar */}
      <MiniDashboardWidget
        services={services}
        healthMap={healthMap}
        onOpenNetworkTools={() => setIsNetworkToolsOpen(true)}
      />

      {/* Filter, Search, & Sort Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Real-time Search with Keyboard Shortcut Indicator */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search services, ports, or tags... (Press '/' to focus)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-16 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] pointer-events-none">
                <span>/</span>
              </div>
            )}
          </div>

          {/* Sort & View Mode Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {/* Sort dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              <ArrowUpDown size={13} className="text-[var(--text-muted)]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1"
              >
                <option value="order" className="bg-[var(--bg-card)]">Custom Order</option>
                <option value="az" className="bg-[var(--bg-card)]">Name (A-Z)</option>
                <option value="za" className="bg-[var(--bg-card)]">Name (Z-A)</option>
                <option value="category" className="bg-[var(--bg-card)]">Category</option>
                <option value="recent" className="bg-[var(--bg-card)]">Recently Added</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              <Filter size={13} className="text-[var(--text-muted)]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[var(--bg-card)]">All Statuses</option>
                <option value="pinned" className="bg-[var(--bg-card)]">★ Pinned Only ({pinnedIds.length})</option>
                <option value="online" className="bg-[var(--bg-card)]">Online Only</option>
                <option value="offline" className="bg-[var(--bg-card)]">Offline Only</option>
              </select>
            </div>

            {/* Grid / List & Group Switcher */}
            <div className="flex items-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                title="Dạng lưới thẻ (Grid view)"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Dạng danh sách (List view)"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <List size={15} />
              </button>
              <div className="w-[1px] h-3.5 bg-[var(--border-subtle)] mx-0.5" />
              <button
                onClick={toggleGroupByCategory}
                title={groupByCategory ? 'Đang gộp theo phân loại (Click để bỏ gộp)' : 'Gộp dịch vụ theo từng Phân loại (Sections)'}
                className={`p-1.5 rounded-md transition-colors ${
                  groupByCategory
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Layers size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills with Pinned Tab */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Pinned pill if any pinned */}
          {pinnedIds.length > 0 && (
            <button
              onClick={() => setStatusFilter(statusFilter === 'pinned' ? 'all' : 'pinned')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all shrink-0 border ${
                statusFilter === 'pinned'
                  ? 'bg-amber-500/20 text-amber-400 font-medium border-amber-500/40 shadow-xs'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-amber-400/80 hover:text-amber-400 hover:border-amber-400/30'
              }`}
            >
              <Star size={12} className="fill-amber-400" />
              <span>Favorites</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-400">
                {pinnedIds.length}
              </span>
            </button>
          )}

          {categories.map((category) => {
            const isSelected = selectedCategory === category && statusFilter !== 'pinned';
            const count = category === 'All'
              ? services.length
              : services.filter((s) => s.category === category).length;

            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  if (statusFilter === 'pinned') setStatusFilter('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white font-medium border-[var(--accent)] shadow-xs'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span>{category}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Display (Grid, List, or Grouped Sections) */}
      {filteredServices.length > 0 ? (
        groupByCategory && selectedCategory === 'All' ? (
          /* Grouped by Category Sections */
          <div className="space-y-8">
            {categories
              .filter((c) => c !== 'All')
              .map((cat) => {
                const catServices = filteredServices.filter((s) => s.category === cat);
                if (catServices.length === 0) return null;

                return (
                  <div key={cat} className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                          {cat}
                        </h2>
                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                          {catServices.length} {catServices.length === 1 ? 'dịch vụ' : 'dịch vụ'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        viewMode === 'grid'
                          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5'
                          : 'space-y-2.5'
                      }
                    >
                      {catServices.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          health={healthMap[service.id]}
                          onCheckHealth={onCheckHealth}
                          onSelectService={setSelectedService}
                          viewMode={viewMode}
                          isPinned={pinnedIds.includes(service.id)}
                          onTogglePin={togglePin}
                          useDynamicHost={useDynamicHost}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          /* Flat Grid or List */
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5'
                : 'space-y-2.5'
            }
          >
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                health={healthMap[service.id]}
                onCheckHealth={onCheckHealth}
                onSelectService={setSelectedService}
                viewMode={viewMode}
                isPinned={pinnedIds.includes(service.id)}
                onTogglePin={togglePin}
                useDynamicHost={useDynamicHost}
              />
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]/40">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-3">
            <Search size={22} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No services found</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
            {search || selectedCategory !== 'All' || statusFilter !== 'all'
              ? 'No active services matched your query filters.'
              : 'No services are currently visible in the portal.'}
          </p>
          {(search || selectedCategory !== 'All' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                setStatusFilter('all');
              }}
              className="mt-4 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Footer info note */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-2">
        <div className="flex items-center gap-2">
          <span>Self-Hosted Service Hub</span>
          <span>•</span>
          <span>Flat Minimalist Architecture</span>
          {pinnedIds.length > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-400/90">{pinnedIds.length} pinned</span>
            </>
          )}
        </div>
        <div className="font-mono text-[11px]">
          Showing {filteredServices.length} of {services.length} services
        </div>
      </div>

      {/* Deep Telemetry & Container Details Modal */}
      <ServiceDetailModal
        service={selectedService}
        health={selectedService ? healthMap[selectedService.id] : undefined}
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        onCheckHealth={onCheckHealth}
        useDynamicHost={useDynamicHost}
      />

      {/* Network Tools: Wake-on-LAN & TCP Ping Modal */}
      <NetworkToolsModal
        isOpen={isNetworkToolsOpen}
        onClose={() => setIsNetworkToolsOpen(false)}
      />
    </div>
  );
};
