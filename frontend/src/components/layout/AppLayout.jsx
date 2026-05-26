import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { SidebarProvider, useSidebar } from './SidebarContext';

/**
 * Inner shell — lives inside SidebarProvider so it can read context.
 */
function Shell() {
  const { mobileOpen, closeMobile } = useSidebar();
  const location = useLocation();

  // Close mobile drawer on navigation
  useEffect(() => {
    closeMobile();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/*
        Mobile overlay — sits behind the sidebar (z-20) and above the main
        content (z-10), but below the sidebar itself (z-30).
        Clicking it closes the drawer.
      */}
      {mobileOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={closeMobile}
        />
      )}

      <Sidebar />

      {/* ── Right column: navbar + scrollable content ───────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto focus:outline-none"
          tabIndex={-1}
        >
          <div className="px-6 py-5 max-w-screen-2xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <Shell />
    </SidebarProvider>
  );
}
