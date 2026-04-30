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
      await prisma.evaluation.deleteMany({ where: { subjectId } });
      if (evaluations.length > 0) {
        await prisma.evaluation.createMany({
          data: evaluations.map((ev: any) => ({
            title: ev.title,
            date: new Date(ev.date),
            weight: parseFloat(ev.weight),
            subjectId
          }))
        });
      }
    }

    if (topics) {
      // Borramos temas que NO tengan documento asociado (los manuales)
      // Opcional: Borrar todos si el profesor quiere re-hacer el plan IA
      await prisma.topic.deleteMany({ 
        where: { 
          document: { subjectId } 
        } 
      });
      
      if (topics.length > 0) {
        // Encontrar o crear un documento "Manual" para agrupar temas
        let manualDoc = await prisma.document.findFirst({
          where: { subjectId, title: 'Plan Manual' }
        });

        if (!manualDoc) {
          manualDoc = await prisma.document.create({
            data: {
              subjectId,
              title: 'Plan Manual',
              textContent: topics.map((t: any) => t.name).join(', ')
            }
          });
        }

        await prisma.topic.createMany({
          data: topics.map((t: any) => ({
            name: t.name,
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
