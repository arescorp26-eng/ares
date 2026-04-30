import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Debes ser un estudiante para inscribirte' }, { status: 401 });
    }

    const { subjectId } = await req.json();

    if (!subjectId) {
      return NextResponse.json({ error: 'ID de materia requerido' }, { status: 400 });
    }

    // Verificar si ya está inscrito
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: session.user.id,
          subjectId: Number(subjectId),
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({ success: true, message: 'Ya estás inscrito en esta materia' });
    }

    // Crear inscripción
    await prisma.enrollment.create({
      data: {
        studentId: session.user.id,
        subjectId: Number(subjectId),
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Inscripción exitosa. La IA está procesando tu Smart Scheduler.' 
    });

  } catch (error: any) {
    console.error('Error in /api/enroll:', error);
    return NextResponse.json({ error: 'No se pudo completar la inscripción' }, { status: 500 });
  }
}
