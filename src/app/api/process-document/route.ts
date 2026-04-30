import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { analyzeDocumentContent } from '@/lib/openrouter';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const existingSubjectId = formData.get('subjectId') ? Number(formData.get('subjectId')) : null;

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    console.log('Processing file:', file.name, file.type, file.size);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let extractedText = '';
    if (file.type === 'application/pdf') {
      try {
        console.log('Starting PDF extraction...');
        // Use pdf-parse for server-side PDF parsing
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedText = result.text;
        console.log('PDF extraction success, length:', extractedText.length);
      } catch (pdfError: any) {
        console.error('PDF parsing failed:', pdfError?.message || pdfError);
        return NextResponse.json({ error: 'Error al leer el PDF: ' + (pdfError?.message || 'desconocido') }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Usa formato PDF para esta versión.' }, { status: 400 });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: 'No se pudo leer el PDF' }, { status: 400 });
    }

    // Análisis con IA
    console.log('Starting AI analysis...');
    const analysis = await analyzeDocumentContent(extractedText);
    console.log('AI analysis complete:', analysis.title);

    let subject;
    if (existingSubjectId) {
      // Usar materia existente y limpiar datos previos si es necesario
      subject = await prisma.subject.findUnique({ where: { id: existingSubjectId } });
      if (!subject || subject.professorId !== session.user.id) {
          return NextResponse.json({ error: 'Materia no válida' }, { status: 403 });
      }
      
      // Limpiar evaluaciones y temas previos para reemplazarlos con los del nuevo archivo
      await prisma.evaluation.deleteMany({ where: { subjectId: subject.id } });
      await prisma.topic.deleteMany({ where: { document: { subjectId: subject.id } } });
    } else {
      // Crear nueva materia
      subject = await prisma.subject.create({
        data: {
          name: analysis.title,
          professorId: session.user.id,
        },
      });
    }

    const document = await prisma.document.create({
      data: {
        title: file.name,
        textContent: extractedText,
        summary: analysis.summary,
        glossary: JSON.stringify(analysis.glossary),
        subjectId: subject.id,
      },
    });

    // Guardar evaluaciones
    if (analysis.evaluations && analysis.evaluations.length > 0) {
      await prisma.evaluation.createMany({
        data: analysis.evaluations.map(ev => ({
          title: ev.title,
          date: new Date(ev.date),
          weight: ev.weight,
          subjectId: subject.id,
        }))
      });
    }

    // Guardar temas
    if (analysis.topics && analysis.topics.length > 0) {
      await prisma.topic.createMany({
        data: analysis.topics.map(t => ({
          name: t.name,
          difficulty: t.difficulty,
          estimatedHours: t.estimatedHours,
          documentId: document.id,
        }))
      });
    }

    return NextResponse.json({
      success: true,
      data: analysis,
      subjectId: subject.id,
      documentId: document.id
    });

  } catch (error: any) {
    console.error('Error in /api/process-document:', error);
    return NextResponse.json({ error: 'Error interno al procesar el documento' }, { status: 500 });
  }
}
