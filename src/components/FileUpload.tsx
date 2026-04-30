'use client';

import React, { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onUploadComplete: (data: any) => void;
  subjectId?: number | null;
}

export default function FileUpload({ onUploadComplete, subjectId }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    if (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setStatus('idle');
    } else {
      alert('Por favor sube un PDF o una imagen.');
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    if (subjectId) {
      formData.append('subjectId', subjectId.toString());
    }

    try {
      setProgress(30);
      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          alert('Tu sesión ha expirado. Por favor cierra sesión y vuelve a entrar.');
        } else {
          alert(`Error: ${errorData.error || 'Error al procesar el archivo'}`);
        }
        throw new Error(errorData.error || 'Error al procesar el archivo');
      }

      setProgress(90);
      setStatus('processing');
      
      const result = await response.json();
      
      setProgress(100);
      setStatus('success');
      setTimeout(() => {
        onUploadComplete(result);
      }, 1000);
    } catch (error) {
      console.error('Error al procesar el archivo', error);
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div 
        className={`relative group border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center
          ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-surface-border bg-surface/50'}
          ${status !== 'idle' ? 'pointer-events-none' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => status === 'idle' && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          hidden 
          ref={fileInputRef} 
          onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
          accept=".pdf,image/*"
        />

        <AnimatePresence mode="wait">
          {status === 'idle' && !file && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Sube tu material</h3>
              <p className="text-foreground/60">Arrastra un PDF o una foto de tu cartelera aquí</p>
            </motion.div>
          )}

          {file && status === 'idle' && (
            <motion.div 
              key="selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center w-full"
            >
              <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-surface-border mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <File className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-foreground/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="p-1 hover:bg-red-500/10 text-foreground/40 hover:text-red-500 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); uploadFile(); }}
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all"
              >
                Analizar con Ares IA
              </button>
            </motion.div>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <motion.div 
              key="process"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {status === 'uploading' ? 'Subiendo archivo...' : 'IA Analizando contenido...'}
              </h3>
              <div className="w-64 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-4 text-sm text-foreground/60 italic">
                Estamos extrayendo fechas y temas importantes...
              </p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-foreground">¡Análisis Completo!</h3>
              <p className="text-foreground/60">Redirigiendo a tu nuevo plan de estudios...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
