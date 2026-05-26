import { createContext, useContext, useEffect, useState } from 'react';

const SidebarContext = createContext(null);

const STORAGE_KEY = 'hc-sidebar-collapsed';
const MOBILE_BREAKPOINT = 768; // md

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
}

function loadCollapsed() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

export function SidebarProvider({ children }) {
  // Desktop: collapsed = icon-only (persisted)
  const [collapsed, setCollapsedState] = useState(loadCollapsed);
  // Mobile: drawer open/closed (not persisted — resets on reload)
  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = (val) => {
    setCollapsedState(val);
    try { localStorage.setItem(STORAGE_KEY, String(val)); } catch {}
  };

  const toggleCollapsed = () => setCollapsed(!collapsed);
  const toggleMobile    = () => setMobileOpen((o) => !o);
  const closeMobile     = () => setMobileOpen(false);

  // Auto-close mobile drawer when viewport grows past breakpoint
  useEffect(() => {
    const handler = () => { if (!isMobile()) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggleCollapsed, mobileOpen, toggleMobile, closeMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be inside SidebarProvider');
  return ctx;
}
