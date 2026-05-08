import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const url = new URL(dbUrl);
  
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
  });

  return new PrismaClient({ adapter });
}

declare global {
  var _prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Lazy singleton: only connects when first accessed at runtime, not during build
const prisma = new Proxy({} as ReturnType<typeof prismaClientSingleton>, {
  get(_target, prop) {
    if (!globalThis._prisma) {
      globalThis._prisma = prismaClientSingleton();
    }
    return (globalThis._prisma as any)[prop];
  },
});

export default prisma
