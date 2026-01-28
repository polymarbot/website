// Re-export database clients from prisma modules
import { getAppDb } from '~~/prisma/app/client'
import { getBotDb } from '~~/prisma/bot/client'
import { getBotLogsDb } from '~~/prisma/bot_logs/client'

export const db = getAppDb()
export const botDb = getBotDb()
export const botLogsDb = getBotLogsDb()
