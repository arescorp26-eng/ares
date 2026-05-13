import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Crear una materia nueva (Paso 1 del Wizard)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const subject = await prisma.subject.create({
      data: {
        name,
        professorId: session.user.id
      }
    });

    return NextResponse.json(subject);

  } catch (error: any) {
    console.error('Error in POST /api/subjects:', error);
    return NextResponse.json({ error: 'Error al crear materia' }, { status: 500 });
  }
}

// Actualizar el plan (Temas y Evaluaciones) de forma manual (Paso 3b)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { subjectId, name, topics, evaluations } = await req.json();

    if (!subjectId) return NextResponse.json({ error: 'ID de materia requerido' }, { status: 400 });

    // Verificar propiedad
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId }
    });

    if (!subject || subject.professorId !== session.user.id) {
      return NextResponse.json({ error: 'No tienes permiso sobre esta materia' }, { status: 403 });
    }

    // 1. Actualizar Nombre si viene
    if (name) {
      await prisma.subject.update({
        where: { id: subjectId },
        data: { name }
      });
    }

    // 2. Limpiar datos anteriores (Solo si se envían nuevos para evitar borrado accidental)
    if (evaluations) {
      await prisma.evaluation.deleteMany({ where: { subjectId: Number(subjectId) } });
      const validEvaluations = evaluations.filter((ev: any) => 
        ev.title && ev.title.trim() && ev.date && new Date(ev.date).getTime() > 0
      );
      if (validEvaluations.length > 0) {
        await prisma.evaluation.createMany({
          data: validEvaluations.map((ev: any) => ({
            title: ev.title.trim(),
            date: new Date(ev.date),
            weight: parseFloat(ev.weight) || 20,
            subjectId: Number(subjectId)
          }))
        });
      }
    }

    if (topics) {
      const validTopics = topics.filter((t: any) => t.name && t.name.trim());
      await prisma.topic.deleteMany({ 
        where: { 
          document: { subjectId: Number(subjectId) } 
        } 
      });
      
      if (validTopics.length > 0) {
        let manualDoc = await prisma.document.findFirst({
          where: { subjectId: Number(subjectId), title: 'Plan Manual' }
        });

        if (!manualDoc) {
          manualDoc = await prisma.document.create({
            data: {
              subjectId: Number(subjectId),
              title: 'Plan Manual',
              textContent: validTopics.map((t: any) => t.name).join(', ')
            }
          });
        }

        await prisma.topic.createMany({
          data: validTopics.map((t: any) => ({
            name: t.name.trim(),
            difficulty: parseInt(t.difficulty) || 5,
            estimatedHours: parseFloat(t.estimatedHours) || 2,
            documentId: manualDoc!.id
          }))
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in PATCH /api/subjects:', error);
    return NextResponse.json({ error: 'Error al actualizar plan' }, { status: 500 });
  }
}
