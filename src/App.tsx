/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Service, ServiceHealth, ThemeMode, UserSession } from './types';
import { Navbar } from './components/Navbar';
import { PublicPortal } from './components/PublicPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';

export default function App() {
  const [currentView, setCurrentView] = useState<'portal' | 'admin'>('portal');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('portal_theme') as ThemeMode) || 'forest';
  });

  const [services, setServices] = useState<Service[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, ServiceHealth>>({});
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token');
  });

  const [portalTitle, setPortalTitle] = useState('Service Hub & Project Portal');
  const [portalSubtitle, setPortalSubtitle] = useState(
    'Self-Hosted Infrastructure, Docker Containers & Microservices Gateway'
  );

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal_theme', theme);
  }, [theme]);

  // Check current admin session
  const checkAuth = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        localStorage.removeItem('admin_token');
      }
    } catch {
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch public visible services
  const fetchServices = useCallback(async () => {
    setIsLoadingServices(true);
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
      }
      if (data.meta?.title) {
        setPortalTitle(data.meta.title);
      }
      if (data.meta?.subtitle) {
        setPortalSubtitle(data.meta.subtitle);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Check health for all services
  const refreshAllHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch('/api/health/check-all', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.results) {
        setHealthMap(data.results);
      }
    } catch (err) {
      console.error('Batch health check failed:', err);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  // Run initial health check once services load
  useEffect(() => {
    if (services.length > 0) {
      refreshAllHealth();
    }
  }, [services.length, refreshAllHealth]);

  // Check single service health
  const checkSingleHealth = async (service: Service) => {
    setHealthMap((prev) => ({
      ...prev,
      [service.id]: {
        id: service.id,
        status: 'checking',
        lastChecked: new Date().toISOString()
      }
    }));

    try {
      const target = service.health_check_url || service.url;
      const res = await fetch('/api/health/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target, id: service.id })
      });
      const data = await res.json();
      setHealthMap((prev) => ({
        ...prev,
        [service.id]: data
      }));
    } catch (err: any) {
      setHealthMap((prev) => ({
        ...prev,
        [service.id]: {
          id: service.id,
          status: 'offline',
          error: err.message,
          lastChecked: new Date().toISOString()
        }
      }));
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: { username: string; role: string }) => {
    setToken(newToken);
    localStorage.setItem('admin_token', newToken);
    setUser(newUser as UserSession);
    setCurrentView('admin');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setToken(null);
    localStorage.removeItem('admin_token');
    setUser(null);
    setCurrentView('portal');
  };

  const handleUpdatePortalConfig = async (title: string, subtitle: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/portal-config', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ portalTitle: title, portalSubtitle: subtitle })
    });

    if (!res.ok) throw new Error('Failed to update portal config');

    setPortalTitle(title);
    setPortalSubtitle(subtitle);
  };

  const onlineCount = Object.values(healthMap).filter((h) => h.status === 'online').length;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Universal Top Navigation */}
      <Navbar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        theme={theme}
        onThemeChange={(newTheme) => setTheme(newTheme)}
        user={user}
        onLogout={handleLogout}
        isCheckingHealth={isCheckingHealth}
        onRefreshHealth={refreshAllHealth}
        onlineCount={onlineCount || services.length}
        totalServices={services.length}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {currentView === 'portal' ? (
          <PublicPortal
            services={services}
            healthMap={healthMap}
            onCheckHealth={checkSingleHealth}
            onRefreshAllHealth={refreshAllHealth}
            isCheckingHealth={isCheckingHealth}
            portalTitle={portalTitle}
            portalSubtitle={portalSubtitle}
          />
        ) : user ? (
          <AdminDashboard
            user={user}
            token={token}
            onLogout={handleLogout}
            onServicesUpdated={fetchServices}
            portalTitle={portalTitle}
            portalSubtitle={portalSubtitle}
            onUpdatePortalConfig={handleUpdatePortalConfig}
          />
        ) : (
          <AdminLogin
            onLoginSuccess={handleLoginSuccess}
            onBackToPortal={() => setCurrentView('portal')}
          />
        )}
      </main>
    </div>
  );
}
