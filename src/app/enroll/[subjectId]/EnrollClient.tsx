'use client';

import { useState } from 'react';
import { Book, ArrowRight, ShieldAlert, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { enrollAction } from '@/lib/actions/auth';
import Link from 'next/link';

export default function EnrollPage({ subject, subjectId, userEmail }: { 
  subject: any; 
  subjectId: number;
  userEmail: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await enrollAction(subjectId);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/dashboard/student';
        }, 1500);
      }
    } catch (e: any) {
      setError(e.message || 'Error al inscribirse');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full glass-panel p-10 rounded-[3rem] border border-green-500/20 bg-green-500/5 text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-green-500/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter mb-2">¡INSCRIPCIÓN EXITOSA!</h1>
          <p className="text-foreground/60 mb-6">Redirigiendo al dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full glass-panel p-10 rounded-[3rem] border border-primary/20 bg-primary/5 text-center shadow-2xl relative overflow-hidden">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-primary/30">
          <Book className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-black italic tracking-tighter mb-2">¡HAS SIDO INVITADO!</h1>
        <p className="text-foreground/60 mb-8">Estás a un paso de unirte a la materia:</p>
        
        <div className="p-6 bg-surface rounded-3xl border border-surface-border mb-10 shadow-sm">
          <h2 className="text-2xl font-black text-primary mb-1">{subject.name}</h2>
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">{subject.professor?.name}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <button 
          onClick={handleEnroll}
          disabled={loading}
          className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</>
          ) : (
            <>Confirmar Inscripción <ArrowRight className="w-6 h-6" /></>
          )}
        </button>

        <p className="mt-8 text-[10px] font-bold text-foreground/30 uppercase tracking-[0.3em]">Conectado como {userEmail}</p>
      </div>
    </main>
  );
}
