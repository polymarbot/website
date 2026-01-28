import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client'

/**
 * Bot Database Client (MySQL, read-only)
 *
 * Lazy initialization: client is created on first call to getBotDb(),
 * allowing scripts to load environment variables before accessing the database.
 *
 * Global cache prevents duplicate connections during development HMR.
 */
const globalPrismaCache = globalThis as unknown as {
  botDb?: PrismaClient
}

/**
 * Get or create the Bot database client instance (lazy initialization)
 */
export function getBotDb (): PrismaClient {
  if (globalPrismaCache.botDb) {
    return globalPrismaCache.botDb
  }

  const adapter = new PrismaPg({ connectionString: process.env.BOT_DATABASE_URL! })
  const client = new PrismaClient({ adapter })

  // Cache globally to prevent duplicate connections during HMR
  globalPrismaCache.botDb = client

  return client
}
