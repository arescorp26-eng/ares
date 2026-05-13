'use client';

import { useState } from 'react';
import { Users, BookOpen, LayoutDashboard, UserPlus, GraduationCap, Activity, ShieldCheck, Mail, Loader2, ChevronRight, Star, Zap, Trophy, Brain, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerAction } from '@/lib/actions/auth';
import DashboardShell from '@/components/DashboardShell';

type View = 'overview' | 'professors' | 'students' | 'subjects';

interface Props {
  stats: { totalProfessors: number; totalStudents: number; totalSubjects: number; totalQuizzes: number };
  professors: any[];
  students: any[];
  subjects: any[];
  recentActivity: any[];
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border flex items-center justify-between shadow-md hover:shadow-lg transition-all group`}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1">{label}</p>
        <p className="text-3xl sm:text-4xl font-black">{value}</p>
      </div>
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg`}>
        {icon}
      </div>
    </div>
  );
}

function AddProfessorModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    fd.append('role', 'PROFESSOR');
    const result = await registerAction(fd, false);
    setLoading(false);
    if (result?.error) {
      setMsg({ type: 'error', text: result.error });
    } else {
      setMsg({ type: 'success', text: '¡Profesor registrado! Recarga para ver los cambios.' });
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-cosmos/60 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Nuevo Profesor</h3>
          <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1.5 block">Nombre</label>
            <input name="name" type="text" placeholder="Ej. Dr. María López" required className="w-full bg-background border border-surface-border rounded-xl py-3 px-4 outline-none focus:border-primary text-sm transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input name="email" type="email" placeholder="profesor@ares.edu" required className="w-full bg-background border border-surface-border rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary text-sm transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1.5 block">Contraseña temporal</label>
            <input name="password" type="password" placeholder="Mín. 8 caracteres" required minLength={8} className="w-full bg-background border border-surface-border rounded-xl py-3 px-4 outline-none focus:border-primary text-sm transition-colors" />
          </div>
          {msg && (
            <p className={`p-3 rounded-xl text-xs font-bold text-center ${msg.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{msg.text}</p>
          )}
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-ares text-white font-black rounded-xl shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Cuenta'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function AdminDashboard({ stats, professors, students, subjects, recentActivity }: Props) {
  const [view, setView] = useState<View>('overview');
  const [showModal, setShowModal] = useState(false);
  const [searchP, setSearchP] = useState('');
  const [searchS, setSearchS] = useState('');

  const navItems = [
    { id: 'overview', label: 'Resumen', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'professors', label: 'Profesores', icon: <Users className="w-5 h-5" /> },
    { id: 'students', label: 'Estudiantes', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'subjects', label: 'Materias', icon: <BookOpen className="w-5 h-5" /> },
  ];

  const filteredProfessors = professors.filter(p =>
    `${p.name} ${p.email}`.toLowerCase().includes(searchP.toLowerCase())
  );
  const filteredStudents = students.filter(s =>
    `${s.name} ${s.email}`.toLowerCase().includes(searchS.toLowerCase())
  );

  const avgScore = students.length > 0
    ? Math.round(students.flatMap((s: any) => s.quizResults).reduce((a: number, r: any) => a + r.score, 0) / Math.max(students.flatMap((s: any) => s.quizResults).length, 1))
    : 0;

  return (
    <>
      <DashboardShell
        title="Ares Admin"
        navItems={navItems}
        activeView={view}
        onViewChange={v => setView(v as View)}
        headerRight={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold ring-1 ring-green-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </div>
        }
      >
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ────────────────────────────────────── */}
          {view === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <header>
                <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-gradient uppercase">Panel General</h2>
                <p className="text-foreground/50 text-sm mt-1">Vista completa del estado de la plataforma Ares.</p>
              </header>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Profesores" value={stats.totalProfessors} icon={<Users className="w-6 h-6 text-white" />} color="bg-primary" />
                <StatCard label="Estudiantes" value={stats.totalStudents} icon={<GraduationCap className="w-6 h-6 text-white" />} color="bg-accent" />
                <StatCard label="Materias" value={stats.totalSubjects} icon={<BookOpen className="w-6 h-6 text-white" />} color="bg-gradient-ares" />
                <StatCard label="Quizzes IA" value={stats.totalQuizzes} icon={<Brain className="w-6 h-6 text-white" />} color="bg-violet-500" />
              </div>

              {/* Extra KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-surface-border shadow-md">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1">Promedio Quiz</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-primary">{avgScore}%</span>
                    <TrendingUp className="w-5 h-5 text-green-500 mb-1" />
                  </div>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-surface-border shadow-md">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1">Top Estudiante XP</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-accent">{students[0]?.xp ?? 0}</span>
                    <Trophy className="w-5 h-5 text-accent mb-1" />
                  </div>
                  <p className="text-xs text-foreground/40 mt-1 truncate">{students[0]?.name ?? '—'}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-surface-border shadow-md">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1">Materias activas</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black">{subjects.filter((s: any) => s._count.enrollments > 0).length}</span>
                    <Activity className="w-5 h-5 text-primary mb-1" />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-tighter mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Actividad Reciente</h3>
                <div className="space-y-2">
                  {recentActivity.length === 0 && (
                    <div className="glass-panel p-8 rounded-2xl border border-dashed border-surface-border text-center text-foreground/40 text-sm">Sin actividad registrada aún.</div>
                  )}
                  {recentActivity.map((a: any) => (
                    <div key={a.id} className="glass-panel px-4 py-3 rounded-xl border border-surface-border flex items-center justify-between gap-3 shadow-sm hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{a.user?.name ?? 'Estudiante'}</p>
                          <p className="text-[10px] text-foreground/40 truncate">{a.quiz?.title} · {a.quiz?.subject?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-black ${a.score >= 70 ? 'text-green-500' : a.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{Math.round(a.score)}%</span>
                        <span className="text-[10px] text-accent font-bold">+{a.xpGained} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PROFESSORS ──────────────────────────────────── */}
          {view === 'professors' && (
            <motion.div key="professors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black italic tracking-tighter text-gradient uppercase">Profesores</h2>
                  <p className="text-foreground/50 text-sm mt-1">{stats.totalProfessors} docentes registrados</p>
                </div>
                <button onClick={() => setShowModal(true)} className="px-5 py-3 bg-gradient-ares text-white font-black rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/20 text-sm">
                  <UserPlus className="w-4 h-4" /> Agregar Profesor
                </button>
              </header>

              <input value={searchP} onChange={e => setSearchP(e.target.value)} placeholder="Buscar por nombre o email..." className="w-full bg-surface border border-surface-border rounded-xl py-3 px-4 outline-none focus:border-primary text-sm transition-colors" />

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProfessors.length === 0 && (
                  <div className="col-span-full glass-panel p-10 rounded-2xl border border-dashed border-surface-border text-center text-foreground/40 text-sm">No hay profesores registrados.</div>
                )}
                {filteredProfessors.map((p: any) => (
                  <div key={p.id} className="glass-panel p-5 rounded-2xl border border-surface-border hover:border-primary/40 transition-all shadow-md">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-11 h-11 bg-gradient-ares text-white rounded-2xl flex items-center justify-center font-black text-lg shrink-0">
                        {(p.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black truncate">{p.name || 'Sin nombre'}</h4>
                        <p className="text-xs text-foreground/40 truncate">{p.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground/50">{p.subjectsCreated?.length ?? 0} materias</span>
                      <span className="font-bold text-foreground/50">
                        {p.subjectsCreated?.reduce((a: number, s: any) => a + (s._count?.enrollments ?? 0), 0) ?? 0} alumnos totales
                      </span>
                    </div>
                    {p.subjectsCreated?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {p.subjectsCreated.slice(0, 3).map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between px-3 py-1.5 bg-primary/5 rounded-lg">
                            <span className="text-[11px] font-bold truncate text-primary/80">{s.name}</span>
                            <span className="text-[10px] text-foreground/40 shrink-0 ml-2">{s._count?.enrollments ?? 0} est.</span>
                          </div>
                        ))}
                        {p.subjectsCreated.length > 3 && <p className="text-[10px] text-foreground/30 text-center">+{p.subjectsCreated.length - 3} más</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STUDENTS ────────────────────────────────────── */}
          {view === 'students' && (
            <motion.div key="students" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <header>
                <h2 className="text-3xl font-black italic tracking-tighter text-gradient uppercase">Estudiantes</h2>
                <p className="text-foreground/50 text-sm mt-1">{stats.totalStudents} estudiantes · ordenados por XP</p>
              </header>

              <input value={searchS} onChange={e => setSearchS(e.target.value)} placeholder="Buscar por nombre o email..." className="w-full bg-surface border border-surface-border rounded-xl py-3 px-4 outline-none focus:border-primary text-sm transition-colors" />

              <div className="space-y-3">
                {filteredStudents.length === 0 && (
                  <div className="glass-panel p-10 rounded-2xl border border-dashed border-surface-border text-center text-foreground/40 text-sm">No hay estudiantes registrados.</div>
                )}
                {filteredStudents.map((s: any, i: number) => {
                  const avgQ = s.quizResults?.length > 0
                    ? Math.round(s.quizResults.reduce((a: number, r: any) => a + r.score, 0) / s.quizResults.length)
                    : null;
                  return (
                    <div key={s.id} className="glass-panel p-4 sm:p-5 rounded-2xl border border-surface-border hover:border-primary/30 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${i === 0 ? 'bg-yellow-500 text-cosmos' : i === 1 ? 'bg-gray-400 text-cosmos' : i === 2 ? 'bg-orange-500 text-white' : 'bg-primary/10 text-primary'}`}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-sm truncate">{s.name || 'Sin nombre'}</h4>
                          <p className="text-[10px] text-foreground/40 truncate">{s.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-xl">
                          <Zap className="w-3.5 h-3.5 text-primary" />
                          <span className="font-black text-primary">Nv.{s.level}</span>
                          <span className="text-foreground/40">{s.xp} XP</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/5 rounded-xl">
                          <Star className="w-3.5 h-3.5 text-accent" />
                          <span className="font-black text-accent">{s.streak}d</span>
                          <span className="text-foreground/40">racha</span>
                        </div>
                        {avgQ !== null && (
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${avgQ >= 70 ? 'bg-green-500/10 text-green-500' : avgQ >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                            <Brain className="w-3.5 h-3.5" />
                            <span className="font-black">{avgQ}%</span>
                            <span className="opacity-60">{s.quizResults.length} quiz{s.quizResults.length !== 1 ? 'zes' : ''}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-surface-border rounded-xl text-foreground/50">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span className="font-bold">{s.enrollments?.length ?? 0} mat.</span>
                        </div>
                      </div>

                      {/* XP bar */}
                      <div className="w-full sm:w-28 shrink-0">
                        <div className="h-1.5 bg-background rounded-full overflow-hidden border border-surface-border">
                          <div className="h-full bg-gradient-ares-accent rounded-full" style={{ width: `${Math.min((s.xp % 1000) / 10, 100)}%` }} />
                        </div>
                        <p className="text-[9px] text-foreground/30 mt-0.5 text-right">{s.xp % 1000}/1000 XP</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── SUBJECTS ────────────────────────────────────── */}
          {view === 'subjects' && (
            <motion.div key="subjects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <header>
                <h2 className="text-3xl font-black italic tracking-tighter text-gradient uppercase">Materias</h2>
                <p className="text-foreground/50 text-sm mt-1">{stats.totalSubjects} materias en la plataforma</p>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {subjects.length === 0 && (
                  <div className="col-span-full glass-panel p-10 rounded-2xl border border-dashed border-surface-border text-center text-foreground/40 text-sm">No hay materias creadas aún.</div>
                )}
                {subjects.map((s: any) => (
                  <div key={s.id} className="glass-panel p-5 rounded-2xl border border-surface-border hover:border-primary/40 transition-all shadow-md flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-ares text-white rounded-xl flex items-center justify-center font-black shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black truncate">{s.name}</h4>
                        <p className="text-[11px] text-foreground/40 truncate">Prof. {s.professor?.name ?? '—'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        { label: 'Estudiantes', val: s._count?.enrollments ?? 0, color: 'text-primary' },
                        { label: 'Documentos', val: s._count?.documents ?? 0, color: 'text-accent' },
                        { label: 'Evaluaciones', val: s._count?.evaluations ?? 0, color: 'text-yellow-500' },
                        { label: 'Quizzes', val: s._count?.quizzes ?? 0, color: 'text-violet-500' },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="px-3 py-2 bg-background rounded-xl border border-surface-border flex flex-col">
                          <span className="text-foreground/40 uppercase tracking-widest text-[9px] font-bold">{label}</span>
                          <span className={`text-lg font-black ${color}`}>{val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-foreground/30">
                      <ChevronRight className="w-3 h-3" />
                      <span>Creada {new Date(s.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </DashboardShell>

      <AnimatePresence>
        {showModal && (
          <AddProfessorModal
            onClose={() => setShowModal(false)}
            onSuccess={() => window.location.reload()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
