'use client';

import { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logoutAction } from '@/lib/actions/auth';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
}

interface DashboardShellProps {
  title: string;
  navItems: NavItem[];
  activeView: string;
  onViewChange: (view: string) => void;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export default function DashboardShell({ 
  title, 
  navItems, 
  activeView, 
  onViewChange, 
  children,
  headerRight 
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleNavClick = (viewId: string) => {
    onViewChange(viewId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* ─── Mobile Top Bar ─── */}
      <header className="lg:hidden sticky top-0 z-50 bg-surface/95 backdrop-blur-xl border-b border-surface-border px-4 py-3 flex items-center justify-between safe-top shadow-sm">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-1 rounded-xl hover:bg-primary/10 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6 text-primary" />
        </button>
        <span className="text-lg font-black text-gradient truncate mx-3">{title}</span>
        <div className="flex items-center gap-2">
          {headerRight}
        </div>
      </header>

      {/* ─── Mobile Sidebar Overlay ─── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-[60] bg-cosmos/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] z-[70] bg-gradient-to-b from-surface to-surface/95 border-r border-surface-border p-5 flex flex-col lg:hidden shadow-2xl safe-top"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-xl font-black text-gradient">{title}</span>
                <button 
                  onClick={() => setSidebarOpen(false)} 
                  className="p-2 rounded-xl hover:bg-primary/10 transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5 text-primary" />
                </button>
              </div>

              <nav className="space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm
                      ${activeView === item.id 
                        ? item.accent 
                          ? 'bg-accent/15 text-accent shadow-sm' 
                          : 'bg-primary/15 text-primary shadow-sm' 
                        : 'text-foreground/60 hover:bg-primary/5 hover:text-primary'}`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>

              <button 
                onClick={() => logoutAction()} 
                className="w-full flex items-center gap-3 px-4 py-3.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all font-bold text-sm mt-2"
              >
                <LogOut className="w-5 h-5" /> Salir
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 xl:w-72 bg-gradient-to-b from-surface to-surface/95 border-r border-surface-border p-6 flex-col sticky top-0 h-screen z-40 shrink-0 shadow-sm">
        <div className="mb-10 px-2 text-2xl font-black text-gradient">{title}</div>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all
                ${activeView === item.id 
                  ? item.accent 
                    ? 'bg-accent/15 text-accent shadow-sm' 
                    : 'bg-primary/15 text-primary shadow-sm' 
                  : 'text-foreground/60 hover:bg-primary/5 hover:text-primary'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <button 
          onClick={() => logoutAction()} 
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all font-bold"
        >
          <LogOut className="w-5 h-5" /> Salir
        </button>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10 overflow-auto">
        {children}
      </main>
    </div>
  );
}
