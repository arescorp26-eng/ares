'use client';

import { useState } from 'react';
import { Plus, Book, QrCode, ChevronRight, LayoutDashboard, ArrowLeft, Sparkles, Edit3, ArrowRight, Loader2, Edit, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/FileUpload';
import ManualPlanBuilder from '@/components/ManualPlanBuilder';
import SubjectPlanExport from '@/components/SubjectPlanExport';
import { QRCodeSVG } from 'qrcode.react';
import DashboardShell from '@/components/DashboardShell';

type ViewState = 'list' | 'create' | 'success' | 'edit';
type StepState = 'name' | 'method' | 'content';
type MethodState = 'ai' | 'manual' | null;

export default function ProfessorDashboard({ subjects = [] }: { subjects?: any[] }) {
  const router = useRouter();
  const [view, setView] = useState<ViewState>('list');
  const [step, setStep] = useState<StepState>('name');
  const [method, setMethod] = useState<MethodState>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [activeSubject, setActiveSubject] = useState<any>(null);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState<'manual' | 'ai'>('manual');

  const resetWizard = () => {
    setView('list');
    setStep('name');
    setMethod(null);
    setSubjectName('');
    setSubjectId(null);
    setActiveSubject(null);
    setEditMode('manual');
  };

  const handleCreateEmptySubject = async () => {
    if (!subjectName) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subjectName }),
        credentials: 'include'
      });
      const data = await resp.json();
      if (resp.ok) {
        setSubjectId(data.id);
        setStep('method');
        // Refrescar datos del servidor para que la lista se actualice
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleEditClick = (sub: any) => {
    setActiveSubject(sub);
    setSubjectName(sub.name);
    setSubjectId(sub.id);
    setView('edit');
  };

  const handleProcessComplete = (result: any) => {
    setLastAnalysis(result.data);
    setView('success');
    router.refresh();
  };

  const enrollmentLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/enroll/${subjectId}`;

  const navItems = [
    { id: 'list', label: 'Mis Materias', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'create', label: 'Nueva Materia', icon: <Plus className="w-5 h-5" /> },
  ];

  const handleViewChange = (v: string) => {
    if (v === 'create') {
      resetWizard();
      setView('create');
    } else {
      setView(v as ViewState);
    }
  };

  return (
    <DashboardShell
      title="Ares Docente"
      navItems={navItems}
      activeView={view === 'edit' || view === 'success' ? 'list' : view}
      onViewChange={handleViewChange}
    >
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase text-gradient">TUS MATERIAS</h2>
              <button onClick={() => { resetWizard(); setView('create'); }} className="px-5 sm:px-6 py-3 bg-gradient-ares text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all text-sm w-full sm:w-auto">
                <Plus className="w-5 h-5" /> Crear Nueva
              </button>
            </header>

            {subjects.length === 0 ? (
              <div className="glass-panel p-10 sm:p-20 rounded-2xl sm:rounded-[3rem] text-center border border-dashed border-surface-border shadow-lg">
                <Book className="w-12 sm:w-16 h-12 sm:h-16 text-primary/30 mx-auto mb-4 sm:mb-6" />
                <h3 className="text-lg sm:text-xl font-bold mb-2 uppercase italic font-black text-gradient">Comienza tu viaje académico</h3>
                <p className="text-foreground/50 mb-8 max-w-sm mx-auto text-sm">Crea tu primera materia y deja que la IA organice el calendario por ti.</p>
              </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {subjects.map((sub: any) => (
                    <div key={sub.id} className="glass-panel p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-surface-border hover:border-primary/40 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[220px] shadow-md hover:shadow-lg">
                       <div>
                         <div className="flex justify-between items-start mb-3 sm:mb-4">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-ares text-white rounded-xl sm:rounded-2xl flex items-center justify-group-hover:scale-110 transition-all shrink-0">
                              <Book className="w-5 sm:w-6 h-5 sm:h-6" />
                            </div>
                            <button 
                               onClick={() => handleEditClick(sub)}
                               className="p-2 text-foreground/30 hover:text-primary transition-all rounded-xl hover:bg-primary/10"
                               title="Editar Materia"
                            >
                               <Edit className="w-5 h-5" />
                            </button>
                         </div>
                         <h4 className="font-black text-lg sm:text-xl mb-4 sm:mb-6 truncate">{sub.name}</h4>
                       </div>

                       <div className="flex flex-wrap gap-2 relative z-10 mt-auto">
                          <SubjectPlanExport subject={sub} />
                          <button 
                            onClick={() => { setSubjectId(sub.id); setView('success'); }} 
                            className="flex-1 py-2.5 sm:py-3 bg-gradient-ares text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 hover:shadow-lg transition-all min-w-[120px]"
                          >
                             <QrCode className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> QR Inscripción
                          </button>
                          <button 
                            onClick={() => handleEditClick(sub)}
                            className="p-2.5 sm:p-3 bg-surface border-2 border-surface-border text-foreground hover:border-primary hover:text-primary rounded-xl transition-all"
                            title="Editar Plan Directamente"
                          >
                             <Edit3 className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            )}
          </motion.div>
        )}

        {view === 'edit' && activeSubject && (
          <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
             <button onClick={() => setView('list')} className="flex items-center gap-2 text-foreground/40 font-bold mb-6 sm:mb-8 hover:text-foreground transition-all text-sm">
                <ArrowLeft className="w-5 h-5" /> Volver a la Lista
             </button>

              <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10">
                 <header className="text-center">
                   <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter text-gradient">EDITAR MATERIA</h2>
                   <p className="text-foreground/60 mt-2 font-medium text-sm">Modifica el nombre o ajusta el plan de estudio.</p>
                 </header>

                 <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-4">
                    <button 
                       onClick={() => setEditMode('manual')}
                       className={`px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest transition-all w-full sm:w-auto ${editMode === 'manual' ? 'bg-gradient-ares text-white shadow-lg' : 'bg-surface text-foreground/50 hover:bg-primary/10 hover:text-primary border-2 border-surface-border'}`}
                    >
                       Constructor Manual
                    </button>
                    <button 
                       onClick={() => setEditMode('ai')}
                       className={`px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest transition-all w-full sm:w-auto ${editMode === 'ai' ? 'bg-gradient-ares text-white shadow-lg' : 'bg-surface text-foreground/50 hover:bg-primary/10 hover:text-primary border-2 border-surface-border'}`}
                    >
                       Importar desde PDF (IA)
                    </button>
                 </div>

                 <div className="glass-panel p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-surface-border shadow-lg">
                   <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 block">Nombre de la Materia</label>
                   <input 
                     value={subjectName}
                     onChange={(e) => setSubjectName(e.target.value)}
                     className="w-full bg-background border-2 border-surface-border p-4 sm:p-6 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-black outline-none focus:border-primary transition-all"
                   />
                 </div>

                {editMode === 'manual' ? (
                  <ManualPlanBuilder 
                    subjectId={subjectId!} 
                    initialTopics={activeSubject.documents?.[0]?.topics?.map((t: any) => ({ name: t.name, difficulty: t.difficulty, estimatedHours: t.estimatedHours }))}
                    initialEvaluations={activeSubject.evaluations?.map((ev: any) => ({ title: ev.title, date: new Date(ev.date).toISOString().split('T')[0], weight: ev.weight }))}
                    onComplete={() => { router.refresh(); resetWizard(); setView('list'); }}
                  />
                ) : (
                  <div className="space-y-6">
                      <h3 className="text-lg sm:text-xl font-black text-center mb-4 sm:mb-6 italic uppercase">Actualizar plan con PDF</h3>
                      <FileUpload subjectId={subjectId} onUploadComplete={() => { router.refresh(); resetWizard(); setView('list'); }} />
                  </div>
                )}
             </div>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
             <button onClick={() => setView('list')} className="flex items-center gap-2 text-foreground/40 font-bold mb-6 sm:mb-8 hover:text-foreground transition-all text-sm">
                <ArrowLeft className="w-5 h-5" /> Cancelar
             </button>

             <div className="max-w-2xl mx-auto">
                 {/* Step 1: Name */}
                 {step === 'name' && (
                   <div className="space-y-6 sm:space-y-8 text-center">
                      <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase text-gradient">¿CÓMO SE LLAMA TU MATERIA?</h2>
                      <div className="relative">
                       <input 
                         autoFocus
                         value={subjectName}
                         onChange={(e) => setSubjectName(e.target.value)}
                         placeholder="Ej: Matemática I, Diseño Digital..."
                         className="w-full bg-surface border-2 border-surface-border p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] text-lg sm:text-2xl font-black outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-center shadow-lg"
                       />
                      </div>
                      <button 
                       disabled={!subjectName || loading}
                       onClick={handleCreateEmptySubject}
                       className="w-full sm:w-auto px-10 sm:px-12 py-4 sm:py-5 bg-gradient-ares text-white font-black rounded-2xl sm:rounded-3xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all text-lg sm:text-xl flex items-center gap-3 mx-auto justify-center disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Continuar <ArrowRight className="w-6 h-6" /></>}
                      </button>
                   </div>
                 )}

                 {/* Step 2: Method */}
                 {step === 'method' && (
                   <div className="space-y-6 sm:space-y-10">
                      <header className="text-center">
                         <h2 className="text-2xl sm:text-3xl font-black italic text-gradient">{subjectName}</h2>
                         <p className="text-foreground/60 mt-2 font-medium uppercase tracking-widest text-[10px] sm:text-xs">Elige el método de configuración</p>
                      </header>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                         <button 
                           onClick={() => { setMethod('ai'); setStep('content'); }}
                           className="p-6 sm:p-8 glass-panel rounded-2xl sm:rounded-[2.5rem] border-2 border-surface-border hover:border-primary hover:shadow-lg transition-all text-center group"
                         >
                            <div className="w-14 sm:w-16 h-14 sm:h-16 bg-gradient-ares text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform shadow-lg">
                               <Sparkles className="w-7 sm:w-8 h-7 sm:h-8" />
                            </div>
                            <h4 className="text-lg sm:text-xl font-bold mb-2 italic uppercase font-black text-gradient">Ares IA</h4>
                            <p className="text-xs text-foreground/50 font-bold">Analiza tu PDF y extrae el plan automáticamente.</p>
                         </button>

                         <button 
                           onClick={() => { setMethod('manual'); setStep('content'); }}
                           className="p-6 sm:p-8 glass-panel rounded-2xl sm:rounded-[2.5rem] border-2 border-surface-border hover:border-accent hover:shadow-lg transition-all text-center group"
                         >
                            <div className="w-14 sm:w-16 h-14 sm:h-16 bg-gradient-ares-accent text-cosmos rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform shadow-lg">
                               <Edit3 className="w-7 sm:w-8 h-7 sm:h-8" />
                            </div>
                            <h4 className="text-lg sm:text-xl font-bold mb-2 italic uppercase font-black text-gradient">Constructor Manual</h4>
                            <p className="text-xs text-foreground/50 font-bold">Arma el plan paso a paso tú mismo.</p>
                         </button>
                      </div>
                   </div>
                 )}

                {/* Step 3: Content */}
                {step === 'content' && (
                  <div>
                     <button onClick={() => setStep('method')} className="flex items-center gap-2 text-foreground/40 font-bold mb-6 sm:mb-8 hover:text-foreground transition-all text-sm">
                        <ArrowLeft className="w-5 h-5" /> Cambiar método
                     </button>

                     {method === 'ai' ? (
                       <div className="space-y-6">
                          <h3 className="text-xl sm:text-2xl font-black text-center mb-6 sm:mb-8 italic uppercase tracking-tighter">Sube tu documento</h3>
                          <FileUpload subjectId={subjectId} onUploadComplete={handleProcessComplete} />
                       </div>
                     ) : (
                       <ManualPlanBuilder subjectId={subjectId!} onComplete={handleProcessComplete} />
                     )}
                  </div>
                )}
             </div>
          </motion.div>
        )}

        {view === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center px-2">
             <div className="glass-panel p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 text-center max-w-2xl w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-5 hidden sm:block text-primary">
                  <QrCode className="w-40 sm:w-60 h-40 sm:h-60" />
                </div>
                
                <div className="mb-6 sm:mb-8">
                   <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gradient-ares text-white rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <QrCode className="w-8 sm:w-10 h-8 sm:h-10" />
                   </div>
                   <h2 className="text-2xl sm:text-3xl font-black mb-2 text-gradient tracking-tight italic uppercase">¡ Materia Lista !</h2>
                   <p className="font-bold text-foreground/60 text-base sm:text-lg">{subjectName || lastAnalysis?.title}</p>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] inline-block shadow-2xl mb-6 sm:mb-8 border-[8px] sm:border-[12px] border-white ring-1 ring-surface-border">
                   {subjectId && <QRCodeSVG value={enrollmentLink} size={typeof window !== 'undefined' && window.innerWidth < 640 ? 180 : 220} level="H" includeMargin />}
                </div>

                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-10">
                   <p className="text-[10px] sm:text-xs font-black text-foreground/50 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Link de Inscripción Directo</p>
                   <div className="p-3 sm:p-4 bg-background/50 rounded-xl sm:rounded-2xl border-2 border-surface-border font-mono text-xs sm:text-sm break-all select-all cursor-pointer">
                      {enrollmentLink}
                   </div>
                </div>

                <button 
                  onClick={() => setView('list')}
                  className="w-full py-4 sm:py-5 bg-gradient-ares text-white font-black rounded-xl sm:rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-base sm:text-lg"
                >
                  Finalizar y Ver Materias
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
