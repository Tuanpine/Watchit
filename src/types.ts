export interface Service {
  id: string;
  name: string;
  image?: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  port: number;
  category: string;
  source: 'docker' | 'manual';
  container_id?: string;
  is_visible: boolean;
  display_order: number;
  health_check_url?: string;
  created_at?: string;
  updated_at?: string;
}

export type HealthStatusType = 'online' | 'offline' | 'checking' | 'unknown';

export interface ServiceHealth {
  id: string;
  status: HealthStatusType;
  statusCode?: number;
  latencyMs?: number;
  lastChecked?: string;
  error?: string;
}

export interface DockerContainer {
  id: string;
  shortId: string;
  names: string[];
  image: string;
  state: string;
  status: string;
  created: number;
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: string;
    ip?: string;
  }>;
  labels: Record<string, string>;
  isImported?: boolean;
  suggestedService?: Partial<Service>;
}

export interface DockerStatusResponse {
  socketAvailable: boolean;
  socketPath: string;
  containersCount: number;
  runningCount: number;
  isDemoFallback: boolean;
  serverVersion?: string;
  error?: string;
}

export interface UserSession {
  username: string;
  role: 'admin';
  exp?: number;
}

export type ThemeMode = 'forest' | 'earth' | 'slate' | 'light';

export interface UptimeDay {
  date: string;
  status: 'up' | 'down' | 'degraded';
  uptimePercent: number;
  latencyMs: number;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  uptimePercent30d: number;
  history30d: UptimeDay[];
  containerState?: string;
  containerStatus?: string;
  image?: string;
  created?: string;
  ports?: string[];
  isRealStats?: boolean;
}

export interface PortalStats {
  total: number;
  visible: number;
  hidden: number;
  online: number;
  offline: number;
  dockerCount: number;
  manualCount: number;
  categories: string[];
}

export interface WebhookInfo {
  url: string;
  webhookUrl: string;
  token: string;
  webhookToken: string;
  lastTriggered?: string | null;
}

export interface NetworkDevice {
  id: string;
  name: string;
  description?: string;
  ip: string;
  mac: string;
  port?: number;
  category?: 'Server' | 'NAS' | 'Switch' | 'Router' | 'Printer' | 'PC' | 'Other';
  broadcastIp?: string;
  wolPort?: number;
  lastPingStatus?: 'open' | 'closed' | 'timeout';
  lastPingLatency?: number;
  lastPingAt?: string;
  lastWolSentAt?: string;
}

export interface TcpPingResult {
  host: string;
  port: number;
  status: 'open' | 'closed' | 'timeout';
  latencyMs: number;
  message: string;
  timestamp: string;
}

export interface WolSendResult {
  mac: string;
  broadcastIp: string;
  port: number;
  success: boolean;
  message: string;
  timestamp: string;
}

export interface WeatherInfo {
  city: string;
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  humidity: number;
  windSpeed: number;
  unit: 'C' | 'F';
  lastUpdated: string;
}

export interface SecurityCheckItem {
  id: string;
  name: string;
  status: 'pass' | 'warning' | 'danger';
  title: string;
  description: string;
  recommendation?: string;
}

export interface SecurityAuditReport {
  score: 'A' | 'B' | 'C' | 'D';
  overallStatus: 'secure' | 'warning' | 'critical';
  checks: SecurityCheckItem[];
  warningsCount: number;
  criticalCount: number;
  summary: string;
  auditTimestamp: string;
}
