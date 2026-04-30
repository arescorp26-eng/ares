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

    if (!subjectId) return NextResponse.json({ error: 'ID de materia requerido' }, { status: 400 });

    // Buscar contenido para alimentar la IA
    // Prioridad 1: Documento del tema
    // Prioridad 2: Documentos de la materia
    let content = "";
    let subject;

    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        include: { document: true }
      });
      content = topic?.document?.textContent || "";
    }

    if (!content) {
      subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: { documents: true }
      });
      content = subject?.documents.map(d => d.textContent).join("\n") || "";
    }

    if (!content || content.length < 50) {
      return NextResponse.json({ error: 'No hay suficiente contenido para generar un quiz.' }, { status: 400 });
    }

    // Generar con IA
    const aiQuiz = await generateQuizFromContent(content, subject?.name || "Materia");

    // Guardar en BD
    const quiz = await prisma.quiz.create({
      data: {
        title: aiQuiz.title,
        subjectId,
        topicId,
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

    return NextResponse.json(quiz);

  } catch (error: any) {
    console.error('Quiz Gen Error:', error);
    return NextResponse.json({ error: 'Error al generar el examen' }, { status: 500 });
  }
}
