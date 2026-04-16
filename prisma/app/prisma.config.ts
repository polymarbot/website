import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './schema',
  migrations: {
    path: './migrations',
  },
  datasource: {
    url: process.env.APP_DATABASE_URL!,
  },
})
