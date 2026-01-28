import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client'

/**
 * App Database Client (PostgreSQL via Prisma Accelerate)
 *
 * Uses Prisma Accelerate as a connection proxy, requires `accelerateUrl` parameter.
 * For direct database connections (without Accelerate), no parameters needed.
 *
 * Lazy initialization: client is created on first call to getAppDb(),
 * allowing scripts to load environment variables before accessing the database.
 *
 * Global cache prevents duplicate connections during development HMR.
 */
const globalPrismaCache = globalThis as unknown as {
  appDb?: PrismaClient
}

/**
 * Get or create the App database client instance (lazy initialization)
 */
export function getAppDb (): PrismaClient {
  if (globalPrismaCache.appDb) {
    return globalPrismaCache.appDb
  }

  const adapter = new PrismaPg({ connectionString: process.env.APP_DATABASE_URL! })
  const client = new PrismaClient({ adapter })
  // const client = new PrismaClient({ accelerateUrl: process.env.APP_DATABASE_URL! })

  // Cache globally to prevent duplicate connections during HMR
  globalPrismaCache.appDb = client

  return client
}
