import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateQuizFromContent } from '@/lib/openrouter';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { subjectId, topicId } = await req.json();

    if (!subjectId) {
      return NextResponse.json({ error: 'ID de materia requerido' }, { status: 400 });
    }

    // Buscar contenido para alimentar la IA
    let content = '';
    let subjectName = 'Materia';

    // Primero buscar contenido del tema específico si se indicó
    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        include: { document: true }
      });
      if (topic?.document?.textContent) {
        content = topic.document.textContent;
      }
    }

    // Si no hay contenido del tema, buscar todos los documentos de la materia
    if (!content) {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: {
          documents: {
            select: { textContent: true },
            orderBy: { id: 'desc' },
            take: 3 // Usar los 3 documentos más recientes
          }
        }
      });

      if (!subject) {
        return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 });
      }

      subjectName = subject.name;
      content = subject.documents
        .map(d => d.textContent || '')
        .filter(t => t.length > 0)
        .join('\n\n');
    } else {
      // Obtener el nombre de la materia
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { name: true }
      });
      subjectName = subject?.name || 'Materia';
    }

    if (!content || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Esta materia no tiene contenido suficiente para generar un quiz. El profesor debe subir el material primero.' },
        { status: 400 }
      );
    }

    console.log(`[Quiz] Generating for subject "${subjectName}", content length: ${content.length}`);

    // Generar quiz con DeepSeek
    let aiQuiz;
    try {
      aiQuiz = await generateQuizFromContent(content, subjectName);
    } catch (aiError: any) {
      console.error('[Quiz] AI generation failed:', aiError?.message);
      return NextResponse.json(
        { error: 'Error al generar el quiz: ' + (aiError?.message || 'Intenta de nuevo') },
        { status: 500 }
      );
    }

    // Guardar en BD
    const quiz = await prisma.quiz.create({
      data: {
        title: aiQuiz.title,
        subjectId,
        topicId: topicId || null,
        questions: {
          create: aiQuiz.questions.map(q => ({
            text: q.text,
            explanation: q.explanation,
            options: {
              create: q.options.map(o => ({
                text: o.text,
                isCorrect: o.isCorrect
              }))
            }
          }))
        }
      },
      include: {
        questions: {
          include: { options: true }
        }
      }
    });

    // Devolver quiz SIN revelar las respuestas correctas al cliente
    const safeQuiz = {
      id: quiz.id,
      title: quiz.title,
      subjectId: quiz.subjectId,
      questions: quiz.questions.map(q => ({
        id: q.id,
        text: q.text,
        // explanation se oculta hasta que el estudiante responda
        options: q.options.map(o => ({
          id: o.id,
          text: o.text,
          // isCorrect NO se envía al cliente
        }))
      }))
    };

    return NextResponse.json(safeQuiz);

  } catch (error: any) {
    console.error('[Quiz] Unhandled error:', error?.message || error);
    return NextResponse.json(
      { error: 'Error interno al generar el examen: ' + (error?.message || 'desconocido') },
      { status: 500 }
    );
  }
}
