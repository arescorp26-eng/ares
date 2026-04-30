'use client';

import { loginAction } from '@/lib/actions/auth';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-primary opacity-10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[35rem] h-[35rem] bg-accent opacity-10 blur-[130px] rounded-full pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/40">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-gradient">Bienvenido de nuevo</h1>
          <p className="text-foreground/60 mt-2">Ingresa a tu portal de Ares</p>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] border border-surface-border shadow-2xl">
          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block ml-1">Email Académico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
                <input 
                  name="email"
                  type="email" 
                  placeholder="tu@correo.com"
                  className="w-full bg-background/50 border border-surface-border rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
                <input 
                  name="password"
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-background/50 border border-surface-border rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-500 text-sm font-bold bg-red-500/10 p-4 rounded-xl text-center"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Iniciar Sesión <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-surface-border flex flex-col gap-4 text-center text-sm">
            <p className="text-foreground/60">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="text-primary font-bold hover:underline">Regístrate como Alumno</Link>
            </p>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-foreground/30">
              Usa los datos de Admin para configurar Profesores
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
