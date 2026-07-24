import { describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { InMemoryRateLimiter } from '../src/services/rate-limit.service'

function createFixture(maxRequests = 10) {
  let now = 0
  const app = createApp({
    rateLimiter: new InMemoryRateLimiter({
      maxRequests,
      windowMs: 60_000,
      now: () => now,
    }),
    trustProxy: true,
  })

  return {
    app,
    advanceTo(value: number) {
      now = value
    },
  }
}

function postLink(
  app: ReturnType<typeof createApp>,
  url: string,
  ip = '198.51.100.10',
) {
  return app.handle(
    new Request('http://localhost/api/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
      },
      body: JSON.stringify({ url }),
    }),
  )
}

describe('rate limiting de POST /api/links', () => {
  it('informa limite, saldo e renovação em uma resposta permitida', async () => {
    const { app } = createFixture()
    const response = await postLink(app, 'https://exemplo.com/cabecalhos')

    expect(response.status).toBe(201)
    expect(response.headers.get('RateLimit-Limit')).toBe('10')
    expect(response.headers.get('RateLimit-Remaining')).toBe('9')
    expect(response.headers.get('RateLimit-Reset')).toBe('60')
    expect(response.headers.get('Retry-After')).toBeNull()
  })

  it('retorna 429 e Retry-After na décima primeira tentativa', async () => {
    const { app } = createFixture()

    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await postLink(
        app,
        'https://exemplo.com/mesmo-link',
      )
      expect([200, 201]).toContain(response.status)
    }

    const response = await postLink(
      app,
      'https://exemplo.com/mesmo-link',
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('RateLimit-Limit')).toBe('10')
    expect(response.headers.get('RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('RateLimit-Reset')).toBe('60')
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(await response.json()).toEqual({
      error: 'Muitas requisições. Tente novamente em instantes.',
    })
  })

  it('contabiliza uma URL semanticamente inválida', async () => {
    const { app } = createFixture(1)

    expect((await postLink(app, 'http://exemplo.com')).status).toBe(422)
    expect(
      (await postLink(app, 'https://exemplo.com/valido')).status,
    ).toBe(429)
  })

  it('mantém limites independentes para IPs diferentes', async () => {
    const { app } = createFixture(1)

    expect(
      (
        await postLink(
          app,
          'https://exemplo.com/ip-a',
          '198.51.100.10',
        )
      ).status,
    ).toBe(201)
    expect(
      (
        await postLink(
          app,
          'https://exemplo.com/ip-b',
          '203.0.113.20',
        )
      ).status,
    ).toBe(201)
  })

  it('libera novamente depois da renovação', async () => {
    const { app, advanceTo } = createFixture(1)

    expect(
      (await postLink(app, 'https://exemplo.com/janela')).status,
    ).toBe(201)
    expect(
      (await postLink(app, 'https://exemplo.com/janela')).status,
    ).toBe(429)

    advanceTo(60_000)

    expect(
      (await postLink(app, 'https://exemplo.com/janela')).status,
    ).toBe(200)
  })

  it('não limita GET /health nem GET /:code', async () => {
    const { app } = createFixture(1)
    const created = await (
      await postLink(app, 'https://exemplo.com/redirecionamento')
    ).json()

    expect(
      (
        await postLink(
          app,
          'https://exemplo.com/bloqueado',
        )
      ).status,
    ).toBe(429)

    const health = await app.handle(
      new Request('http://localhost/health'),
    )
    const redirect = await app.handle(
      new Request(`http://localhost/${created.code}`, {
        redirect: 'manual',
      }),
    )

    expect(health.status).toBe(200)
    expect(redirect.status).toBe(302)
  })
})
