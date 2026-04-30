import { PrismaClient } from '../generated/prisma/client';
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

  const student = await prisma.user.findUnique({ where: { email: 'miley@ares.com' } });
  if (!student) {
    console.log('Estudiante no encontrado');
    return;
  }

  const subjects = await prisma.subject.findMany();
  
  for (const s of subjects) {
    await prisma.enrollment.upsert({
      where: { 
        studentId_subjectId: { studentId: student.id, subjectId: s.id } 
      },
      update: {},
      create: { studentId: student.id, subjectId: s.id }
    });
  }

  console.log(`Estudiante ${student.name} inscrito en ${subjects.length} materias.`);
  await prisma.$disconnect();
}

main().catch(console.error);
