'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const DAYS = [
  { id: 1, name: 'Lun' },
  { id: 2, name: 'Mar' },
  { id: 3, name: 'Mié' },
  { id: 4, name: 'Jue' },
  { id: 5, name: 'Vie' },
  { id: 6, name: 'Sáb' },
  { id: 0, name: 'Dom' },
];

const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function AvailabilityManager({ initialData = [] }: { initialData?: any[] }) {
  const [availability, setAvailability] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const addSlot = (dayOfWeek: number) => {
    setAvailability([...availability, { dayOfWeek, startTime: '08:00', endTime: '10:00' }]);
  };

  const removeSlot = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: string, value: string) => {
    const newData = [...availability];
    newData[index][field] = value;
    setAvailability(newData);
  };

  const handleSave = async () => {
    if (availability.length === 0) {
      setMsg('Agrega al menos un horario antes de guardar.');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const resp = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: availability }),
        credentials: 'include'
      });
      const data = await resp.json();
      if (resp.ok) {
        if (data.details?.needsEnrollment) {
          setMsg('¡Disponibilidad guardada! Inscríbete en una materia para generar tu plan de estudio.');
        } else {
          const sessionsCount = data.details?.sessionsCount || 0;
          if (sessionsCount > 0) {
            setMsg(`¡Disponibilidad guardada! Ares generó ${sessionsCount} sesiones de estudio. Redirigiendo...`);
            setTimeout(() => window.location.reload(), 2000);
          } else {
            setMsg('Disponibilidad guardada. Agrega temas a tus materias para generar el plan.');
          }
        }
      } else {
        setMsg(data.error || 'Error al guardar.');
      }
    } catch (e) {
      setMsg('Error de conexión.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Mobile: vertical list layout / Desktop: grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {DAYS.map((day) => (
          <div key={day.id} className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-surface-border">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h4 className="font-bold text-primary text-sm sm:text-base">
                <span className="sm:hidden">{day.name}</span>
                <span className="hidden sm:inline">{DAYS_FULL[day.id]}</span>
              </h4>
              <button 
                onClick={() => addSlot(day.id)}
                className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {availability.filter(a => a.dayOfWeek === day.id).map((slot) => {
                const globalIdx = availability.indexOf(slot);
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={globalIdx} 
                    className="flex items-center gap-2 p-2.5 sm:p-3 bg-background/50 rounded-xl sm:rounded-2xl border border-surface-border group"
                  >
                    <div className="flex-1 space-y-1">
                       <input 
                        type="time" 
                        value={slot.startTime} 
                        onChange={(e) => updateSlot(globalIdx, 'startTime', e.target.value)}
                        className="bg-transparent border-none text-xs font-bold outline-none w-full"
                       />
                       <input 
                        type="time" 
                        value={slot.endTime} 
                        onChange={(e) => updateSlot(globalIdx, 'endTime', e.target.value)}
                        className="bg-transparent border-none text-xs font-bold outline-none w-full opacity-40"
                       />
                    </div>
                    <button onClick={() => removeSlot(globalIdx)} className="text-red-500 p-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                       <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
              
              {availability.filter(a => a.dayOfWeek === day.id).length === 0 && (
                <p className="text-[10px] text-foreground/30 text-center py-2 font-bold uppercase">No hay bloques</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 sm:gap-4">
        {msg && <p className="text-xs sm:text-sm font-bold text-primary bg-primary/5 px-4 sm:px-6 py-2 rounded-full border border-primary/10 text-center">{msg}</p>}
        
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-primary text-white font-black rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar y Generar Calendario</>}
        </button>
      </div>
    </div>
  );
}
