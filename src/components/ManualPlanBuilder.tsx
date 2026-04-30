'use client';

import { useState } from 'react';
import { Plus, Trash2, Calendar, BookOpen, Save, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ManualPlanBuilderProps {
  subjectId: number;
  initialTopics?: any[];
  initialEvaluations?: any[];
  onComplete: (data: any) => void;
}

export default function ManualPlanBuilder({ subjectId, initialTopics, initialEvaluations, onComplete }: ManualPlanBuilderProps) {
  const [topics, setTopics] = useState<any[]>(initialTopics || [{ name: '', difficulty: 5, estimatedHours: 2 }]);
  const [evaluations, setEvaluations] = useState<any[]>(initialEvaluations || [{ title: '', date: '', weight: 20 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTopic = () => setTopics([...topics, { name: '', difficulty: 5, estimatedHours: 2 }]);
  const removeTopic = (idx: number) => setTopics(topics.filter((_, i) => i !== idx));
  
  const addEval = () => setEvaluations([...evaluations, { title: '', date: '', weight: 20 }]);
  const removeEval = (idx: number) => setEvaluations(evaluations.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, topics, evaluations }),
        credentials: 'include'
      });
      
      const result = await resp.json();
      if (!resp.ok) {
        if (resp.status === 401) {
          throw new Error('Tu sesión ha expirado. Cierra sesión y vuelve a entrar.');
        }
        throw new Error(result.error || 'Error al guardar');
      }

      onComplete({ success: true, data: { topics, evaluations } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 pb-10 sm:pb-20">
      {/* Sección Temas */}
      <section className="glass-panel p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-surface-border">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 sm:mb-8">
           <h3 className="text-base sm:text-xl font-bold flex items-center gap-2">
             <BookOpen className="w-5 h-5 text-primary" /> Temario de la Materia
           </h3>
           <button onClick={addTopic} className="text-xs sm:text-sm font-bold bg-primary/10 text-primary px-4 py-2 rounded-xl hover:bg-primary hover:text-white transition-all w-full sm:w-auto text-center">
             + Añadir Tema
           </button>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {topics.map((t, idx) => (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-background/50 rounded-xl sm:rounded-2xl border border-surface-border sm:items-end group">
              <div className="flex-1 space-y-1.5 sm:space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Nombre del Tema</label>
                <input 
                  value={t.name}
                  onChange={(e) => {
                    const next = [...topics];
                    next[idx].name = e.target.value;
                    setTopics(next);
                  }}
                  placeholder="Ej: Derivadas Parciales"
                  className="w-full bg-transparent border-none outline-none font-bold placeholder:text-foreground/20 text-sm"
                />
              </div>
              <div className="flex items-end gap-3">
                <div className="w-20 sm:w-24 space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Horas</label>
                  <input 
                    type="number"
                    value={t.estimatedHours}
                    onChange={(e) => {
                      const next = [...topics];
                      next[idx].estimatedHours = e.target.value;
                      setTopics(next);
                    }}
                    className="w-full bg-transparent border-none outline-none font-bold text-sm"
                  />
                </div>
                <button onClick={() => removeTopic(idx)} className="p-2 text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sección Evaluaciones */}
      <section className="glass-panel p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-surface-border">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 sm:mb-8">
           <h3 className="text-base sm:text-xl font-bold flex items-center gap-2">
             <Calendar className="w-5 h-5 text-accent" /> Plan de Evaluaciones
           </h3>
           <button onClick={addEval} className="text-xs sm:text-sm font-bold bg-accent/10 text-accent px-4 py-2 rounded-xl hover:bg-accent hover:text-white transition-all w-full sm:w-auto text-center">
             + Añadir Evaluación
           </button>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {evaluations.map((ev, idx) => (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-background/50 rounded-xl sm:rounded-2xl border border-surface-border sm:items-end group">
              <div className="flex-1 space-y-1.5 sm:space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Evaluación</label>
                <input 
                  value={ev.title}
                  onChange={(e) => {
                    const next = [...evaluations];
                    next[idx].title = e.target.value;
                    setEvaluations(next);
                  }}
                  placeholder="Ej: Primer Parcial"
                  className="w-full bg-transparent border-none outline-none font-bold placeholder:text-foreground/20 text-sm"
                />
              </div>
              <div className="flex items-end gap-3">
                <div className="w-36 sm:w-40 space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Fecha</label>
                  <input 
                    type="date"
                    value={ev.date}
                    onChange={(e) => {
                      const next = [...evaluations];
                      next[idx].date = e.target.value;
                      setEvaluations(next);
                    }}
                    className="w-full bg-transparent border-none outline-none font-bold text-sm"
                  />
                </div>
                <div className="w-16 sm:w-20 space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Peso %</label>
                  <input 
                    type="number"
                    value={ev.weight}
                    onChange={(e) => {
                      const next = [...evaluations];
                      next[idx].weight = e.target.value;
                      setEvaluations(next);
                    }}
                    className="w-full bg-transparent border-none outline-none font-bold text-accent text-sm"
                  />
                </div>
                <button onClick={() => removeEval(idx)} className="p-2 text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {error && (
        <p className="text-center text-red-500 font-bold bg-red-500/10 py-3 rounded-xl sm:rounded-2xl border border-red-500/20 text-sm">{error}</p>
      )}

      <div className="flex justify-center">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-primary text-white font-black rounded-2xl sm:rounded-[2rem] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6" /> Guardar y Generar Código QR</>}
        </button>
      </div>
    </div>
  );
}
