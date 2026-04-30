import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { awardXP, XP_PER_QUIZ_ANSWER } from '@/lib/gamification';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { quizId, answers } = await req.json(); // answers: { [questionId]: optionId }

    if (!quizId || !answers) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { 
        questions: { 
          include: { options: true } 
        } 
      }
    });

    if (!quiz) return NextResponse.json({ error: 'Quiz no encontrado' }, { status: 404 });

    let correctCount = 0;
    const feedback = quiz.questions.map(q => {
      const selectedOptionId = answers[q.id];
      const correctOption = q.options.find(o => o.isCorrect);
      const isCorrect = selectedOptionId === correctOption?.id;
      
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        isCorrect,
        correctOptionId: correctOption?.id,
        explanation: q.explanation
      };
    });

    const score = (correctCount / quiz.questions.length) * 100;
    const xpGained = correctCount * XP_PER_QUIZ_ANSWER;

    // Guardar resultado
    const result = await prisma.userQuizResult.create({
      data: {
        userId: session.user.id,
        quizId,
        score,
        xpGained
      }
    });

    // Otorgar XP al usuario
    const gamification = await awardXP(session.user.id, xpGained, `Examen completado: ${quiz.title}`);

    return NextResponse.json({
      success: true,
      score,
      xpGained,
      feedback,
      level: gamification?.level,
      leveledUp: gamification?.leveledUp
    });

  } catch (error: any) {
    console.error('Quiz Submit Error:', error);
    return NextResponse.json({ error: 'Error al calificar el examen' }, { status: 500 });
  }
}
