import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const globalForPrisma = globalThis;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurado no backend. Defina a conexão PostgreSQL do Supabase.');
}

export const prisma =
  globalForPrisma.__financePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__financePrisma = prisma;
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('prisma_disconnected');
});
