'use client';

import { registerAction } from '@/lib/actions/auth';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Sparkles, ArrowRight, Loader2, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    // Explicitly set the role as STUDENT for direct registration
    formData.append('role', 'STUDENT');
    
    const result = await registerAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-15%] right-[-5%] w-[35rem] h-[35rem] bg-accent/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-15%] left-[-5%] w-[40rem] h-[40rem] bg-primary/20 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-secondary/10 blur-[150px] rounded-full pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-ares-accent rounded-3xl flex items-center justify-center text-cosmos shadow-2xl shadow-accent/30 -rotate-3 hover:rotate-0 transition-transform">
              <GraduationCap className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-gradient">Únete a Ares</h1>
          <p className="text-foreground/60 mt-2 font-medium">Crea tu cuenta de estudiante y empieza a planificar</p>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] border border-surface-border shadow-2xl">
          <form action={handleSubmit} className="space-y-4">
             <div>
              <label className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2 block ml-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                <input 
                  name="name"
                  type="text" 
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-background/50 border-2 border-surface-border rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2 block ml-1">Correo Académico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                <input 
                  name="email"
                  type="email" 
                  placeholder="estudiante@universidad.edu"
                  className="w-full bg-background/50 border-2 border-surface-border rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2 block ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                <input 
                  name="password"
                  type="password" 
                  placeholder="Crea una contraseña fuerte"
                  className="w-full bg-background/50 border-2 border-surface-border rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none font-medium"
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
              className="w-full py-4 bg-gradient-ares-accent text-cosmos font-black rounded-2xl shadow-xl shadow-accent/25 flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-accent/40 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Crear Cuenta Estudiante <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-surface-border text-center text-sm">
            <p className="text-foreground/60">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary font-bold hover:underline">Inicia Sesión</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
