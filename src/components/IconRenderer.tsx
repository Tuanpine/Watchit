import React from 'react';
import * as Icons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface IconRendererProps extends LucideProps {
  name: string;
  className?: string;
  size?: number;
}

// Map of common alias names to actual Lucide component names
const ICON_ALIAS_MAP: Record<string, keyof typeof Icons> = {
  container: 'Boxes',
  containers: 'Boxes',
  docker: 'Boxes',
  database: 'Database',
  db: 'Database',
  postgres: 'Database',
  mysql: 'Database',
  redis: 'Zap',
  mongo: 'Database',
  server: 'Server',
  workflow: 'Workflow',
  automation: 'Workflow',
  activity: 'Activity',
  monitoring: 'Activity',
  metrics: 'BarChart3',
  analytics: 'BarChart3',
  grafana: 'Activity',
  prometheus: 'Activity',
  shield: 'Shield',
  security: 'Shield',
  vault: 'Lock',
  vaultwarden: 'Shield',
  password: 'Key',
  cloud: 'Cloud',
  storage: 'HardDrive',
  nextcloud: 'Cloud',
  s3: 'HardDrive',
  minio: 'HardDrive',
  radio: 'Radio',
  kuma: 'Radio',
  uptime: 'Radio',
  cpu: 'Cpu',
  ai: 'Cpu',
  ollama: 'Cpu',
  llm: 'Cpu',
  globe: 'Globe',
  proxy: 'Globe',
  caddy: 'Globe',
  nginx: 'Globe',
  traefik: 'Workflow',
  terminal: 'Terminal',
  cli: 'Terminal',
  code: 'Code',
  git: 'GitBranch',
  media: 'Play',
  video: 'Video',
  music: 'Music',
  chat: 'MessageSquare',
  network: 'Network',
  wifi: 'Wifi',
  mail: 'Mail'
};

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-5 h-5', size = 20, ...props }) => {
  if (!name) {
    const Fallback = Icons.Box;
    return <Fallback className={className} size={size} {...props} />;
  }

  // Check if it's an image or svg URL
  if (name.startsWith('http://') || name.startsWith('https://') || name.startsWith('data:') || name.startsWith('/')) {
    return (
      <img
        src={name}
        alt="service icon"
        className={`${className} object-contain rounded`}
        style={{ width: size, height: size }}
        onError={(e) => {
          // fallback to generic icon on image load error
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();

  // 1. Direct Lucide match
  let Component = (Icons as any)[cleanName];

  // 2. PascalCase transformation
  if (!Component) {
    const pascal = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    Component = (Icons as any)[pascal];
  }

  // 3. Alias check
  if (!Component && ICON_ALIAS_MAP[lowerName]) {
    const aliasKey = ICON_ALIAS_MAP[lowerName];
    Component = (Icons as any)[aliasKey];
  }

  // 4. Fallback to Box
  if (!Component) {
    Component = Icons.Box;
  }

  return <Component className={className} size={size} {...props} />;
};

export const AVAILABLE_ICONS = [
  // DevOps & Containers
  { name: 'Boxes', label: 'Docker / Containers', category: 'DevOps' },
  { name: 'Server', label: 'Server / Node', category: 'DevOps' },
  { name: 'Terminal', label: 'Terminal / CLI', category: 'DevOps' },
  { name: 'Cpu', label: 'CPU / Compute', category: 'DevOps' },
  { name: 'Layers', label: 'Layers / Stack', category: 'DevOps' },
  { name: 'Box', label: 'Box / Package', category: 'DevOps' },

  // Automation & Workflows
  { name: 'Workflow', label: 'Workflow (N8N)', category: 'Automation' },
  { name: 'GitBranch', label: 'Git / CI-CD', category: 'Automation' },
  { name: 'RefreshCw', label: 'Sync / Automation', category: 'Automation' },
  { name: 'Sliders', label: 'Pipeline / Config', category: 'Automation' },

  // Monitoring & Observability
  { name: 'Activity', label: 'Activity / Grafana', category: 'Monitoring' },
  { name: 'BarChart3', label: 'Metrics / Analytics', category: 'Monitoring' },
  { name: 'Radio', label: 'Uptime / Kuma', category: 'Monitoring' },
  { name: 'Zap', label: 'Events / Alerts', category: 'Monitoring' },

  // Databases & Caching
  { name: 'Database', label: 'SQL / Postgres', category: 'Databases' },
  { name: 'HardDrive', label: 'Storage / MinIO', category: 'Databases' },
  { name: 'FolderGit2', label: 'Data Store', category: 'Databases' },

  // Networking & Web
  { name: 'Globe', label: 'Web / Proxy / Caddy', category: 'Networking' },
  { name: 'Network', label: 'Network / Mesh', category: 'Networking' },
  { name: 'Wifi', label: 'Gateway / Wireless', category: 'Networking' },
  { name: 'Share2', label: 'API / Routing', category: 'Networking' },

  // Security & Identity
  { name: 'Shield', label: 'Shield / Firewall', category: 'Security' },
  { name: 'Lock', label: 'Vault / Password', category: 'Security' },
  { name: 'Key', label: 'Keys / Auth', category: 'Security' },

  // Cloud & Storage
  { name: 'Cloud', label: 'Cloud / Nextcloud', category: 'Storage' },
  { name: 'Folder', label: 'Files / Directory', category: 'Storage' },
  { name: 'FileText', label: 'Documents / Wiki', category: 'Storage' },

  // Media & Messaging
  { name: 'Play', label: 'Media / Jellyfin', category: 'Media' },
  { name: 'Video', label: 'Video Stream', category: 'Media' },
  { name: 'MessageSquare', label: 'Chat / Matrix', category: 'Communication' },
  { name: 'Mail', label: 'Mail Server', category: 'Communication' },

  // Tools & Settings
  { name: 'Settings', label: 'Settings / Config', category: 'General' },
  { name: 'Search', label: 'Search Engine', category: 'General' },
  { name: 'Code', label: 'IDE / Editor', category: 'General' },
  { name: 'Monitor', label: 'Dashboard / GUI', category: 'General' }
];
