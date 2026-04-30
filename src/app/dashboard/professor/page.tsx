import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import ProfessorDashboard from './ProfessorDashboard';
import { redirect } from 'next/navigation';

export default async function ProfessorPage() {
  const session = await getSession();

  // Verificación adicional de seguridad (aunque el middleware ya lo haga)
  if (!session || (session.user.role !== 'PROFESSOR' && session.user.role !== 'ADMIN')) {
    redirect('/login');
  }

  // Obtener las materias creadas por este profesor
  const subjects = await prisma.subject.findMany({
    where: { professorId: session.user.id },
    include: {
      documents: {
        include: { topics: true }
      },
      evaluations: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <ProfessorDashboard subjects={subjects} />
  );
}
