import { beforeEach, describe, expect, it, vi } from 'vitest'

const counted = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/db', () => ({
  db: () => ({
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: async () => [{ count: counted.count }] }),
      }),
    }),
  }),
}))

const { allowAction, DAILY_LIMITS } = await import('./usage')

describe('allowAction', () => {
  beforeEach(() => {
    counted.count = 0
  })

  it('allows the last use within the daily limit', async () => {
    counted.count = DAILY_LIMITS.email
    expect(await allowAction('user', 'email')).toBe(true)
  })

  it('refuses once the daily limit is passed', async () => {
    counted.count = DAILY_LIMITS.email + 1
    expect(await allowAction('user', 'email')).toBe(false)
  })
})
