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
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      let parser: any = null;
      try {
        console.log('Starting PDF extraction...');
        const { PDFParse } = await import('pdf-parse');
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedText = result.text || '';
        console.log('PDF extraction success, length:', extractedText.length);
      } catch (pdfError: any) {
        console.error('PDF parsing failed:', pdfError?.message || pdfError);
        return NextResponse.json(
          { error: 'Error al leer el PDF: ' + (pdfError?.message || 'formato no soportado') },
          { status: 400 }
        );
      } finally {
        if (parser) {
          try { await parser.destroy(); } catch (_) {}
        }
      }
    } else {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF.' }, { status: 400 });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        { error: 'El PDF está vacío o protegido. Asegúrate de que el PDF contenga texto seleccionable.' },
        { status: 400 }
      );
    }

    // Análisis con IA (DeepSeek)
    console.log('Starting AI analysis with DeepSeek...');
    let analysis;
    try {
      analysis = await analyzeDocumentContent(extractedText);
      console.log('AI analysis complete:', analysis.title);
    } catch (aiError: any) {
      console.error('AI analysis failed:', aiError?.message || aiError);
      return NextResponse.json(
        { error: 'Error de IA: ' + (aiError?.message || 'No se pudo analizar el documento') },
        { status: 500 }
      );
    }

    let subject;
    if (existingSubjectId) {
      subject = await prisma.subject.findUnique({ where: { id: existingSubjectId } });
      if (!subject || subject.professorId !== session.user.id) {
        return NextResponse.json({ error: 'Materia no válida' }, { status: 403 });
      }

      // Limpiar evaluaciones y temas previos
      await prisma.evaluation.deleteMany({ where: { subjectId: subject.id } });
      await prisma.topic.deleteMany({ where: { document: { subjectId: subject.id } } });
    } else {
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
    console.error('Unhandled error in /api/process-document:', error?.message || error);
    return NextResponse.json(
      { error: 'Error interno: ' + (error?.message || 'desconocido') },
      { status: 500 }
    );
  }
}
