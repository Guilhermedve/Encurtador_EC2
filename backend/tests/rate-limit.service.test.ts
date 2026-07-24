import { describe, expect, it } from 'bun:test'
import { InMemoryRateLimiter } from '../src/services/rate-limit.service'

function createFixture(maxRequests = 10, windowMs = 60_000) {
  let now = 0
  const limiter = new InMemoryRateLimiter({
    maxRequests,
    windowMs,
    now: () => now,
  })

  return {
    limiter,
    advanceTo(value: number) {
      now = value
    },
  }
}

describe('InMemoryRateLimiter', () => {
  it('permite dez tentativas e bloqueia a décima primeira', () => {
    const { limiter } = createFixture()

    for (let attempt = 1; attempt <= 10; attempt++) {
      expect(limiter.consume('198.51.100.10')).toEqual({
        allowed: true,
        limit: 10,
        remaining: 10 - attempt,
        resetAfterSeconds: 60,
      })
    }

    expect(limiter.consume('198.51.100.10')).toEqual({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAfterSeconds: 60,
    })
  })

  it('renova a janela depois de sessenta segundos', () => {
    const { limiter, advanceTo } = createFixture(1)

    expect(limiter.consume('198.51.100.10').allowed).toBe(true)
    expect(limiter.consume('198.51.100.10').allowed).toBe(false)

    advanceTo(60_000)

    expect(limiter.consume('198.51.100.10')).toEqual({
      allowed: true,
      limit: 1,
      remaining: 0,
      resetAfterSeconds: 60,
    })
  })

  it('mantém contadores independentes por IP', () => {
    const { limiter } = createFixture(1)

    expect(limiter.consume('198.51.100.10').allowed).toBe(true)
    expect(limiter.consume('198.51.100.10').allowed).toBe(false)
    expect(limiter.consume('203.0.113.20').allowed).toBe(true)
  })

  it('arredonda a renovação para cima', () => {
    const { limiter, advanceTo } = createFixture(1)

    limiter.consume('198.51.100.10')
    advanceTo(59_001)

    expect(limiter.consume('198.51.100.10').resetAfterSeconds).toBe(1)
  })

  it('remove entradas expiradas durante a limpeza', () => {
    const { limiter, advanceTo } = createFixture(1)

    limiter.consume('198.51.100.10')
    expect(limiter.entryCount).toBe(1)

    advanceTo(60_000)
    limiter.consume('203.0.113.20')

    expect(limiter.entryCount).toBe(1)
  })
})
