'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Loader2, Award, Brain, Sparkles, HelpCircle } from 'lucide-react';

interface QuizInterfaceProps {
  quiz: any;
  onClose: () => void;
  onComplete: (result: any) => void;
}

export default function QuizInterface({ quiz, onClose, onComplete }: QuizInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const currentQuestion = quiz.questions[currentIndex];
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100;

  const handleSelectOption = (optionId: number) => {
    if (isSubmitting) return;
    setAnswers({ ...answers, [currentQuestion.id]: optionId });
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, answers }),
        credentials: 'include'
      });
      const data = await resp.json();
      setResult(data);
      onComplete(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 sm:space-y-8 p-6 sm:p-10 bg-surface rounded-2xl sm:rounded-[3rem] border border-surface-border shadow-2xl relative overflow-hidden w-full max-w-md mx-auto">
        <div className="absolute top-0 inset-x-0 h-2 bg-primary/20">
           <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-primary" />
        </div>

        <div className="relative z-10">
           <div className="w-18 sm:w-24 h-18 sm:h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl shadow-primary/20">
              <Award className="w-9 sm:w-12 h-9 sm:h-12" />
           </div>
           
           <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter mb-2">¡EXAMEN COMPLETADO!</h2>
           <p className="text-foreground/60 text-base sm:text-lg font-bold">Tu puntaje: <span className="text-primary">{result.score}%</span></p>

           <div className="grid grid-cols-2 gap-3 sm:gap-4 my-6 sm:my-10">
              <div className="p-4 sm:p-6 bg-primary/5 rounded-2xl sm:rounded-3xl border border-primary/10">
                 <p className="text-[9px] sm:text-[10px] font-black uppercase text-primary tracking-widest mb-1">XP GANADA</p>
                 <p className="text-2xl sm:text-3xl font-black">+{result.xpGained}</p>
              </div>
              <div className="p-4 sm:p-6 bg-accent/5 rounded-2xl sm:rounded-3xl border border-accent/10">
                 <p className="text-[9px] sm:text-[10px] font-black uppercase text-accent tracking-widest mb-1">NIVEL ACTUAL</p>
                 <p className="text-2xl sm:text-3xl font-black">{result.level}</p>
              </div>
           </div>

           {result.leveledUp && (
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-yellow-500/10 text-yellow-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-yellow-500/20 font-bold mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3 justify-center text-sm">
                <Sparkles className="w-5 sm:w-6 h-5 sm:h-6" /> ¡SUBISTE DE NIVEL!
             </motion.div>
           )}

           <button 
             onClick={onClose}
             className="w-full py-4 sm:py-5 bg-foreground text-background font-black rounded-2xl sm:rounded-3xl shadow-xl hover:-translate-y-1 transition-all text-base sm:text-xl"
           >
             Cerrar Desafío
           </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-10 px-1">
      {/* Header & Progress */}
      <header className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-end gap-3">
           <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl text-primary shrink-0">
                 <Brain className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
              <h3 className="text-base sm:text-xl font-bold truncate">{quiz.title}</h3>
           </div>
           <span className="text-[10px] sm:text-sm font-black text-foreground/40 italic shrink-0">PREGUNTA {currentIndex + 1} DE {quiz.questions.length}</span>
        </div>
        <div className="h-2 sm:h-3 bg-surface border border-surface-border rounded-full overflow-hidden">
           <motion.div 
             className="h-full bg-primary"
             initial={{ width: 0 }}
             animate={{ width: `${progress}%` }}
           />
        </div>
      </header>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="glass-panel p-5 sm:p-10 rounded-2xl sm:rounded-[3rem] border border-surface-border shadow-2xl relative"
        >
          <HelpCircle className="absolute -top-4 sm:-top-6 -left-4 sm:-left-6 w-10 sm:w-16 h-10 sm:h-16 text-primary/10 -rotate-12 hidden sm:block" />
          
          <h2 className="text-lg sm:text-2xl font-bold mb-6 sm:mb-10 leading-tight">
            {currentQuestion.text}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {currentQuestion.options.map((opt: any) => (
              <button
                key={opt.id}
                disabled={isSubmitting}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full p-4 sm:p-6 text-left rounded-xl sm:rounded-2xl border-2 transition-all font-bold flex items-center justify-between group text-sm sm:text-base
                  ${answers[currentQuestion.id] === opt.id 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-surface-border hover:border-foreground/20'
                  }
                `}
              >
                <span className="pr-3">{opt.text}</span>
                <div className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0
                  ${answers[currentQuestion.id] === opt.id ? 'border-primary bg-primary' : 'border-surface-border'}`}>
                   {answers[currentQuestion.id] === opt.id && <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end gap-4 sm:gap-6">
         <button 
           disabled={!answers[currentQuestion.id] || isSubmitting}
           onClick={handleNext}
           className="flex-1 sm:flex-none px-8 sm:px-10 py-4 sm:py-5 bg-primary text-white font-black rounded-2xl sm:rounded-3xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
         >
           {isSubmitting ? <Loader2 className="w-5 sm:w-6 h-5 sm:h-6 animate-spin" /> : (
             <>
               {currentIndex === quiz.questions.length - 1 ? 'Finalizar' : 'Siguiente'} 
               <ArrowRight className="w-5 sm:w-6 h-5 sm:h-6" />
             </>
           )}
         </button>
      </div>
    </div>
  );
}
