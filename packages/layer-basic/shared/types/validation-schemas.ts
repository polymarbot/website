import type { z } from 'zod'

/** HTTP methods for API validation */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Schema key format: "METHOD /endpoint" */
export type SchemaKey = `${ApiMethod} ${string}`

/** Schema definition map indexed by "METHOD /endpoint" */
export type SchemaDefinitions = Record<SchemaKey, () => z.ZodType>
