import axios, { AxiosError } from 'axios';

const AI_API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const API_URL = process.env.AI_API_URL || 'https://opencode.ai/zen/v1/chat/completions';
const TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeJSON(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown code blocks
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  return cleaned;
}

function parseAIResponse(content: string): any {
  const json = sanitizeJSON(content);
  try {
    return JSON.parse(json);
  } catch (firstError) {
    // Try to recover common issues
    try {
      // Remove trailing commas
      const fixed = json.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(fixed);
    } catch {
      // Try to fix unescaped quotes
      try {
        const fixed = json.replace(/(?<!\\)"([^"]*)(?<!\\)"/g, (m) => m.replace(/"/g, '\\"'));
        return JSON.parse(fixed);
      } catch {
        throw new Error(`IA devolvió JSON inválido. Respuesta: ${json.substring(0, 200)}`);
      }
    }
  }
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callOpenRouter(
  messages: OpenRouterMessage[],
  options?: { temperature?: number; maxTokens?: number }
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        API_URL,
        {
          model: MODEL,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 4096,
        },
        {
          headers: {
            'Authorization': `Bearer ${AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const choice = response.data?.choices?.[0];
      if (!choice?.message?.content) {
        throw new Error('La IA no devolvió contenido');
      }

      return parseAIResponse(choice.message.content);

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      const status = error?.response?.status;
      const axiosErr = error as AxiosError;

      // Rate limit — esperar y reintentar
      if (status === 429 && attempt < MAX_RETRIES) {
        console.warn(`[OpenRouter] Rate limited, retrying in ${RETRY_DELAY * (attempt + 1)}ms...`);
        await sleep(RETRY_DELAY * (attempt + 1) * 2);
        continue;
      }

      // Timeout — reintentar
      if (axiosErr?.code === 'ECONNABORTED' && attempt < MAX_RETRIES) {
        console.warn(`[OpenRouter] Timeout, retrying (attempt ${attempt + 1})...`);
        await sleep(RETRY_DELAY);
        continue;
      }

      // Server error — reintentar
      if (status && status >= 500 && attempt < MAX_RETRIES) {
        console.warn(`[OpenRouter] Server error ${status}, retrying...`);
        await sleep(RETRY_DELAY * (attempt + 1));
        continue;
      }

      // Error de red — reintentar
      if (!status && attempt < MAX_RETRIES) {
        console.warn(`[OpenRouter] Network error, retrying...`);
        await sleep(RETRY_DELAY);
        continue;
      }

      // No más reintentos
      break;
    }
  }

  // Construir mensaje de error descriptivo
  const status = (lastError as any)?.response?.status;
  const errorData = (lastError as any)?.response?.data;

  if (status === 401 || status === 403) {
    throw new Error('API key de OpenRouter inválida o sin permisos');
  }
  if (status === 429) {
    throw new Error('Límite de peticiones a la IA alcanzado. Espera un momento.');
  }
  if (status === 402) {
    throw new Error('Créditos de OpenRouter agotados. Recarga tu cuenta.');
  }
  if ((lastError as AxiosError)?.code === 'ECONNABORTED') {
    throw new Error('La IA tardó demasiado en responder. Intenta de nuevo.');
  }
  if (errorData?.error?.message) {
    throw new Error(`Error de IA: ${errorData.error.message}`);
  }

  throw new Error('La IA no está disponible en este momento. Intenta más tarde.');
}

// ─── Interfaces ──────────────────────────────────────────────

export interface AIAnalysisResult {
  title: string;
  summary: string;
  glossary: { term: string; definition: string }[];
  evaluations: { title: string; date: string; weight: number }[];
  topics: { name: string; difficulty: number; estimatedHours: number }[];
}

export interface AIQuizResult {
  title: string;
  questions: {
    text: string;
    options: { text: string; isCorrect: boolean }[];
    explanation: string;
  }[];
}

// ─── Document Analysis ──────────────────────────────────────

export async function analyzeDocumentContent(text: string): Promise<AIAnalysisResult> {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY no configurado');
  }

  const systemPrompt = `Eres Ares, un Tutor IA experto en análisis académico. Tu función es procesar documentos educativos y extraer información estructurada con precisión.

Reglas estrictas:
1. Responde ÚNICAMENTE con JSON válido, sin texto adicional.
2. Identifica todos los temas/unidades y evalúalos por dificultad (1=muy fácil, 5=muy difícil).
3. Estima horas de estudio realistas por tema (mínimo 1 hora).
4. Si hay fechas de exámenes, usa formato YYYY-MM-DD. Si no hay, usa fechas futuras razonables.
5. Extrae al menos 5 términos para el glosario.
6. El resumen debe ser de 3-5 oraciones cubriendo los puntos clave.
7. Cada evaluación debe tener un peso (%). Si no se especifica, distribuye equitativamente.
8. Usa nombres descriptivos en español para todo.`;

  const result = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Analiza el siguiente contenido académico y devuelve JSON con esta estructura exacta:
{
  "title": "Título descriptivo de la materia",
  "summary": "Resumen de 3-5 oraciones",
  "glossary": [{ "term": "Término", "definition": "Definición breve" }],
  "evaluations": [{ "title": "Nombre", "date": "YYYY-MM-DD", "weight": número }],
  "topics": [{ "name": "Nombre del tema", "difficulty": 1-5, "estimatedHours": número }]
}

CONTENIDO:
${text.substring(0, 12000)}`,
    },
  ]);

  return {
    title: result.title || 'Materia sin título',
    summary: result.summary || 'No se pudo generar un resumen.',
    glossary: Array.isArray(result.glossary) ? result.glossary : [],
    evaluations: Array.isArray(result.evaluations) ? result.evaluations : [],
    topics: Array.isArray(result.topics) ? result.topics : [],
  };
}

// ─── Quiz Generation ────────────────────────────────────────

export async function generateQuizFromContent(
  text: string,
  subjectName: string
): Promise<AIQuizResult> {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY no configurado');
  }

  const questionCount = Math.max(5, Math.min(10, Math.floor(text.length / 300)));

  const systemPrompt = `Eres Ares, un tutor IA especializado en crear exámenes educativos de alta calidad.

Reglas estrictas:
1. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.
2. Genera exactamente ${questionCount} preguntas de opción múltiple.
3. Cada pregunta debe tener 4 opciones (A, B, C, D).
4. Solo 1 opción correcta por pregunta.
5. Las opciones incorrectas deben ser verosímiles (distractores creíbles).
6. Cada pregunta debe tener una explicación clara de la respuesta correcta.
7. Varía la dificultad: incluye preguntas fáciles, medias y difíciles.
8. Enfócate en comprensión y aplicación, no en memorización.
9. Las preguntas deben ser en español.`;

  const result = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Crea un examen de ${questionCount} preguntas sobre "${subjectName}" basado en este contenido:

${text.substring(0, 10000)}

Responde con este JSON:
{
  "title": "Título del examen",
  "questions": [
    {
      "text": "Pregunta aquí",
      "options": [
        { "text": "Opción A", "isCorrect": false },
        { "text": "Opción B", "isCorrect": true },
        { "text": "Opción C", "isCorrect": false },
        { "text": "Opción D", "isCorrect": false }
      ],
      "explanation": "Por qué la respuesta correcta es la correcta"
    }
  ]
}`,
    },
  ]);

  // Validate quiz structure
  if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
    throw new Error('La IA no generó preguntas válidas');
  }

  const validQuestions = result.questions.filter(
    (q: any) =>
      q.text &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.some((o: any) => o.isCorrect)
  );

  if (validQuestions.length === 0) {
    throw new Error('La IA generó preguntas sin respuestas correctas');
  }

  return {
    title: result.title || `Examen de ${subjectName}`,
    questions: validQuestions,
  };
}

// ─── Study Plan Personalization ─────────────────────────────

export interface SmartStudyPlan {
  dailySchedule: {
    day: string;
    focus: string;
    durationMinutes: number;
    specificTasks: string[];
  }[];
  recommendations: string[];
  motivationalMessage: string;
}

export async function generatePersonalizedStudyPlan(
  studentName: string,
  subjects: { name: string; topics: string[]; difficulty: number; examDate?: string }[],
  availableHoursPerDay: number,
  daysUntilExam: number
): Promise<SmartStudyPlan> {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY no configurado');
  }

  const systemPrompt = `Eres Ares, un coach de estudio y tutor personal. Creas planes de estudio personalizados, 
efectivos y motivadores. Usas técnicas de aprendizaje comprobadas (spaced repetition, active recall, pomodoro).

Responde ÚNICAMENTE con JSON válido.`;

  const result = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Crea un plan de estudio personalizado para ${studentName}.

Materias:
${subjects.map(s => `- ${s.name} (dificultad: ${s.difficulty}/5, temas: ${s.topics.join(', ')}${s.examDate ? `, examen: ${s.examDate}` : ''})`).join('\n')}

Restricciones:
- ${availableHoursPerDay} horas disponibles por día
- ${daysUntilExam} días hasta el examen
- Priorizar materias con examen más cercano y mayor dificultad

Responde con este JSON:
{
  "dailySchedule": [
    { 
      "day": "Día 1 - Lunes",
      "focus": "Materia principal del día",
      "durationMinutes": 120,
      "specificTasks": ["Tarea específica 1", "Tarea específica 2"]
    }
  ],
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "motivationalMessage": "Mensaje motivacional personalizado"
}`,
    },
  ]);

  return {
    dailySchedule: Array.isArray(result.dailySchedule) ? result.dailySchedule : [],
    recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    motivationalMessage: result.motivationalMessage || '¡Tú puedes! Cada sesión de estudio te acerca a tu meta.',
  };
}
