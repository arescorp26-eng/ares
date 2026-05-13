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

      if (ev.topics.length > 0) {
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
      } else {
        // Evaluación sin temas: crear bloque de estudio basado en la evaluación
        const weight = ev.weight || 10;
        const totalHours = Math.max(2, (weight / 100) * 10);
        const priority = weight / daysUntil;
        prioritizedTopics.push({
          id: -ev.id,
          name: ev.title,
          priority,
          estimatedHours: totalHours,
          subjectName,
          evaluationDate: ev.date
        });
      }
    });

    // Tópicos de documentos (sin evaluación asociada, prioridad por dificultad)
    en.subject.documents.forEach(doc => {
      doc.topics.forEach(topic => {
        if (!prioritizedTopics.some(t => t.id === topic.id)) {
          prioritizedTopics.push({
            id: topic.id,
            name: topic.name,
            priority: topic.difficulty,
            estimatedHours: topic.estimatedHours || 2,
            subjectName,
            evaluationDate: new Date()
          });
        }
      });
    });
  });

  // 4. Crear topics reales para evaluaciones que no tienen topics vinculados
  const subjectsMap: Record<number, { id: number; name: string }> = {};
  for (const en of enrollments) {
    if (!subjectsMap[en.subjectId]) {
      subjectsMap[en.subjectId] = { id: en.subjectId, name: en.subject.name };
    }
  }

  for (const pt of prioritizedTopics) {
    if (pt.id >= 0) continue;

    const evalId = -pt.id;
    const subject = Object.values(subjectsMap).find(s => s.name === pt.subjectName);
    if (!subject) continue;

    let doc = await prisma.document.findFirst({
      where: { subjectId: subject.id, title: 'Plan de Estudio Automático' }
    });

    if (!doc) {
      doc = await prisma.document.create({
        data: {
          subjectId: subject.id,
          title: 'Plan de Estudio Automático',
          textContent: `Temas generados automáticamente para ${subject.name}`
        }
      });
    }

    const realTopic = await prisma.topic.create({
      data: {
        name: pt.name,
        difficulty: 3,
        estimatedHours: pt.estimatedHours,
        documentId: doc.id,
        evaluationId: evalId
      }
    });

    pt.id = realTopic.id;
  }

  // Ordenar por prioridad descendente
  prioritizedTopics.sort((a, b) => b.priority - a.priority);
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

  // 6. Persistir sesiones en la base de datos
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
