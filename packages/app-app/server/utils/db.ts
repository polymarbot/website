import { getAppDb } from '@root/prisma/app/client'
import { getBotDb } from '@root/prisma/bot/client'
import { getBotLogsDb } from '@root/prisma/bot_logs/client'

export const appDb = getAppDb()
export const botDb = getBotDb()
export const botLogsDb = getBotLogsDb()
