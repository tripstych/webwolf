import pkg from '@prisma/client';
import 'dotenv/config';

const { PrismaClient } = pkg;

let prisma;

function initializePrisma() {
  // Build DATABASE_URL from environment variables if not already set
  if (!process.env.DATABASE_URL) {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'webwolf_cms';

    const dbUrl = password
      ? `mysql://${user}:${password}@${host}:${port}/${database}`
      : `mysql://${user}@${host}:${port}/${database}`;

    process.env.DATABASE_URL = dbUrl;
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });
}

export function getPrisma() {
  if (!prisma) {
    prisma = initializePrisma();
  }
  return prisma;
}

export async function closePrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// Lazy-load Prisma on first use
let initialized = false;

export default new Proxy({}, {
  get: (target, prop) => {
    if (!initialized) {
      getPrisma();
      initialized = true;
    }
    return getPrisma()[prop];
  }
});
