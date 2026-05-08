'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutDashboard, BookOpen, QrCode, Clock, Plus, Zap, Calendar as CalendarIcon, Settings, CheckCircle2, Brain, Loader2, Award, Camera, CameraOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import AvailabilityManager from '@/components/AvailabilityManager';
import GamificationManager from '@/components/GamificationManager';
import QuizInterface from '@/components/QuizInterface';
import DashboardShell from '@/components/DashboardShell';

export default function StudentDashboard({ 
  enrollments = [], 
  initialAvailability = [],
  initialSessions = [],
  gamification = null 
}: { 
  enrollments?: any[],
  initialAvailability?: any[],
  initialSessions?: any[],
  gamification?: any
}) {
  const [view, setView] = useState<'overview' | 'calendar' | 'availability' | 'scanner' | 'medals'>('overview');
  const [sessions, setSessions] = useState(initialSessions);
  const [userData, setUserData] = useState(gamification?.user || { xp: 0, level: 1, streak: 0 });
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const router = useRouter();

  // Gestión de Notificaciones del Navegador
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Escáner QR - Implementación robusta con Html5Qrcode directo
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraContainerId = 'qr-camera-container';
  const [scannerState, setScannerState] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
  const [scannerError, setScannerError] = useState('');
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  const checkCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      setHasCamera(devices.length > 0);
      if (devices.length > 0 && !selectedCamera) {
        const rearCamera = devices.find((d: any) => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(rearCamera?.id || devices[0].id);
      }
    } catch (e) {
      setHasCamera(false);
    }
  }, [selectedCamera]);

  const startScanner = useCallback(async () => {
    if (!selectedCamera) return;
    setScannerState('starting');
    setScannerError('');

    try {
      // Limpiar scanner anterior si existe
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch (e) { /* ignore */ }
      }

      // Limpiar el contenedor de cualquier hijo de React antes de iniciar
      const container = document.getElementById(cameraContainerId);
      if (!container) return;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const qr = new Html5Qrcode(cameraContainerId);
      scannerRef.current = qr;

      await qr.start(
        selectedCamera,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText: string) => {
          qr.stop().catch(() => {});
          setScannerState('idle');
          processScannedCode(decodedText);
        },
        () => {}
      );
      setScannerState('scanning');
    } catch (e: any) {
      console.error('Error starting scanner:', e);
      setScannerError(e.message || 'No se pudo iniciar la cámara');
      setScannerState('error');
    }
  }, [selectedCamera]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) { /* ignore */ }
      scannerRef.current = null;
    }
    // Limpiar el contenedor al detener
    const container = document.getElementById(cameraContainerId);
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
    setScannerState('idle');
  }, []);

  const processScannedCode = async (decodedText: string) => {
    // Intentar extraer subjectId de la URL
    let subjectId: number | null = null;
    
    // Formato: https://domain/enroll/123
    const enrollMatch = decodedText.match(/\/enroll\/(\d+)/);
    if (enrollMatch) {
      subjectId = parseInt(enrollMatch[1]);
    } else {
      // Intentar parsear como número directo
      const num = parseInt(decodedText);
      if (!isNaN(num)) subjectId = num;
    }

    if (!subjectId) {
      setScannerError('Código QR no válido. Debe ser un código de inscripción Ares.');
      setScannerState('error');
      return;
    }

    // Inscribir al estudiante
    try {
      const resp = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
        credentials: 'include'
      });
      const data = await resp.json();
      
      if (resp.ok && data.success) {
        // Recargar para ver la nueva materia
        window.location.href = '/dashboard/student';
      } else {
        setScannerError(data.error || 'Error al inscribirse');
        setScannerState('error');
      }
    } catch (e: any) {
      setScannerError('Error de conexión. Verifica tu internet.');
      setScannerState('error');
    }
  };

  // Inicializar scanner cuando se entra a la vista
  useEffect(() => {
    if (view === 'scanner') {
      checkCameras();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [view, checkCameras, stopScanner]);

  const handleStartQuiz = async (subjectId: number, topicId?: number) => {
    setIsQuizLoading(true);
    try {
      const resp = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, topicId }),
        credentials: 'include'
      });
      const data = await resp.json();
      if (resp.ok) {
        setActiveQuiz(data);
      } else {
        alert(data.error || "No se pudo generar el quiz");
      }
    } catch (e) {
      alert("Error de conexión. Verifica tu internet.");
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleQuizComplete = (result: any) => {
    if (result.leveledUp && "Notification" in window && Notification.permission === "granted") {
      new Notification('¡Subiste de nivel!', { body: `Ahora eres Nivel ${result.level}` });
    }
    // NO cerrar el modal aquí — dejar que el usuario vea su resultado
    // El modal se cierra cuando el usuario pulsa "Cerrar Desafío" via onClose
  };

  const handleQuizClose = () => {
    setActiveQuiz(null);
    // Recargar la página para obtener datos frescos de XP y nivel
    window.location.reload();
  };

  const navItems = [
    { id: 'overview', label: 'Mi Progreso', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'medals', label: 'Mis Logros', icon: <Award className="w-5 h-5" />, accent: true },
    { id: 'calendar', label: 'Mi Calendario', icon: <CalendarIcon className="w-5 h-5" /> },
    { id: 'availability', label: 'Disponibilidad', icon: <Settings className="w-5 h-5" /> },
    { id: 'scanner', label: 'Escanear Plan', icon: <QrCode className="w-5 h-5" />, accent: true },
  ];

  return (
    <>
      <DashboardShell
        title="Ares Estudiante"
        navItems={navItems}
        activeView={view}
        onViewChange={(v) => setView(v as any)}
      >
        <AnimatePresence mode="wait">
          {view === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Header */}
              <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-10">
                <div className="min-w-0">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight flex flex-wrap items-center gap-2 sm:gap-4">
                       <span className="truncate">¡Hola, {userData.name}!</span> <span className="text-accent">⚡</span>
                       <span className="bg-primary/10 text-primary text-[10px] sm:text-xs px-3 py-1 rounded-full border border-primary/20 shrink-0">NV. {userData.level}</span>
                    </h2>
                    <p className="text-foreground/60 font-medium font-mono text-xs sm:text-sm mt-1">Llevas una racha de <span className="text-accent font-bold">{userData.streak}</span> días de estudio.</p>
                </div>
                <button onClick={() => setView('scanner')} className="bg-gradient-ares text-white font-bold px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/25 hover:scale-105 transition-all text-sm shrink-0 w-full sm:w-auto">
                    <Plus className="w-5 h-5" /> Inscribir Materia
                </button>
              </header>

              {/* XP Progress Bar */}
              <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-surface-border mb-6 sm:mb-10 flex items-center gap-4 sm:gap-6 shadow-lg">
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-ares text-white rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black shadow-xl shrink-0">
                    {userData.level}
                 </div>
                 <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase text-primary/50 tracking-widest">
                       <span>Experiencia</span>
                       <span>{userData.xp % 1000} / 1000 XP</span>
                    </div>
                    <div className="h-3 sm:h-4 bg-background border border-surface-border rounded-full p-0.5 sm:p-1 overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: `${(userData.xp % 1000) / 10}%` }} className="h-full bg-gradient-ares-accent rounded-full" />
                    </div>
                 </div>
              </div>

              {/* Stats + Quiz CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                 <div className="p-5 sm:p-8 glass-panel rounded-2xl sm:rounded-[2rem] border border-surface-border relative overflow-hidden group shadow-lg">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-primary"><CalendarIcon className="w-24 sm:w-32 h-24 sm:h-32" /></div>
                    <p className="text-[10px] sm:text-xs font-bold text-primary/50 uppercase tracking-widest mb-2 font-mono">Sesiones hoy</p>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl sm:text-5xl font-black text-primary">{sessions.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length}</span>
                        <span className="text-xs sm:text-sm font-bold text-accent mb-1">Activas</span>
                    </div>
                 </div>

                 <div className="p-5 sm:p-8 glass-panel rounded-2xl sm:rounded-[2rem] border border-surface-border sm:col-span-1 lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group overflow-hidden bg-gradient-to-br from-primary/10 to-accent/5 shadow-lg">
                    <div className="min-w-0">
                       <p className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-widest mb-1">Materia Recomendada</p>
                       <h4 className="text-lg sm:text-2xl font-black italic tracking-tighter">PREPÁRATE PARA EL QUIZ</h4>
                       <p className="text-xs sm:text-sm text-foreground/50 max-w-xs mt-1 sm:mt-2">Pon a prueba tu conocimiento con una evaluación IA y gana 250 XP.</p>
                    </div>
                    <button 
                       onClick={() => enrollments[0] && handleStartQuiz(enrollments[0].subject.id)}
                       disabled={isQuizLoading || enrollments.length === 0}
                       className="p-5 sm:p-8 bg-gradient-ares text-white rounded-2xl sm:rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex flex-row sm:flex-col items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
                    >
                       {isQuizLoading ? <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 animate-spin" /> : <Brain className="w-6 sm:w-8 h-6 sm:h-8" />}
                       <span className="text-[10px] font-black uppercase tracking-widest">Iniciar Quiz</span>
                    </button>
                 </div>
              </div>

              {/* Materias Inscritas */}
              <div className="mb-8 sm:mb-12">
                <h3 className="text-base sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 font-mono italic uppercase tracking-tighter">
                  <BookOpen className="w-5 h-5 text-primary" /> MIS MATERIAS
                </h3>
                {enrollments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    {enrollments.map((enr: any) => (
                      <div key={enr.id} className="p-4 sm:p-5 glass-panel rounded-xl sm:rounded-2xl border border-surface-border hover:border-primary/40 transition-all shadow-md hover:shadow-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-ares text-white rounded-xl flex items-center justify-center font-black shrink-0">
                            {enr.subject.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm truncate">{enr.subject.name}</h4>
                            <p className="text-[10px] text-foreground/50 uppercase tracking-widest">
                              {enr.subject.evaluations?.length || 0} evaluaciones
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleStartQuiz(enr.subject.id)}
                          className="w-full py-2.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all"
                        >
                          Iniciar Quiz
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel p-8 sm:p-10 rounded-2xl sm:rounded-[2rem] border border-dashed border-surface-border text-center">
                    <p className="text-foreground/50 font-medium italic text-sm">No estás inscrito en ninguna materia. ¡Escanea un código QR!</p>
                  </div>
                )}
              </div>

              {/* Sesiones de Hoy */}
              <h3 className="text-base sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 font-mono italic uppercase tracking-tighter">
                <Clock className="w-5 h-5 text-primary" /> TU AGENDA DE HOY
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pb-8 sm:pb-20">
                {sessions.length > 0 ? (
                  sessions.slice(0, 4).map((session: any) => (
                    <div key={session.id} className="p-4 sm:p-6 glass-panel rounded-2xl sm:rounded-3xl border border-surface-border hover:border-primary/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 group shadow-md hover:shadow-lg">
                       <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl font-black transition-all shrink-0 ${session.completed ? 'bg-accent/15 text-accent' : 'bg-primary/10 text-primary'}`}>
                             {session.completed ? <CheckCircle2 className="w-6 sm:w-8 h-6 sm:h-8" /> : session.topic.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                             <h4 className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors truncate">{session.topic.name}</h4>
                             <p className="text-[10px] sm:text-xs text-foreground/50 font-medium truncate">
                                {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Sugerido por Ares IA
                             </p>
                          </div>
                       </div>
                       <div className="flex gap-2 w-full sm:w-auto shrink-0">
                           <button 
                              onClick={() => {
                                const subId = session.topic.document?.subjectId || session.topic.quizzes?.[0]?.subjectId;
                                if (subId) handleStartQuiz(subId, session.topic.id);
                              }}
                              className="p-2.5 sm:p-3 bg-accent/15 text-accent rounded-xl hover:bg-accent hover:text-cosmos transition-all"
                           >
                             <Zap className="w-4 sm:w-5 h-4 sm:h-5" />
                          </button>
                          <button className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-ares text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all">
                             ESTUDIAR
                          </button>
                       </div>
                    </div>
                  ))
                ) : (
                   <div className="lg:col-span-2 glass-panel p-10 sm:p-20 rounded-2xl sm:rounded-[3rem] border border-dashed border-surface-border text-center">
                     <p className="text-foreground/50 font-medium italic text-sm">
                       {enrollments.length === 0 
                         ? 'No estás inscrito en ninguna materia. ¡Escanea un código QR!'
                         : initialAvailability.length === 0
                           ? 'Configura tu disponibilidad horaria para que Ares genere tu plan de estudio.'
                           : 'El plan de estudio se generará al guardar tu disponibilidad.'}
                     </p>
                     {initialAvailability.length === 0 && enrollments.length > 0 && (
                       <button onClick={() => setView('availability')} className="mt-4 px-6 py-3 bg-gradient-ares text-white font-bold rounded-xl hover:scale-105 transition-all text-sm">
                         Configurar Disponibilidad
                       </button>
                     )}
                   </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'medals' && (
            <motion.div key="medals" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
               <header className="mb-6 sm:mb-10">
                  <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase text-gradient">TU LEGADO / LOGROS</h2>
                  <p className="text-foreground/60 font-medium mt-1 text-sm">Colecciona medallas y demuestra tu disciplina.</p>
               </header>
               <GamificationManager 
                  user={userData} 
                  achievements={gamification?.achievements || []} 
                  userAchievements={gamification?.unlockedAchievementIds || []} 
               />
            </motion.div>
          )}

          {view === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
               <header className="mb-6 sm:mb-10 text-center">
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tighter italic text-gradient">AGENDA INTELIGENTE</h2>
                  <p className="text-foreground/60 font-medium max-w-lg mx-auto mt-2 text-sm">Ares optimiza tu tiempo automáticamente basándose en tus exámenes.</p>
               </header>
               <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {sessions.map((session: any) => (
                      <div key={session.id} className="p-4 sm:p-5 glass-panel rounded-xl sm:rounded-2xl border border-surface-border flex items-center justify-between border-l-4 border-l-primary group gap-3 shadow-md hover:shadow-lg transition-all">
                        <div className="flex gap-3 sm:gap-4 items-center min-w-0">
                            <div className="w-10 h-10 bg-gradient-ares text-white rounded-xl flex items-center justify-center font-black shrink-0">{session.topic.name.charAt(0)}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{session.topic.name}</p>
                              <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">{new Date(session.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <button onClick={() => {
                          const subId = session.topic.document?.subjectId || session.topic.quizzes?.[0]?.subjectId;
                          if (subId) handleStartQuiz(subId);
                        }} className="p-2 bg-accent/15 text-accent rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0 hover:bg-accent hover:text-cosmos">
                           <Brain className="w-4 h-4" />
                        </button>
                      </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="glass-panel p-10 rounded-2xl border border-dashed border-surface-border text-center">
                      <p className="text-foreground/50 italic text-sm">No hay sesiones programadas. Configura tu disponibilidad para generar tu calendario.</p>
                    </div>
                  )}
               </div>
            </motion.div>
          )}

          {view === 'availability' && (
            <motion.div key="availability" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
               <AvailabilityManager initialData={initialAvailability} />
            </motion.div>
          )}

          {view === 'scanner' && (
             <motion.div key="scanner" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center">
                <div className="max-w-sm sm:max-w-md w-full text-center space-y-6 sm:space-y-8">
                   <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter text-gradient">ESCANEAR CÓDIGO ARES</h2>
                   
                   {/* Estado: Sin cámara */}
                   {hasCamera === false && (
                     <div className="glass-panel p-8 rounded-2xl sm:rounded-[2rem] border border-red-500/20 bg-red-500/5">
                        <CameraOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-500 font-bold mb-2">No se detectó cámara</p>
                        <p className="text-foreground/50 text-xs mb-4">Asegúrate de dar permisos de cámara y usar HTTPS.</p>
                        <button onClick={() => checkCameras()} className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:scale-105 transition-all">Reintentar</button>
                     </div>
                   )}

                   {/* Estado: Seleccionar cámara */}
                   {hasCamera === true && scannerState === 'idle' && cameras.length > 1 && (
                     <div className="glass-panel p-6 rounded-2xl sm:rounded-[2rem] border border-surface-border">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3 block">Seleccionar Cámara</label>
                        <select 
                          value={selectedCamera}
                          onChange={(e) => setSelectedCamera(e.target.value)}
                          className="w-full bg-background border-2 border-surface-border p-4 rounded-xl text-sm font-bold outline-none focus:border-primary mb-4"
                        >
                          {cameras.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.label || `Cámara ${c.id.slice(0,8)}...`}</option>
                          ))}
                        </select>
                     </div>
                   )}

                   {/* Estado: Error */}
                   {scannerState === 'error' && (
                     <div className="glass-panel p-8 rounded-2xl sm:rounded-[2rem] border border-red-500/20 bg-red-500/5">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-500 font-bold mb-2 text-sm">{scannerError}</p>
                        <button onClick={() => { setScannerError(''); startScanner(); }} className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:scale-105 transition-all mt-2">Reintentar</button>
                     </div>
                   )}

                    {/* Visor de cámara */}
                    {(scannerState === 'idle' || scannerState === 'starting' || scannerState === 'scanning') && hasCamera !== false && (
                      <>
                        {/* Contenedor externo con overlays de React */}
                        <div className="w-full aspect-square glass-panel rounded-2xl sm:rounded-[3rem] border-2 border-primary/30 overflow-hidden shadow-2xl relative">
                          {/* Contenedor interno SOLO para html5-qrcode - vacío, sin hijos de React */}
                          <div id={cameraContainerId} className="w-full h-full" />
                          
                          {/* Overlays posicionados absolutamente sobre la cámara */}
                          {scannerState === 'starting' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                               <div className="flex flex-col items-center gap-3">
                                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                  <p className="text-primary font-bold text-xs uppercase tracking-widest">Iniciando cámara...</p>
                               </div>
                            </div>
                          )}
                          {scannerState === 'idle' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                               <Camera className="w-16 h-16 text-primary/30" />
                               <p className="text-foreground/50 font-bold text-sm">Presiona el botón para iniciar</p>
                            </div>
                          )}
                        </div>

                       <div className="flex gap-3 w-full">
                          {scannerState === 'scanning' ? (
                            <button onClick={stopScanner} className="flex-1 py-4 bg-red-500/10 border-2 border-red-500/20 text-red-500 font-black rounded-2xl hover:bg-red-500/20 transition-all text-sm">
                               Detener Cámara
                            </button>
                          ) : (
                            <button 
                              onClick={startScanner} 
                              disabled={!selectedCamera || scannerState === 'starting'}
                              className="flex-1 py-4 bg-gradient-ares text-white font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-sm disabled:opacity-50"
                            >
                               {scannerState === 'starting' ? 'Iniciando...' : 'Iniciar Cámara'}
                            </button>
                          )}
                          <button onClick={() => setView('overview')} className="px-6 py-4 bg-surface border-2 border-surface-border text-foreground font-black rounded-2xl hover:border-primary transition-all text-sm">
                             Cancelar
                          </button>
                       </div>
                     </>
                   )}

                   <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                     Escanea el código QR de tu profesor para inscribirte
                   </p>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </DashboardShell>

      {/* Modal Quiz / Overlays — outside DashboardShell so it covers everything */}
      <AnimatePresence>
        {activeQuiz && (
          <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-auto"
          >
             <QuizInterface 
                quiz={activeQuiz} 
                onClose={handleQuizClose} 
                onComplete={handleQuizComplete}
             />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
