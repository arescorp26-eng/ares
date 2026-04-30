import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import EnrollClient from './EnrollClient';
import Link from 'next/link';

export default async function EnrollPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const session = await getSession();
  const { subjectId: sId } = await params;
  const subjectId = Number(sId);

  // Obtener detalles de la materia
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { professor: true }
  });

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="glass-panel p-10 rounded-[2.5rem] border border-red-500/20 max-w-sm">
           <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
           <h1 className="text-2xl font-black mb-2">Materia no encontrada</h1>
           <p className="text-foreground/60 mb-6 font-medium">El código QR parece haber expirado o la materia no existe.</p>
           <Link href="/" className="px-6 py-3 bg-foreground text-background rounded-xl font-bold inline-block">Inicio</Link>
        </div>
      </div>
    );
  }

  // Si no hay sesión, obligamos al login
  if (!session) {
    redirect(`/login?callback=/enroll/${subjectId}`);
  }

  return (
    <EnrollClient 
      subject={subject} 
      subjectId={subjectId} 
      userEmail={session.user.email}
    />
  );
}
