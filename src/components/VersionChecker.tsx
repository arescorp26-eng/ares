'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Zap } from 'lucide-react';

const STORAGE_KEY = 'ares-build-id';
const POLL_INTERVAL = 30_000; // 30 segundos entre chequeos
const INITIAL_DELAY = 5_000;   // 5 segundos de espera en el primer chequeo

export default function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);
  const lastBuildId = useRef<string | null>(null);
  const autoReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let mounted = true;

    const checkVersion = async () => {
      try {
        const resp = await fetch('/api/version', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!resp.ok) return;

        const { buildId } = await resp.json();
        if (!buildId) return;

        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
          // Primera visita: guardar buildId actual
          localStorage.setItem(STORAGE_KEY, buildId);
          lastBuildId.current = buildId;
          return;
        }

        if (stored !== buildId) {
          // Nuevo deploy detectado
          if (mounted) {
            setUpdateAvailable(true);
            // Auto-recargar después de 5 segundos
            autoReloadTimer.current = setTimeout(() => {
              if (mounted) {
                setReloading(true);
                setTimeout(() => forceReload(buildId), 600);
              }
            }, 8000);
          }
        }
      } catch {
        // Silencioso en error de red
      }
    };

    // Primer chequeo después de INITIAL_DELAY
    const initialTimer = setTimeout(checkVersion, INITIAL_DELAY);

    // Chequeos periódicos
    interval = setInterval(checkVersion, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (autoReloadTimer.current) clearTimeout(autoReloadTimer.current);
    };
  }, []);

  const forceReload = (buildId?: string) => {
    if (buildId) localStorage.setItem(STORAGE_KEY, buildId);
    window.location.reload();
  };

  const handleDismiss = () => {
    if (autoReloadTimer.current) clearTimeout(autoReloadTimer.current);
    setUpdateAvailable(false);
  };

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center p-3 pointer-events-none"
        >
          <div className="glass-panel border-2 border-accent/50 bg-accent/10 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-2xl shadow-accent/20 pointer-events-auto flex items-center gap-3 max-w-lg w-full">
            <div className="w-9 h-9 bg-accent/20 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground">
                {reloading ? 'Recargando...' : '¡Nueva versión disponible!'}
              </p>
              <p className="text-[10px] text-foreground/50 font-medium">
                {reloading ? 'Aplicando actualización...' : 'La app se actualizará automáticamente'}
              </p>
            </div>
            {!reloading && (
              <div className="flex gap-2">
                <button
                  onClick={() => forceReload()}
                  className="px-4 py-2 bg-accent text-cosmos font-black text-xs rounded-xl hover:scale-105 transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Recargar
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 bg-surface border border-surface-border text-foreground/50 font-bold text-xs rounded-xl hover:text-foreground transition-all"
                >
                  Ahora no
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
