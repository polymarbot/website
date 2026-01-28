import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client'

/**
 * Bot Logs Database Client (PostgreSQL, read-only)
 *
 * Lazy initialization: client is created on first call to getBotLogsDb(),
 * allowing scripts to load environment variables before accessing the database.
 *
 * Global cache prevents duplicate connections during development HMR.
 */
const globalPrismaCache = globalThis as unknown as {
  botLogsDb?: PrismaClient
}

/**
 * Get or create the Bot Logs database client instance (lazy initialization)
 */
export function getBotLogsDb (): PrismaClient {
  if (globalPrismaCache.botLogsDb) {
    return globalPrismaCache.botLogsDb
  }

  const adapter = new PrismaPg({ connectionString: process.env.LOGS_DATABASE_URL! })
  const client = new PrismaClient({ adapter })

  // Cache globally to prevent duplicate connections during HMR
  globalPrismaCache.botLogsDb = client

  return client
}
