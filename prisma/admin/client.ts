import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client'

/**
 * Admin Database Client
 *
 * Lazy initialization: client is created on first call to getAdminDb(),
 * allowing scripts to load environment variables before accessing the database.
 *
 * Global cache prevents duplicate connections during development HMR.
 */
const globalPrismaCache = globalThis as unknown as {
  adminDb?: PrismaClient
}

/**
 * Get or create the Admin database client instance (lazy initialization)
 */
export function getAdminDb (): PrismaClient {
  if (globalPrismaCache.adminDb) {
    return globalPrismaCache.adminDb
  }

  const adapter = new PrismaPg({ connectionString: process.env.ADMIN_DATABASE_URL! })
  const client = new PrismaClient({ adapter })

  // Cache globally to prevent duplicate connections during HMR
  globalPrismaCache.adminDb = client

  return client
}
