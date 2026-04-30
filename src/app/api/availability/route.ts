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

    // 1. Borrar disponibilidad anterior
    await prisma.availability.deleteMany({
      where: { userId: session.user.id }
    });

    // 2. Guardar nueva disponibilidad
    await prisma.availability.createMany({
      data: slots.map((s: any) => ({
        ...s,
        userId: session.user.id
      }))
    });

    // 3. Disparar el Smart Scheduler (Automatización total)
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
