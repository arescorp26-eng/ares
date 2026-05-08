import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateSmartSchedule } from '@/lib/scheduler';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { slots } = await req.json();

    await prisma.availability.deleteMany({
      where: { userId: session.user.id }
    });

    await prisma.availability.createMany({
      data: slots.map((s: any) => ({
        ...s,
        userId: session.user.id
      }))
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: session.user.id },
      include: {
        subject: {
          include: {
            evaluations: { include: { topics: true } },
            documents: { include: { topics: true } }
          }
        }
      }
    });

    const hasTopics = enrollments.some(en =>
      en.subject.evaluations.some(ev => ev.topics.length > 0) ||
      en.subject.documents.some(doc => doc.topics.length > 0)
    );

    if (!hasTopics) {
      return NextResponse.json({
        success: true,
        message: 'Disponibilidad guardada. Inscríbete en una materia para generar tu plan de estudio.',
        details: { sessionsCount: 0, needsEnrollment: true }
      });
    }

    const scheduleResult = await generateSmartSchedule(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Disponibilidad actualizada y calendario generado.',
      details: scheduleResult
    });

  } catch (error: any) {
    console.error('[availability POST] Error:', error);
    return NextResponse.json({ error: 'Ocurrió un error al procesar tu solicitud.' }, { status: 500 });
  }
}

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const availability = await prisma.availability.findMany({
        where: { userId: session.user.id }
    });

    return NextResponse.json(availability);
}
