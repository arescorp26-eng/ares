import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  // ── Global counts ──────────────────────────────────────────
  const [totalProfessors, totalStudents, totalSubjects, totalQuizzes] = await Promise.all([
    prisma.user.count({ where: { role: 'PROFESSOR' } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.subject.count(),
    prisma.quiz.count(),
  ]);

  // ── Professors list with their subject counts ──────────────
  const professors = await prisma.user.findMany({
    where: { role: 'PROFESSOR' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      subjectsCreated: {
        select: {
          id: true,
          name: true,
          _count: { select: { enrollments: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ── Students list with progress ────────────────────────────
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: {
      id: true,
      name: true,
      email: true,
      xp: true,
      level: true,
      streak: true,
      lastActive: true,
      createdAt: true,
      enrollments: {
        select: {
          subject: { select: { name: true } },
        },
      },
      quizResults: {
        select: { score: true, xpGained: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
    orderBy: { xp: 'desc' },
  });

  // ── Subjects with full detail ──────────────────────────────
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      professor: { select: { name: true, email: true } },
      _count: {
        select: { enrollments: true, documents: true, evaluations: true, quizzes: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ── Recent activity (latest quiz results) ─────────────────
  const recentActivity = await prisma.userQuizResult.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      score: true,
      xpGained: true,
      createdAt: true,
      user: { select: { name: true } },
      quiz: {
        select: {
          title: true,
          subject: { select: { name: true } },
        },
      },
    },
  });

  const stats = { totalProfessors, totalStudents, totalSubjects, totalQuizzes };

  return (
    <AdminDashboard
      stats={stats}
      professors={professors as any}
      students={students as any}
      subjects={subjects as any}
      recentActivity={recentActivity as any}
    />
  );
}
