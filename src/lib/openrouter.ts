import axios, { AxiosError } from 'axios';

const AI_API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || 'deepseek-chat';
const API_URL = process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions';
const TIMEOUT = 60000; // 60s — DeepSeek can be slow
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeJSON(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  // Remove any leading/trailing non-JSON chars
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  return cleaned;
}

function parseAIResponse(content: string): any {
  const json = sanitizeJSON(content);
  try {
    return JSON.parse(json);
  } catch (firstError) {
    // Remove trailing commas
    try {
      const fixed = json.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(fixed);
    } catch {
      throw new Error(`IA devolvió JSON inválido. Inicio: ${json.substring(0, 300)}`);
    }
  }
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callDeepSeek(
  messages: OpenRouterMessage[],
  options?: { temperature?: number; maxTokens?: number }
) {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY no está configurado en las variables de entorno');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Fresh AbortController per attempt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      console.log(`[DeepSeek] Attempt ${attempt + 1}/${MAX_RETRIES + 1}...`);

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
          timeout: TIMEOUT,
        }
      );

      clearTimeout(timeoutId);

      const choice = response.data?.choices?.[0];
      if (!choice?.message?.content) {
        throw new Error('La IA no devolvió contenido en la respuesta');
      }

      console.log(`[DeepSeek] Success on attempt ${attempt + 1}`);
      return parseAIResponse(choice.message.content);

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      const status = error?.response?.status;
      const errorData = error?.response?.data;

      console.error(`[DeepSeek] Attempt ${attempt + 1} failed:`, {
        status,
        message: error?.message,
        data: errorData?.error?.message
      });

      // Do NOT retry auth/payment errors
      if (status === 401 || status === 403) {
        throw new Error('API key de DeepSeek inválida o sin permisos. Verifica AI_API_KEY en .env');
      }
      if (status === 402) {
        throw new Error('Créditos de DeepSeek agotados. Recarga tu cuenta en platform.deepseek.com');
      }

      // Rate limit — wait longer
      if (status === 429 && attempt < MAX_RETRIES) {
        const waitMs = RETRY_DELAY * (attempt + 1) * 3;
        console.warn(`[DeepSeek] Rate limited. Waiting ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }

      // Server error — retry
      if (status && status >= 500 && attempt < MAX_RETRIES) {
        console.warn(`[DeepSeek] Server error ${status}, retrying...`);
        await sleep(RETRY_DELAY * (attempt + 1));
        continue;
      }

      // Timeout / network error — retry
      if (
        (error?.code === 'ECONNABORTED' ||
          error?.code === 'ERR_CANCELED' ||
          error?.message?.includes('timeout') ||
          error?.message?.includes('aborted') ||
          !status) &&
        attempt < MAX_RETRIES
      ) {
        console.warn(`[DeepSeek] Timeout/network error, retrying (${attempt + 1})...`);
        await sleep(RETRY_DELAY);
        continue;
      }

      // Non-retryable error
      break;
    }
  }

  // Build final error message
  const status = (lastError as any)?.response?.status;
  const errorMsg = (lastError as any)?.response?.data?.error?.message;

  if (errorMsg) throw new Error(`Error de DeepSeek: ${errorMsg}`);
  if (status === 429) throw new Error('Límite de peticiones a DeepSeek alcanzado. Espera un momento.');
  if ((lastError as AxiosError)?.code === 'ECONNABORTED' || lastError?.message?.includes('aborted')) {
    throw new Error('DeepSeek tardó demasiado en responder. Intenta con un PDF más corto.');
  }
  if (lastError?.message) throw new Error(lastError.message);
  throw new Error('La IA no está disponible. Intenta más tarde.');
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
  const truncatedText = text.substring(0, 12000);

  const systemPrompt = `Eres Ares, un Tutor IA experto en análisis académico. Tu función es procesar documentos educativos y extraer información estructurada con precisión.

Reglas estrictas:
1. Responde ÚNICAMENTE con JSON válido, sin texto adicional ni bloques de código markdown.
2. Identifica todos los temas/unidades y evalúalos por dificultad (1=muy fácil, 5=muy difícil).
3. Estima horas de estudio realistas por tema (mínimo 1 hora).
4. Si hay fechas de exámenes, usa formato YYYY-MM-DD. Si no hay, usa fechas futuras a 30-60 días de hoy.
5. Extrae al menos 5 términos para el glosario.
6. El resumen debe ser de 3-5 oraciones cubriendo los puntos clave.
7. Cada evaluación debe tener un peso (%). Si no se especifica, distribuye equitativamente.
8. Usa nombres descriptivos en español para todo.`;

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Analiza el siguiente contenido académico y devuelve SOLO JSON con esta estructura exacta (sin texto adicional):
{
  "title": "Título descriptivo de la materia",
  "summary": "Resumen de 3-5 oraciones",
  "glossary": [{ "term": "Término", "definition": "Definición breve" }],
  "evaluations": [{ "title": "Nombre del examen", "date": "YYYY-MM-DD", "weight": 25 }],
  "topics": [{ "name": "Nombre del tema", "difficulty": 3, "estimatedHours": 4 }]
}

CONTENIDO DEL DOCUMENTO:
${truncatedText}`,
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
  const truncatedText = text.substring(0, 8000);
  const questionCount = Math.max(5, Math.min(10, Math.floor(truncatedText.length / 500)));

  const systemPrompt = `Eres Ares, un tutor IA especializado en crear exámenes educativos de alta calidad.

Reglas estrictas:
1. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.
2. Genera exactamente ${questionCount} preguntas de opción múltiple.
3. Cada pregunta debe tener exactamente 4 opciones.
4. Solo 1 opción correcta por pregunta (isCorrect: true).
5. Las opciones incorrectas deben ser verosímiles.
6. Cada pregunta debe tener una explicación clara.
7. Varía la dificultad: fáciles, medias y difíciles.
8. Todas las preguntas y opciones en español.`;

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Crea un examen de ${questionCount} preguntas sobre "${subjectName}" basado en este contenido:

${truncatedText}

Responde SOLO con este JSON (sin texto adicional):
{
  "title": "Examen de ${subjectName}",
  "questions": [
    {
      "text": "Pregunta aquí",
      "options": [
        { "text": "Opción A", "isCorrect": false },
        { "text": "Opción B", "isCorrect": true },
        { "text": "Opción C", "isCorrect": false },
        { "text": "Opción D", "isCorrect": false }
      ],
      "explanation": "Explicación de por qué B es correcta"
    }
  ]
}`,
    },
  ], { temperature: 0.5 });

  if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
    throw new Error('La IA no generó preguntas válidas. Intenta de nuevo.');
  }

  const validQuestions = result.questions.filter(
    (q: any) =>
      q.text &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.some((o: any) => o.isCorrect === true)
  );

  if (validQuestions.length === 0) {
    throw new Error('La IA generó preguntas sin respuestas correctas marcadas. Intenta de nuevo.');
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
  const systemPrompt = `Eres Ares, un coach de estudio y tutor personal. Creas planes de estudio personalizados, 
efectivos y motivadores. Usas técnicas de aprendizaje comprobadas (spaced repetition, active recall, pomodoro).

Responde ÚNICAMENTE con JSON válido.`;

  const result = await callDeepSeek([
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

Responde SOLO con este JSON:
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
