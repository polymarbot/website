import { join } from 'node:path'

// Use full resolved paths for layer (~ resolves to consuming app, not layer)
const currentDir = import.meta.dirname

export default defineNuxtConfig({
  components: [
    // Layer's own components (absolute paths required)
    { path: join(currentDir, 'app/components/ui'), pathPrefix: false },
    { path: join(currentDir, 'app/components'), pathPrefix: true },
  ],

  imports: {
    dirs: [
      // Layer auto-imports (absolute paths required)
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
        // Layer server auto-imports (absolute paths required)
        join(currentDir, 'server/types/**'),
        join(currentDir, 'server/utils/**'),
        join(currentDir, 'shared/types/**'),
        join(currentDir, 'shared/utils/**'),
      ],
    },
  },
})
