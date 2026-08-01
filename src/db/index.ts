import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let client: NeonHttpDatabase<typeof schema> | undefined

/** Connects on first use, so a build without DATABASE_URL still succeeds. */
export function db(): NeonHttpDatabase<typeof schema> {
  if (!client) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.')
    }
    client = drizzle(url, { schema })
  }
  return client
}
