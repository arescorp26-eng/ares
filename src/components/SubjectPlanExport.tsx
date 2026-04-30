'use client';

import { jsPDF } from 'jspdf';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface PlanExportProps {
  subject: {
    name: string;
    professor: { name: string };
    documents?: any[];
    evaluations?: any[];
  };
  variant?: 'button' | 'icon';
}

export default function SubjectPlanExport({ subject, variant = 'button' }: PlanExportProps) {
  const [loading, setLoading] = useState(false);

  const generatePDF = () => {
    if (!subject.name) {
      alert("Error: Datos de la materia no cargados correctamente.");
      return;
    }
    
    setLoading(true);
    try {
      const doc = new jsPDF();
      const margin = 20;
      let y = 30;

      // Ares Branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246); // Primary Ares Blue
      doc.text('ARES ACADEMY', margin, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Plan de Estudio Oficial y Cronograma', margin, y);
      
      y += 20;
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(`MATERIA: ${subject.name.toUpperCase()}`, margin, y);
      
      y += 8;
      doc.setFontSize(12);
      doc.text(`PROFESOR: ${subject.professor?.name || 'Docente Ares'}`, margin, y);
      
      y += 15;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, 190, y);
      
      y += 20;
      // Topics Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('1. CONTENIDO TEMÁTICO', margin, y);
      
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);

      // Consolidar temas de todos los documentos
      const allTopics = subject.documents?.flatMap(d => d.topics) || [];
      
      if (allTopics.length > 0) {
        allTopics.forEach((topic: any, index: number) => {
          if (y > 270) { doc.addPage(); y = 30; }
          doc.text(`${index + 1}. ${topic.name} (${topic.estimatedHours || 2}h)`, margin + 5, y);
          y += 8;
        });
      } else {
        doc.text('No hay temas registrados en el sistema para esta materia.', margin + 5, y);
        y += 8;
      }

      y += 15;
      // Evaluations Section
      if (y > 250) { doc.addPage(); y = 30; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('2. CALENDARIO DE EVALUACIONES', margin, y);
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const evals = subject.evaluations || [];
      if (evals.length > 0) {
        evals.forEach((ev: any) => {
          if (y > 270) { doc.addPage(); y = 30; }
          const dateStr = new Date(ev.date).toLocaleDateString();
          doc.setFont('helvetica', 'bold');
          doc.text(`${ev.title}`, margin + 5, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`${dateStr} - Peso: ${ev.weight}%`, 140, y);
          y += 10;
        });
      } else {
        doc.text('No hay evaluaciones programadas aún.', margin + 5, y);
        y += 8;
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generado por Ares AI - Tu asistente académico moderno. Página ${i} de ${pageCount}`, margin, 285);
      }

      doc.save(`Plan_Ares_${subject.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert("Error al generar el PDF. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button 
        onClick={generatePDF} 
        disabled={loading}
        className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all"
        title="Descargar Plan PDF"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button 
      onClick={generatePDF}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground text-xs font-bold rounded-xl transition-all"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Descargar Plan
    </button>
  );
}
