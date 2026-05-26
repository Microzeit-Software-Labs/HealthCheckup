import { useState } from 'react';
import { Server, Plus, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import clsx from 'clsx';
import { useServers } from '../../store/ServerContext';
import { useSidebar } from './SidebarContext';
import ServerModal from '../modals/ServerModal';

// ─── Tooltip (CSS-only, no library) ──────────────────────────────────────────
function Tooltip({ label, children }) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2
                   px-2 py-1 rounded text-xs font-medium whitespace-nowrap
                   bg-slate-800 dark:bg-slate-700 text-slate-100
                   opacity-0 group-hover/tip:opacity-100
                   transition-opacity duration-100 delay-300
                   z-50"
      >
        {label}
        {/* Arrow */}
        <span
          className="absolute right-full top-1/2 -translate-y-1/2
                     border-4 border-transparent border-r-slate-800 dark:border-r-slate-700"
          aria-hidden
        />
      </div>
    </div>
  );
}

// ─── Single server button ─────────────────────────────────────────────────────
function ServerItem({ server, isActive, collapsed, onEdit }) {
  const { setActiveId } = useServers();

  const btn = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setActiveId(server.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveId(server.id)}
      className={clsx(
        'group/item w-full flex items-center rounded-md transition-colors duration-100 cursor-pointer',
        collapsed ? 'justify-center px-0 py-2' : 'gap-2 px-2 py-2',
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
      )}
    >
      {/* Active stripe indicator (expanded mode) */}
      {!collapsed && (
        <span
          className={clsx(
            'absolute left-0 top-1 bottom-1 w-0.5 rounded-r transition-opacity',
            isActive ? 'bg-blue-500 opacity-100' : 'opacity-0',
          )}
          aria-hidden
        />
      )}

      <Server
        size={14}
        className={clsx(
          'shrink-0 transition-colors',
          isActive
            ? 'text-blue-500'
            : 'text-slate-400 dark:text-slate-500 group-hover/item:text-slate-600 dark:group-hover/item:text-slate-400',
        )}
      />

      {/* Text — hidden when collapsed */}
      {!collapsed && (
        <>
          <div className="flex-1 min-w-0 text-left">
            <div className="truncate text-xs font-medium leading-none mb-0.5">
              {server.name}
            </div>
            <div className="truncate text-[10px] font-mono opacity-50">
              {server.ip}
            </div>
          </div>

          {/* Edit button — appears on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(server); }}
            className="shrink-0 p-0.5 rounded text-slate-400
                       opacity-0 group-hover/item:opacity-100
                       hover:text-slate-600 dark:hover:text-slate-200
                       transition-opacity"
            aria-label={`Edit ${server.name}`}
          >
            <MoreHorizontal size={12} />
          </button>
        </>
      )}
    </div>
  );

  // Wrap in tooltip only when sidebar is collapsed
  if (collapsed) {
    return (
      <Tooltip label={`${server.name}  ·  ${server.ip}`}>
        <div className="relative">{btn}</div>
      </Tooltip>
    );
  }

  return <div className="relative">{btn}</div>;
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { servers } = useServers();
  const { activeServer } = useServers();
  const { collapsed, toggleCollapsed, mobileOpen } = useSidebar();
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);

  const openAdd  = ()  => { setEditTarget(null);    setModalOpen(true); };
  const openEdit = (s) => { setEditTarget(s);        setModalOpen(true); };

  return (
    <>
      <aside
        className={clsx(
          // Layout
          'flex flex-col h-full shrink-0 overflow-hidden',
          // Colors
          'bg-white dark:bg-slate-900',
          'border-r border-slate-200 dark:border-slate-800',
          // Mobile: fixed drawer; desktop: inline in flex layout
          'fixed md:relative inset-y-0 left-0 z-30 md:z-auto',
          // Width: mobile always w-52; desktop switches on collapsed
          'w-52',
          collapsed ? 'md:w-[52px]' : 'md:w-52',
          // Transitions: transform (mobile) + width (desktop)
          'transition-[transform,width] duration-200 ease-in-out',
          // Mobile drawer visibility
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        aria-label="Server navigation"
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div
          className={clsx(
            'flex items-center shrink-0',
            'h-12 border-b border-slate-200 dark:border-slate-800',
            collapsed ? 'justify-center px-0' : 'px-4 gap-2',
          )}
        >
          {!collapsed && (
            <span className="section-label flex-1">Servers</span>
          )}

          {/* Collapse toggle — desktop only */}
          <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <button
              onClick={toggleCollapsed}
              className="hidden md:flex p-1.5 rounded-md
                         text-slate-400 dark:text-slate-500
                         hover:text-slate-600 dark:hover:text-slate-300
                         hover:bg-slate-100 dark:hover:bg-slate-800
                         transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <PanelLeftOpen  size={13} />
                : <PanelLeftClose size={13} />
              }
            </button>
          </Tooltip>
        </div>

        {/* ── Server list ─────────────────────────────────────────── */}
        <nav
          className={clsx(
            'flex-1 overflow-y-auto overflow-x-hidden py-1.5',
            collapsed ? 'px-1' : 'px-1.5',
          )}
        >
          {servers.length === 0 && !collapsed && (
            <p className="px-3 py-3 text-[11px] text-slate-400 dark:text-slate-500">
              No servers yet.
            </p>
          )}

          <div className="space-y-0.5">
            {servers.map((server) => (
              <ServerItem
                key={server.id}
                server={server}
                isActive={activeServer?.id === server.id}
                collapsed={collapsed}
                onEdit={openEdit}
              />
            ))}
          </div>
        </nav>

        {/* ── Add server button ────────────────────────────────────── */}
        <div
          className={clsx(
            'shrink-0 border-t border-slate-200 dark:border-slate-800',
            collapsed ? 'p-1.5' : 'p-2',
          )}
        >
          {collapsed ? (
            <Tooltip label="Add Server">
              <button
                onClick={openAdd}
                className="w-full flex items-center justify-center p-2 rounded-md
                           text-slate-400 dark:text-slate-500
                           hover:text-slate-600 dark:hover:text-slate-300
                           hover:bg-slate-100 dark:hover:bg-slate-800
                           transition-colors"
                aria-label="Add Server"
              >
                <Plus size={13} />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={openAdd}
              className="w-full flex items-center justify-center gap-1.5
                         py-1.5 rounded-md text-xs font-medium
                         text-slate-500 dark:text-slate-400
                         border border-dashed border-slate-300 dark:border-slate-700
                         hover:border-slate-400 dark:hover:border-slate-500
                         hover:bg-slate-50 dark:hover:bg-slate-800/60
                         transition-colors"
            >
              <Plus size={12} />
              Add Server
            </button>
          )}
        </div>
      </aside>

      {/* Server add / edit modal */}
      {modalOpen && (
        <ServerModal server={editTarget} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
