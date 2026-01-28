import '../../config/env'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: './schema.prisma',
  datasource: {
    url: env('LOGS_DATABASE_URL'),
  },
})
