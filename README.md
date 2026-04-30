# 🎓 Ares — Tutor Inteligente

Plataforma académica con IA para planificación de estudio, gamificación y evaluaciones automáticas. Tres roles: **Admin**, **Profesor** y **Estudiante**.

## ✨ Características

- 📚 **Gestión de materias** con plan de estudio manual o analizado por IA desde PDF
- 🤖 **Quizzes generados por IA** usando OpenRouter/Claude
- 📅 **Calendario inteligente** que adapta sesiones según disponibilidad del estudiante
- 🏆 **Gamificación** — XP, niveles, rachas y medallas
- 📱 **100% responsive** — funciona en móvil, tablet y escritorio
- 🔐 **Sistema de roles** — Admin, Profesor, Estudiante con JWT auth

## 🛠 Stack

| Tecnología | Uso |
|------------|-----|
| Next.js 16 | Framework fullstack (App Router) |
| Prisma 7 + MySQL | ORM y base de datos |
| Tailwind CSS v4 | Estilos responsive |
| Framer Motion | Animaciones |
| OpenRouter API | IA (Claude, auto-routing) |
| Railway | Hosting & MySQL en producción |

## 🚀 Deploy en Railway

### 1. Fork / Clona el repo
```bash
git clone https://github.com/tu-usuario/ares.git
cd ares
```

### 2. Crea un proyecto en Railway
1. Ve a [railway.app](https://railway.app) → New Project
2. **Add a Database → MySQL** (Railway provisiona MySQL automáticamente)
3. **Deploy from GitHub** → conecta este repo

### 3. Variables de entorno en Railway
En el dashboard de Railway → tu servicio → Variables, agrega:

```
DATABASE_URL        → Railway lo inyecta automáticamente desde el plugin MySQL
OPENROUTER_API_KEY  → tu key de openrouter.ai
OPENROUTER_MODEL    → anthropic/claude-3-haiku  (u otro modelo de tu preferencia)
JWT_SECRET          → genera con: openssl rand -base64 32
```

> ⚠️ **No necesitas** configurar `DATABASE_URL` manualmente si usas el plugin MySQL de Railway — se inyecta solo.

### 4. Build Command (ya configurado en `railway.toml`)
```
npm run build:migrate
```
Esto ejecuta `prisma migrate deploy` y luego `next build`.

### 5. Seed inicial (primera vez)
Después del primer deploy, ejecuta desde Railway Shell:
```bash
node seed.js
```
Esto crea el usuario admin: `admin@ares.com` / `admin123`

---

## 💻 Desarrollo local

### Requisitos
- Node.js 20+
- MySQL / MariaDB corriendo (XAMPP, Laragon, o Docker)

### Setup
```bash
# 1. Instala dependencias
npm install

# 2. Copia el .env y configura tus variables
cp .env.example .env
# Edita .env con tu DATABASE_URL y OPENROUTER_API_KEY

# 3. Crea la base de datos y aplica migraciones
npx prisma migrate dev

# 4. Genera el cliente Prisma
npx prisma generate

# 5. Seed inicial (admin + logros)
node seed.js

# 6. Inicia el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🔑 Credenciales por defecto

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@ares.com | admin123 |

El Admin puede crear cuentas de Profesor desde el panel. Los estudiantes se registran solos en `/register`.

## 📂 Estructura del proyecto

```
src/
├── app/
│   ├── dashboard/
│   │   ├── admin/          # Panel administrativo
│   │   ├── professor/      # Dashboard del profesor
│   │   └── student/        # Dashboard del estudiante
│   ├── api/                # API Routes (REST)
│   ├── login/              # Página de login
│   └── register/           # Registro de estudiantes
├── components/             # Componentes compartidos
│   ├── DashboardShell.tsx  # Layout responsive (sidebar + hamburger)
│   ├── AvailabilityManager.tsx
│   ├── QuizInterface.tsx
│   └── ...
└── lib/
    ├── auth.ts             # JWT auth
    ├── prisma.ts           # Cliente Prisma singleton
    └── scheduler.ts        # Smart Study Scheduler

prisma/
├── schema.prisma           # Esquema de la base de datos
└── migrations/             # Migraciones SQL

seed.js                     # Script de seed inicial
railway.toml                # Configuración de Railway
```
