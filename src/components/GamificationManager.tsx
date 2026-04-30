'use client';

import { motion } from 'framer-motion';
import { Award, Zap, Book, Brain, Flame, Star, Trophy, Target } from 'lucide-react';

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  xpBonus: number;
}

interface GamificationManagerProps {
  user: any;
  achievements: Achievement[];
  userAchievements: number[]; // IDs de medallas obtenidas
}

// Mapa de iconos de Lucide
const icons: Record<string, any> = {
  Zap, Book, Brain, Flame, Star, Trophy, Target
};

export default function GamificationManager({ user, achievements, userAchievements }: GamificationManagerProps) {
  const nextLevelXP = user.level * 1000;
  const currentLevelXP = user.xp % 1000;
  const progressPercent = (currentLevelXP / 1000) * 100;

  return (
    <div className="space-y-8">
      {/* Level Card */}
      <div className="glass-panel p-8 rounded-[2.5rem] border border-surface-border bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
            <Trophy className="w-40 h-40" />
         </div>
         
         <div className="flex items-center gap-6 mb-8 relative z-10">
            <div className="w-20 h-20 bg-primary text-white rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl shadow-primary/40 rotate-3 group-hover:rotate-0 transition-transform">
               {user.level}
            </div>
            <div>
               <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-1">Tu Rango Actual</h3>
               <p className="text-2xl font-black italic tracking-tighter">ESTUDIANTE MAESTRO</p>
            </div>
         </div>

         <div className="relative z-10 space-y-3">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-foreground/40">
               <span>Progreso de Nivel</span>
               <span>{currentLevelXP} / 1000 XP</span>
            </div>
            <div className="h-4 bg-background/50 rounded-full border border-surface-border p-1 overflow-hidden">
               <motion.div 
                 className="h-full bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]"
                 initial={{ width: 0 }}
                 animate={{ width: `${progressPercent}%` }}
               />
            </div>
         </div>
      </div>

      {/* Badges Inventory */}
      <div className="space-y-6">
         <h4 className="text-lg font-black italic tracking-tighter flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" /> SALÓN DE MEDALLAS
         </h4>
         
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {achievements.map((a) => {
               const isUnlocked = userAchievements.includes(a.id);
               const IconComp = icons[a.icon] || Star;
               
               return (
                 <div key={a.id} className={`p-4 rounded-3xl border text-center transition-all ${isUnlocked ? 'bg-surface border-accent shadow-lg shadow-accent/5' : 'bg-surface/30 border-surface-border opacity-40 greyscale'}`}>
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center ${isUnlocked ? 'bg-accent/10 text-accent' : 'bg-foreground/5 text-foreground/20'}`}>
                       <IconComp className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-black uppercase leading-tight mb-1">{a.name}</p>
                    <p className="text-[8px] text-foreground/40 leading-tight">{a.description}</p>
                 </div>
               );
            })}
         </div>
      </div>
    </div>
  );
}
