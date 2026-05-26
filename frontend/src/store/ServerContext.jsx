import { createContext, useContext, useState } from 'react';

const ServerContext = createContext(null);

// Seed data so the UI is immediately usable without "Add Server" first
const SEED = [
  {
    id: 'demo-1',
    name: 'Demo Server',
    ip: '192.168.1.100',
    ssh_port: 22,
    ssh_username: 'admin',
    ssh_password: '',
    ssh_key_path: '/root/.ssh/id_rsa',
    api_base_url: 'http://192.168.1.100',
    api_token: '',
  },
];

function load() {
  try {
    const raw = localStorage.getItem('hc-servers');
    return raw ? JSON.parse(raw) : SEED;
  } catch {
    return SEED;
  }
}

function save(servers) {
  try {
    localStorage.setItem('hc-servers', JSON.stringify(servers));
  } catch {}
}

export function ServerProvider({ children }) {
  const [servers, setServers] = useState(load);
  const [activeId, setActiveId] = useState(() => load()[0]?.id ?? null);

  const persist = (next) => {
    setServers(next);
    save(next);
  };

  const addServer = (data) => {
    const s = { ...data, id: crypto.randomUUID() };
    const next = [...servers, s];
    persist(next);
    setActiveId(s.id);
  };

  const updateServer = (id, patch) =>
    persist(servers.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const deleteServer = (id) => {
    const next = servers.filter((s) => s.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const activeServer = servers.find((s) => s.id === activeId) ?? null;

  return (
    <ServerContext.Provider
      value={{ servers, activeServer, activeId, setActiveId, addServer, updateServer, deleteServer }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServers() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServers must be inside ServerProvider');
  return ctx;
}
