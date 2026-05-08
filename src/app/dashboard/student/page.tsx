import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import StudentDashboard from './StudentDashboard';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function StudentPage() {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore);

  if (!session || session.user.role !== 'STUDENT') {
    redirect('/login');
  }

  const userId = session.user.id;

  // 1. Datos del usuario (nombre, XP, nivel, racha)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      xp: true,
      level: true,
      streak: true,
      lastActive: true
    }
  });

  if (!user) {
    redirect('/login');
  }

  // 2. Materias inscritas
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: userId },
    include: {
      subject: {
        include: {
          evaluations: true,
          documents: { select: { id: true, title: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 3. Disponibilidad configurada
  const availability = await prisma.availability.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });

  // 4. Próximas sesiones de estudio
  const sessions = await prisma.studySession.findMany({
    where: { studentId: userId, date: { gte: new Date() } },
    include: {
      topic: {
        include: {
          document: { select: { subjectId: true } },
          quizzes: { select: { subjectId: true }, take: 1 }
        }
      }
    },
    orderBy: { date: 'asc' },
    take: 20
  });

  // 5. Logros (gamification)
  const allAchievements = await prisma.achievement.findMany();
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true }
  });
  const unlockedAchievementIds = userAchievements.map(ua => ua.achievementId);

  const gamification = {
    user: {
      name: user?.name || 'Estudiante',
      xp: user?.xp || 0,
      level: user?.level || 1,
      streak: user?.streak || 0
    },
    achievements: allAchievements,
    unlockedAchievementIds
  };

  return (
    <StudentDashboard 
      enrollments={enrollments} 
      initialAvailability={availability}
      initialSessions={sessions}
      gamification={gamification}
    />
  );
}
