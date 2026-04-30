import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/ares_db';
  const url = new URL(dbUrl);
  
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
  });

  const prisma = new PrismaClient({ adapter });

  const achievements = [
    { id: 1, name: 'Primer Paso', description: 'Completaste tu primera sesión de estudio.', icon: 'Zap', xpBonus: 100 },
    { id: 2, name: 'Estudioso', description: 'Completaste 5 sesiones de estudio.', icon: 'Book', xpBonus: 250 },
    { id: 3, name: 'Genio IA', description: 'Sacaste 100% en tu primer Quiz generado por IA.', icon: 'Brain', xpBonus: 500 },
    { id: 4, name: 'Racha Imparable', description: 'Estudiaste 3 días seguidos.', icon: 'Flame', xpBonus: 300 }
  ];

  for (const a of achievements) {
    // @ts-ignore - Prisma 7 property naming might vary
    await prisma.achievement.upsert({
      where: { id: a.id },
      update: a,
      create: a
    });
  }

  console.log('Logros inicializados correctamente.');
  await prisma.$disconnect();
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
