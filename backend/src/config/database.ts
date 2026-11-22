import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in backend/.env');
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.info('Connected to Supabase PostgreSQL successfully!');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export async function testDatabaseConnection(): Promise<void> {
  try {
    console.info('Starting database connection test...');
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1`;
    console.info('Supabase connection successful!');
    console.info('Test query result:', result);
    console.info('Database test completed.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const safeMessage = message
      .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, '$1[redacted]@')
      .replace(/((?:password|secret)\s*[:=]\s*)\S+/gi, '$1[redacted]');
    console.error('Supabase connection failed:', safeMessage);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
