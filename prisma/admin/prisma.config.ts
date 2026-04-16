import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './schema',
  datasource: {
    url: process.env.ADMIN_DATABASE_URL!,
  },
})
