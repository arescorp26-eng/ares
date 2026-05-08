import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL no está configurada.');
    process.exit(1);
  }

  console.log('🔗 Conectando a la base de datos...');
  const url = new URL(dbUrl);
  
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
  });

  const prisma = new PrismaClient({ adapter });

  try {
    // Crear/actualizar admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { email: 'admin@ares.com' },
      update: { password: hashedPassword },
      create: {
        email: 'admin@ares.com',
        password: hashedPassword,
        name: 'Administrador Ares',
        role: 'ADMIN'
      }
    });
    console.log('✅ Usuario ADMIN garantizado: admin@ares.com / admin123');

    // Crear logros base
    const achievements = [
      { id: 1, name: 'Primer Paso', description: 'Completaste tu primera sesión de estudio.', icon: 'Zap', xpBonus: 100 },
      { id: 2, name: 'Estudioso', description: 'Completaste 5 sesiones de estudio.', icon: 'Book', xpBonus: 250 },
      { id: 3, name: 'Genio IA', description: 'Sacaste 100% en tu primer Quiz generado por IA.', icon: 'Brain', xpBonus: 500 },
      { id: 4, name: 'Racha Imparable', description: 'Estudiaste 3 días seguidos.', icon: 'Flame', xpBonus: 300 }
    ];

    for (const a of achievements) {
      await prisma.achievement.upsert({
        where: { id: a.id },
        update: a,
        create: a
      });
    }
    console.log('✅ Logros inicializados correctamente.');

  } catch (e) {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
