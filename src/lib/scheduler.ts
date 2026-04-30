import prisma from '@/lib/prisma';
import { addDays, format, startOfDay, parseISO, isAfter } from 'date-fns';

interface PriorityTopic {
  id: number;
  name: string;
  priority: number;
  estimatedHours: number;
  subjectName: string;
  evaluationDate: Date;
}

export async function generateSmartSchedule(studentId: number) {
  // 1. Obtener disponibilidad del alumno
  const availability = await prisma.availability.findMany({
    where: { userId: studentId },
    orderBy: { dayOfWeek: 'asc' }
  });

  if (availability.length === 0) return { error: 'No has configurado tu disponibilidad horaria.' };

  // 2. Obtener materias y temas inscritos
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      subject: {
        include: {
          evaluations: {
            where: { date: { gte: new Date() } },
            orderBy: { date: 'asc' },
            include: { topics: true }
          },
          documents: {
            include: { topics: true }
          }
        }
      }
    }
  });

  // 3. Preparar lista de temas con prioridad
  let prioritizedTopics: PriorityTopic[] = [];

  enrollments.forEach(en => {
    const subjectName = en.subject.name;
    
    // Tópicos de evaluaciones (con prioridad basada en fecha)
    en.subject.evaluations.forEach(ev => {
      const daysUntil = Math.max(1, (ev.date.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      
      ev.topics.forEach(topic => {
        const weight = ev.weight || 10;
        const priority = (topic.difficulty * weight) / daysUntil;
        prioritizedTopics.push({
          id: topic.id,
          name: topic.name,
          priority,
          estimatedHours: topic.estimatedHours || 2,
          subjectName,
          evaluationDate: ev.date
        });
      });
    });

    // Tópicos de documentos (sin evaluación asociada, prioridad por dificultad)
    en.subject.documents.forEach(doc => {
      doc.topics.forEach(topic => {
        // Evitar duplicados si ya está en una evaluación
        if (!prioritizedTopics.some(t => t.id === topic.id)) {
          prioritizedTopics.push({
            id: topic.id,
            name: topic.name,
            priority: topic.difficulty,
            estimatedHours: topic.estimatedHours || 2,
            subjectName,
            evaluationDate: new Date() // sin fecha, se asume pronto
          });
        }
      });
    });
  });

  // Ordenar por prioridad descendente
  prioritizedTopics.sort((a, b) => b.priority - a.priority);

  // 4. Algoritmo de distribución (Simpificado para los próximos 14 días)
  const scheduledSessions = [];
  let startDate = startOfDay(new Date());

  for (let i = 0; i < 14; i++) {
    const currentDate = addDays(startDate, i);
    const dayOfWeek = currentDate.getDay();
    
    // Buscar bloques de disponibilidad para este día
    const dailySlots = availability.filter(a => a.dayOfWeek === dayOfWeek);

    for (const slot of dailySlots) {
      if (prioritizedTopics.length === 0) break;

      // Calcular duración del bloque en minutos
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const [endH, endM] = slot.endTime.split(':').map(Number);
      let durationMins = (endH * 60 + endM) - (startH * 60 + startM);

      // Llenar el bloque con temas
      while (durationMins > 30 && prioritizedTopics.length > 0) {
        const currentTopic = prioritizedTopics[0];
        const sessionMins = Math.min(durationMins, currentTopic.estimatedHours * 60);

        scheduledSessions.push({
          date: currentDate,
          durationMins: sessionMins,
          topicId: currentTopic.id,
          studentId: studentId
        });

        durationMins -= sessionMins;
        currentTopic.estimatedHours -= (sessionMins / 60);

        if (currentTopic.estimatedHours <= 0) {
          prioritizedTopics.shift(); // Tema completado
        }
      }
    }
  }

  // 5. Persistir sesiones en la base de datos
  // Borrar sesiones futuras no completadas para recalcular
  await prisma.studySession.deleteMany({
    where: {
      studentId,
      completed: false,
      date: { gte: new Date() }
    }
  });

  await prisma.studySession.createMany({
    data: scheduledSessions
  });

  return { success: true, sessionsCount: scheduledSessions.length };
}

// Lógica de Repetición Espaciada (Spaced Repetition Generator)
export async function scheduleSpacedRepetition(studentId: number, topicId: number) {
    const intervals = [1, 3, 7]; // días después
    const now = new Date();
    
    const sessions = intervals.map(days => ({
        date: addDays(now, days),
        durationMins: 30, // Repasos cortos
        topicId,
        studentId,
        completed: false
    }));

    await prisma.studySession.createMany({ data: sessions });
}
