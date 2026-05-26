import { useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, ChevronRight } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { useSidebar } from './SidebarContext';
import { CHECK_REGISTRY } from '../../config/checks';

// Build a map of { pathname → label } from CHECK_REGISTRY
const ROUTE_LABELS = Object.fromEntries(
  CHECK_REGISTRY.map((c) => [`/${c.name}`, c.label]),
);

function Breadcrumb() {
  const { pathname } = useLocation();
  const isRoot  = pathname === '/';
  const current = ROUTE_LABELS[pathname];

  if (isRoot) {
    return (
      <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
        Dashboard
      </span>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
      <span className="text-slate-400 dark:text-slate-500">Dashboard</span>
      <ChevronRight size={11} className="text-slate-300 dark:text-slate-600 shrink-0" />
      <span className="font-medium text-slate-900 dark:text-slate-100">
        {current ?? pathname.replace('/', '')}
      </span>
    </nav>
  );
}

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { toggleMobile }  = useSidebar();

  return (
    <header
      className="h-12 shrink-0 flex items-center px-4 gap-3
                 bg-white dark:bg-slate-900
                 border-b border-slate-200 dark:border-slate-800
                 z-10 select-none"
    >
      {/* ── Left: mobile hamburger + brand ───────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleMobile}
          className="btn-ghost p-1.5 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={16} className="text-slate-500 dark:text-slate-400" />
        </button>

        {/* Brand mark — always visible */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="w-[18px] h-[18px] rounded bg-blue-600 flex items-center justify-center"
            aria-hidden
          >
            <span className="text-white font-bold" style={{ fontSize: '9px', lineHeight: 1 }}>H</span>
          </span>
          {/* Brand text — hidden on very small screens */}
          <span className="hidden xs:block text-xs font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Health Monitor
          </span>
        </div>

        {/* Divider */}
        <span className="hidden md:block w-px h-4 bg-slate-200 dark:bg-slate-700" aria-hidden />

        {/* Breadcrumb */}
        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>

      {/* ── Spacer ───────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Right: theme toggle + settings ───────────────────────── */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={toggle}
          className="btn-ghost p-2 rounded-md"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark'
            ? <Sun  size={14} className="text-slate-400 hover:text-slate-200 transition-colors" />
            : <Moon size={14} className="text-slate-500 hover:text-slate-700 transition-colors" />
          }
        </button>
      </div>
    </header>
  );
}
