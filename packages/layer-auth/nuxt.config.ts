import { join } from 'node:path'

// Use full resolved paths for layer (~ resolves to consuming app, not layer)
const currentDir = import.meta.dirname

export default defineNuxtConfig({
  imports: {
    dirs: [
      join(currentDir, 'app/composables/**'),
      join(currentDir, 'app/types/**'),
      join(currentDir, 'app/utils/**'),
      join(currentDir, 'shared/types/**'),
      join(currentDir, 'shared/utils/**'),
    ],
  },

  nitro: {
    imports: {
      dirs: [
        join(currentDir, 'server/types/**'),
        join(currentDir, 'server/utils/**'),
        join(currentDir, 'shared/types/**'),
        join(currentDir, 'shared/utils/**'),
      ],
    },
  },
})
