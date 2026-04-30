'use client';

import { useState } from 'react';
import { Users, UserPlus, Settings, ShieldCheck, Mail, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { registerAction } from '@/lib/actions/auth';
import DashboardShell from '@/components/DashboardShell';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleAddProfessor(formData: FormData) {
    setLoading(true);
    setMsg(null);
    formData.append('role', 'PROFESSOR');
    const result = await registerAction(formData, false);
    setLoading(false);
    if (result?.error) {
      setMsg({ type: 'error', text: result.error });
    } else {
      setMsg({ type: 'success', text: 'Profesor registrado exitosamente' });
    }
  }

  const navItems = [
    { id: 'professors', label: 'Gestión Docente', icon: <Users className="w-5 h-5" /> },
    { id: 'settings', label: 'Ajustes Globales', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <DashboardShell
      title="Ares Admin"
      navItems={navItems}
      activeView="professors"
      onViewChange={() => {}}
      headerRight={
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold ring-1 ring-green-500/20">
          <ShieldCheck className="w-3.5 h-3.5" /> Activo
        </div>
      }
    >
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-10">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Panel Administrativo</h2>
          <p className="text-foreground/60 text-sm mt-1">Registra y gestiona las cuentas de profesores de la institución.</p>
        </div>
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-xs font-bold ring-1 ring-green-500/20">
          <ShieldCheck className="w-4 h-4" /> Servidor Activo
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
        {/* Formulario para agregar Profesores */}
        <section className="glass-panel p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-surface-border shadow-xl">
          <h3 className="text-lg sm:text-xl font-bold mb-5 sm:mb-6 flex items-center gap-3">
            <UserPlus className="w-5 sm:w-6 h-5 sm:h-6 text-primary" /> Registrar Nuevo Profesor
          </h3>
          
          <form action={handleAddProfessor} className="space-y-4 sm:space-y-5">
            <div>
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block ml-1">Nombre del Docente</label>
              <input name="name" type="text" placeholder="Ej. Dr. Armando Esteban Quito" required className="w-full bg-background/50 border border-surface-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
            </div>
            
            <div>
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block ml-1">Correo Institucional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20" />
                <input name="email" type="email" placeholder="profesor@ares.com" required className="w-full bg-background/50 border border-surface-border rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
              </div>
            </div>

            <div>
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block ml-1">Contraseña Temporal</label>
              <input name="password" type="password" placeholder="Mínimo 8 caracteres" required className="w-full bg-background/50 border border-surface-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
            </div>

            {msg && (
              <motion.p 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-3 sm:p-4 rounded-xl text-xs font-bold text-center ${msg.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
              >
                {msg.text}
              </motion.p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 sm:py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Cuenta Profesional'}
            </button>
          </form>
        </section>

        {/* Estadísticas Rápidas */}
        <section className="space-y-4 sm:space-y-6">
           <div className="p-5 sm:p-6 glass-panel rounded-2xl sm:rounded-3xl border border-surface-border flex items-center justify-between">
             <div>
                <p className="text-[10px] sm:text-xs font-bold text-foreground/40 uppercase tracking-widest">Total Profesores</p>
                <p className="text-2xl sm:text-3xl font-black mt-1">--</p>
             </div>
             <div className="w-10 sm:w-12 h-10 sm:h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-5 sm:w-6 h-5 sm:h-6" />
             </div>
           </div>
           
           <div className="p-6 sm:p-8 bg-gradient-to-br from-primary to-accent text-white rounded-2xl sm:rounded-[2rem] shadow-2xl">
              <h4 className="text-base sm:text-lg font-bold mb-2">Seguridad Administrativa</h4>
              <p className="text-white/70 text-xs sm:text-sm leading-relaxed mb-4">
                Como Administrador, puedes ver los registros de actividad y resetear contraseñas de docentes.
              </p>
              <div className="p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl flex items-center gap-3">
                 <div className="w-7 sm:w-8 h-7 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">⚠️</div>
                 <p className="text-[9px] sm:text-[10px] font-bold uppercase">Respeta la privacidad de los datos académicos</p>
              </div>
           </div>
        </section>
      </div>
    </DashboardShell>
  );
}
