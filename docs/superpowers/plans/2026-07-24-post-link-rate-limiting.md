# POST /api/links Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limitar cada IP a 10 tentativas por janela fixa de 60 segundos somente no `POST /api/links`, usando memória local e retornando `429` com cabeçalhos de renovação.

**Architecture:** A configuração continuará centralizada em `env.ts`. Um serviço sem dependência de HTTP controlará janelas e contadores, um utilitário isolado resolverá o IP com política explícita de proxy e a rota aplicará ambos em um `beforeHandle` local. A aplicação ganhará uma factory para que cada teste de integração receba um rate limiter novo e um relógio determinístico.

**Tech Stack:** Bun 1.x, TypeScript estrito, Elysia 1.4.x, `bun:test`.

## Global Constraints

- Aplicar o limite somente a `POST /api/links`.
- Usar por padrão exatamente 10 tentativas por janela fixa de 60 segundos.
- Manter os contadores apenas em memória e assumir uma única instância do backend.
- Não adicionar Redis, banco de dados, AWS WAF ou pacote de rate limiting.
- Não alterar o frontend.
- `X-Forwarded-For` só pode ser usado quando `TRUST_PROXY=true`.
- Toda etapa termina com testes, commit próprio, relatório e parada para aprovação.
- Não iniciar a etapa seguinte sem aprovação explícita do usuário.
- Não reconciliar a branch atual com `origin/main` dentro deste plano.
- O problema Docker já identificado nesta branch permanece fora do escopo.

## Mapa de arquivos

**Criar:**

- `backend/tests/env.test.ts`: valida os parsers das novas variáveis.
- `backend/src/services/rate-limit.service.ts`: contador em memória independente de HTTP.
- `backend/tests/rate-limit.service.test.ts`: especifica janela, bloqueio, isolamento e limpeza.
- `backend/src/utils/client-ip.ts`: resolve IP direto, proxy confiável ou fallback.
- `backend/tests/client-ip.test.ts`: especifica a política contra spoofing.
- `backend/tests/rate-limit.integration.test.ts`: valida o contrato HTTP completo.

**Modificar:**

- `backend/src/config/env.ts`: expõe `rateLimitMax`, `rateLimitWindowSeconds` e `trustProxy`.
- `backend/.env.example`: documenta os valores padrão.
- `backend/src/schemas/link.schema.ts`: adiciona o schema da resposta `429`.
- `backend/src/routes/link.routes.ts`: cria uma factory e aplica o hook somente ao POST.
- `backend/src/app.ts`: cria uma factory de aplicação com dependências substituíveis em testes.
- `docker-compose.yml`: transmite a configuração padrão ao container.
- `README.md`: documenta comportamento, cabeçalhos e limite de uma única instância.

## Regra de execução e checkpoints

Cada etapa abaixo é uma unidade revisável. Depois do commit indicado:

1. apresentar o hash do commit;
2. listar arquivos alterados;
3. explicar o comportamento entregue;
4. informar comandos e resultados dos testes;
5. informar riscos ou verificações pendentes;
6. escrever `CHECKPOINT N — aguardando sua aprovação`;
7. parar sem executar comandos da etapa seguinte.

---

### Etapa 1: Configuração validada

**Files:**

- Create: `backend/tests/env.test.ts`
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`

**Interfaces:**

- Produces: `parsePositiveInteger(name, value, fallback): number`
- Produces: `parseBoolean(name, value, fallback): boolean`
- Produces: `env.rateLimitMax: number`
- Produces: `env.rateLimitWindowSeconds: number`
- Produces: `env.trustProxy: boolean`

- [ ] **Step 1: escrever testes falhando para os parsers**

Criar `backend/tests/env.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { parseBoolean, parsePositiveInteger } from '../src/config/env'

describe('parsePositiveInteger', () => {
  it('usa o valor padrão quando a variável está ausente', () => {
    expect(parsePositiveInteger('RATE_LIMIT_MAX', undefined, 10)).toBe(10)
  })

  it('aceita um inteiro positivo configurado', () => {
    expect(parsePositiveInteger('RATE_LIMIT_MAX', '25', 10)).toBe(25)
  })

  it.each(['0', '-1', '1.5', 'texto'])(
    'rejeita o valor inválido %s',
    (value) => {
      expect(() =>
        parsePositiveInteger('RATE_LIMIT_MAX', value, 10),
      ).toThrow('RATE_LIMIT_MAX deve ser um número inteiro positivo')
    },
  )
})

describe('parseBoolean', () => {
  it('usa o valor padrão quando a variável está ausente', () => {
    expect(parseBoolean('TRUST_PROXY', undefined, false)).toBe(false)
  })

  it('aceita somente true e false', () => {
    expect(parseBoolean('TRUST_PROXY', 'true', false)).toBe(true)
    expect(parseBoolean('TRUST_PROXY', 'false', true)).toBe(false)
  })

  it('rejeita qualquer outro texto', () => {
    expect(() => parseBoolean('TRUST_PROXY', '1', false)).toThrow(
      'TRUST_PROXY deve ser true ou false',
    )
  })
})
```

- [ ] **Step 2: executar o teste e confirmar a falha**

Run from `backend/`:

```powershell
bun test tests/env.test.ts
```

Expected: FAIL porque `parseBoolean` e `parsePositiveInteger` ainda não são
exportados.

- [ ] **Step 3: centralizar parsing e expor a configuração**

Substituir `backend/src/config/env.ts` por:

```ts
export function parsePositiveInteger(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? fallback)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} deve ser um número inteiro positivo`)
  }

  return parsed
}

export function parseBoolean(
  name: string,
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) {
    return fallback
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  throw new Error(`${name} deve ser true ou false`)
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '')
}

const port = parsePositiveInteger('PORT', Bun.env.PORT, 3000)
const publicBaseUrl = stripTrailingSlashes(
  Bun.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`,
)

export const env = {
  port,
  frontendUrl: Bun.env.FRONTEND_URL ?? 'http://localhost:5173',
  publicBaseUrl,
  rateLimitMax: parsePositiveInteger(
    'RATE_LIMIT_MAX',
    Bun.env.RATE_LIMIT_MAX,
    10,
  ),
  rateLimitWindowSeconds: parsePositiveInteger(
    'RATE_LIMIT_WINDOW_SECONDS',
    Bun.env.RATE_LIMIT_WINDOW_SECONDS,
    60,
  ),
  trustProxy: parseBoolean('TRUST_PROXY', Bun.env.TRUST_PROXY, false),
} as const
```

Acrescentar ao fim de `backend/.env.example`:

```dotenv
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_SECONDS=60
TRUST_PROXY=false
```

- [ ] **Step 4: executar teste focado e suíte completa**

Run from `backend/`:

```powershell
bun test tests/env.test.ts
bun test
```

Expected: o teste novo passa e os 20 testes anteriores continuam passando.

- [ ] **Step 5: revisar e registrar o commit**

```powershell
git diff -- backend/src/config/env.ts backend/.env.example backend/tests/env.test.ts
git add backend/src/config/env.ts backend/.env.example backend/tests/env.test.ts
git commit -m "feat: configure link rate limiting"
```

- [ ] **CHECKPOINT 1: relatar a configuração e parar**

Relatar valores padrão, validações, testes e hash do commit. Não iniciar a
Etapa 2 sem aprovação explícita.

---

### Etapa 2: Núcleo do contador em memória

**Files:**

- Create: `backend/src/services/rate-limit.service.ts`
- Create: `backend/tests/rate-limit.service.test.ts`

**Interfaces:**

- Produces: `RateLimitDecision`
- Produces: `RateLimiter.consume(key: string): RateLimitDecision`
- Produces: `InMemoryRateLimiter`
- Consumes later: `createApp` e `createLinkRoutes`

- [ ] **Step 1: escrever testes falhando para a janela fixa**

Criar `backend/tests/rate-limit.service.test.ts`:

```ts
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
```

- [ ] **Step 2: executar o teste e confirmar a falha**

Run from `backend/`:

```powershell
bun test tests/rate-limit.service.test.ts
```

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: implementar o serviço sem dependência de HTTP**

Criar `backend/src/services/rate-limit.service.ts`:

```ts
export interface RateLimitDecision {
  allowed: boolean
  limit: number
  remaining: number
  resetAfterSeconds: number
}

export interface RateLimiter {
  consume(key: string): RateLimitDecision
}

export interface InMemoryRateLimiterOptions {
  maxRequests: number
  windowMs: number
  now?: () => number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>()
  private readonly now: () => number
  private nextCleanupAt = 0

  constructor(private readonly options: InMemoryRateLimiterOptions) {
    this.now = options.now ?? Date.now
  }

  get entryCount(): number {
    return this.entries.size
  }

  consume(key: string): RateLimitDecision {
    const now = this.now()
    this.cleanupIfDue(now)

    const current = this.entries.get(key)
    const entry =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + this.options.windowMs }

    if (entry.count >= this.options.maxRequests) {
      return this.decision(false, 0, entry.resetAt, now)
    }

    entry.count += 1
    this.entries.set(key, entry)

    return this.decision(
      true,
      this.options.maxRequests - entry.count,
      entry.resetAt,
      now,
    )
  }

  private decision(
    allowed: boolean,
    remaining: number,
    resetAt: number,
    now: number,
  ): RateLimitDecision {
    return {
      allowed,
      limit: this.options.maxRequests,
      remaining,
      resetAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1_000)),
    }
  }

  private cleanupIfDue(now: number): void {
    if (now < this.nextCleanupAt) {
      return
    }

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key)
      }
    }

    this.nextCleanupAt = now + this.options.windowMs
  }
}
```

- [ ] **Step 4: executar teste focado e suíte completa**

Run from `backend/`:

```powershell
bun test tests/rate-limit.service.test.ts
bun test
```

Expected: os 5 testes do serviço passam e nenhuma regressão aparece.

- [ ] **Step 5: revisar e registrar o commit**

```powershell
git diff -- backend/src/services/rate-limit.service.ts backend/tests/rate-limit.service.test.ts
git add backend/src/services/rate-limit.service.ts backend/tests/rate-limit.service.test.ts
git commit -m "feat: add in-memory rate limiter"
```

- [ ] **CHECKPOINT 2: relatar o contador e parar**

Relatar semântica da janela fixa, limpeza, isolamento, testes e hash do commit.
Não iniciar a Etapa 3 sem aprovação explícita.

---

### Etapa 3: Resolução segura do endereço do cliente

**Files:**

- Create: `backend/src/utils/client-ip.ts`
- Create: `backend/tests/client-ip.test.ts`

**Interfaces:**

- Produces: `ResolveClientIpInput`
- Produces: `resolveClientIp(input): string`
- Consumes later: hook de `POST /api/links`

- [ ] **Step 1: escrever testes falhando para proxy e fallback**

Criar `backend/tests/client-ip.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { resolveClientIp } from '../src/utils/client-ip'

function requestWithForwardedFor(value?: string): Request {
  return new Request('http://localhost/api/links', {
    headers: value ? { 'X-Forwarded-For': value } : undefined,
  })
}

describe('resolveClientIp', () => {
  it('ignora X-Forwarded-For quando o proxy não é confiável', () => {
    expect(
      resolveClientIp({
        request: requestWithForwardedFor('203.0.113.99'),
        directAddress: '198.51.100.10',
        trustProxy: false,
      }),
    ).toBe('198.51.100.10')
  })

  it('usa o primeiro endereço encaminhado quando o proxy é confiável', () => {
    expect(
      resolveClientIp({
        request: requestWithForwardedFor(
          ' 203.0.113.99, 198.51.100.200 ',
        ),
        directAddress: '198.51.100.10',
        trustProxy: true,
      }),
    ).toBe('203.0.113.99')
  })

  it('usa o endereço direto quando o cabeçalho confiável está vazio', () => {
    expect(
      resolveClientIp({
        request: requestWithForwardedFor('   '),
        directAddress: '198.51.100.10',
        trustProxy: true,
      }),
    ).toBe('198.51.100.10')
  })

  it('usa unknown quando nenhum endereço está disponível', () => {
    expect(
      resolveClientIp({
        request: requestWithForwardedFor(),
        directAddress: null,
        trustProxy: false,
      }),
    ).toBe('unknown')
  })
})
```

- [ ] **Step 2: executar o teste e confirmar a falha**

Run from `backend/`:

```powershell
bun test tests/client-ip.test.ts
```

Expected: FAIL porque o utilitário ainda não existe.

- [ ] **Step 3: implementar a política de confiança**

Criar `backend/src/utils/client-ip.ts`:

```ts
export interface ResolveClientIpInput {
  request: Request
  directAddress: string | null | undefined
  trustProxy: boolean
}

export function resolveClientIp({
  request,
  directAddress,
  trustProxy,
}: ResolveClientIpInput): string {
  if (trustProxy) {
    const forwardedAddress = request.headers
      .get('x-forwarded-for')
      ?.split(',')[0]
      ?.trim()

    if (forwardedAddress) {
      return forwardedAddress
    }
  }

  return directAddress?.trim() || 'unknown'
}
```

- [ ] **Step 4: executar teste focado e suíte completa**

Run from `backend/`:

```powershell
bun test tests/client-ip.test.ts
bun test
```

Expected: os 4 testes do resolvedor passam e nenhuma regressão aparece.

- [ ] **Step 5: revisar e registrar o commit**

```powershell
git diff -- backend/src/utils/client-ip.ts backend/tests/client-ip.test.ts
git add backend/src/utils/client-ip.ts backend/tests/client-ip.test.ts
git commit -m "feat: resolve client ip for rate limiting"
```

- [ ] **CHECKPOINT 3: relatar segurança de proxy e parar**

Relatar precedência do IP, proteção contra spoofing, fallback, testes e hash do
commit. Não iniciar a Etapa 4 sem aprovação explícita.

---

### Etapa 4: Integração exclusiva com POST /api/links

**Files:**

- Modify: `backend/src/schemas/link.schema.ts`
- Modify: `backend/src/routes/link.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/rate-limit.integration.test.ts`

**Interfaces:**

- Consumes: `RateLimiter.consume(key)`
- Consumes: `resolveClientIp(input)`
- Produces: `createLinkRoutes(options)`
- Produces: `createApp(options)`
- Preserves: `app` como instância padrão usada por `index.ts` e testes atuais

- [ ] **Step 1: escrever testes de integração falhando**

Criar `backend/tests/rate-limit.integration.test.ts`:

```ts
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
```

- [ ] **Step 2: executar o teste e confirmar a falha**

Run from `backend/`:

```powershell
bun test tests/rate-limit.integration.test.ts
```

Expected: FAIL porque `createApp` e a integração do limite ainda não existem.

- [ ] **Step 3: adicionar schema da resposta 429**

Acrescentar a `backend/src/schemas/link.schema.ts`:

```ts
export const rateLimitErrorResponseSchema = t.Object({
  error: t.String(),
})
```

- [ ] **Step 4: transformar as rotas em factory e adicionar beforeHandle**

Substituir `backend/src/routes/link.routes.ts` por:

```ts
import { Elysia } from 'elysia'
import { linkController } from '../controllers/link.controller'
import type { RateLimiter } from '../services/rate-limit.service'
import {
  createLinkBodySchema,
  createLinkResponseSchema,
  rateLimitErrorResponseSchema,
} from '../schemas/link.schema'
import { resolveClientIp } from '../utils/client-ip'

export interface LinkRoutesOptions {
  rateLimiter: RateLimiter
  trustProxy: boolean
}

export function createLinkRoutes({
  rateLimiter,
  trustProxy,
}: LinkRoutesOptions) {
  return new Elysia()
    .post(
      '/api/links',
      async ({ body, set }) => {
        const { reused, ...link } = await linkController.create(body.url)
        set.status = reused ? 200 : 201
        return link
      },
      {
        beforeHandle({ request, server, set }) {
          const clientIp = resolveClientIp({
            request,
            directAddress: server?.requestIP(request)?.address,
            trustProxy,
          })
          const decision = rateLimiter.consume(clientIp)

          set.headers['RateLimit-Limit'] = String(decision.limit)
          set.headers['RateLimit-Remaining'] = String(decision.remaining)
          set.headers['RateLimit-Reset'] = String(
            decision.resetAfterSeconds,
          )

          if (!decision.allowed) {
            set.status = 429
            set.headers['Retry-After'] = String(
              decision.resetAfterSeconds,
            )
            return {
              error: 'Muitas requisições. Tente novamente em instantes.',
            }
          }
        },
        body: createLinkBodySchema,
        response: {
          200: createLinkResponseSchema,
          201: createLinkResponseSchema,
          429: rateLimitErrorResponseSchema,
        },
      },
    )
    .get('/:code', async ({ params, redirect, set }) => {
      const originalUrl = await linkController.findOriginalUrl(params.code)

      if (!originalUrl) {
        set.status = 404
        return { error: 'Link não encontrado' }
      }

      return redirect(originalUrl, 302)
    })
}
```

- [ ] **Step 5: criar a factory da aplicação e preservar o export atual**

Substituir `backend/src/app.ts` por:

```ts
import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { env } from './config/env'
import { errorHandler } from './middlewares/error-handler'
import { healthRoutes } from './routes/health.routes'
import { createLinkRoutes } from './routes/link.routes'
import {
  InMemoryRateLimiter,
  type RateLimiter,
} from './services/rate-limit.service'

export interface CreateAppOptions {
  rateLimiter?: RateLimiter
  trustProxy?: boolean
}

export function createApp(options: CreateAppOptions = {}) {
  const rateLimiter =
    options.rateLimiter ??
    new InMemoryRateLimiter({
      maxRequests: env.rateLimitMax,
      windowMs: env.rateLimitWindowSeconds * 1_000,
    })

  return new Elysia()
    .use(
      cors({
        origin: env.frontendUrl,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      }),
    )
    .use(errorHandler)
    .use(healthRoutes)
    .use(
      createLinkRoutes({
        rateLimiter,
        trustProxy: options.trustProxy ?? env.trustProxy,
      }),
    )
}

export const app = createApp()
```

- [ ] **Step 6: executar testes focados, suíte e typecheck**

Run from repository root:

```powershell
bun test backend/tests/rate-limit.integration.test.ts
bun run test
bunx tsc -p backend/tsconfig.json
```

Expected:

- 6 testes de integração do rate limit passam;
- todos os testes anteriores continuam passando;
- TypeScript encerra com código 0 e sem diagnóstico.

- [ ] **Step 7: revisar e registrar o commit**

```powershell
git diff -- backend/src/schemas/link.schema.ts backend/src/routes/link.routes.ts backend/src/app.ts backend/tests/rate-limit.integration.test.ts
git add backend/src/schemas/link.schema.ts backend/src/routes/link.routes.ts backend/src/app.ts backend/tests/rate-limit.integration.test.ts
git commit -m "feat: rate limit post link requests by ip"
```

- [ ] **CHECKPOINT 4: demonstrar o contrato HTTP e parar**

Relatar respostas 201/200/422/429, cabeçalhos, exclusão dos GETs, testes,
typecheck e hash do commit. Não iniciar a Etapa 5 sem aprovação explícita.

---

### Etapa 5: Configuração de execução, documentação e verificação final

**Files:**

- Modify: `docker-compose.yml`
- Modify: `README.md`

**Interfaces:**

- Consumes: as três variáveis definidas na Etapa 1
- Produces: documentação operacional do limite e da restrição de uma instância

- [ ] **Step 1: transmitir os padrões no Compose**

Em `docker-compose.yml`, acrescentar ao bloco `backend.environment`, depois de
`PUBLIC_BASE_URL`:

```yaml
      RATE_LIMIT_MAX: 10
      RATE_LIMIT_WINDOW_SECONDS: 60
      TRUST_PROXY: "false"
```

- [ ] **Step 2: documentar o contrato operacional**

Acrescentar ao fim de `README.md`:

```markdown
## Rate limiting

O `POST /api/links` permite por padrão 10 tentativas por endereço IP em cada
janela fixa de 60 segundos. Respostas aceitas incluem `RateLimit-Limit`,
`RateLimit-Remaining` e `RateLimit-Reset`. Quando o limite é excedido, a API
retorna `429 Too Many Requests` e também informa `Retry-After`.

Configuração do backend:

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `RATE_LIMIT_MAX` | `10` | Máximo de tentativas por IP e janela |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Duração da janela fixa |
| `TRUST_PROXY` | `false` | Permite usar o primeiro IP de `X-Forwarded-For` |

Ative `TRUST_PROXY=true` somente atrás de um proxy controlado que substitua o
cabeçalho recebido do cliente. Os contadores ficam em memória e não são
compartilhados entre processos ou réplicas; esta implementação pressupõe uma
única instância do backend.
```

- [ ] **Step 3: executar todas as verificações locais**

Run from repository root:

```powershell
bun run test
bunx tsc -p backend/tsconfig.json
bun run build
docker compose config
git status --short
```

Expected:

- toda a suíte passa;
- TypeScript encerra sem diagnóstico;
- o frontend compila;
- o Compose é válido e mostra as três variáveis;
- somente `README.md` e `docker-compose.yml` aparecem pendentes antes do
  commit.

- [ ] **Step 4: registrar o commit de documentação e configuração**

```powershell
git diff -- README.md docker-compose.yml
git add README.md docker-compose.yml
git commit -m "docs: document link rate limiting"
```

- [ ] **Step 5: confirmar histórico e árvore limpa**

```powershell
git log -5 --oneline
git status --short
```

Expected:

- cinco commits focados do rate limiting aparecem após o commit deste plano;
- a árvore de trabalho está limpa.

- [ ] **Step 6: registrar explicitamente a limitação Docker conhecida**

Não alterar Dockerfiles ou criar `.dockerignore` nesta etapa. O relatório final
deve registrar que o smoke test da imagem continua condicionado à
reconciliação da preparação Docker já existente em `origin/main`. Essa
pendência não invalida os testes locais do rate limiting e não autoriza ampliar
o escopo.

- [ ] **CHECKPOINT 5: entregar o relatório final e parar**

Relatar:

- comportamento completo entregue;
- arquivos e cinco commits de implementação;
- quantidade total de testes;
- resultado do typecheck, build e `docker compose config`;
- confirmação de árvore limpa;
- smoke test Docker pendente e sua causa já conhecida.

Não fazer push, merge, criação de PR ou implantação sem uma solicitação
separada do usuário.

## Resultado esperado do plano

Depois dos cinco checkpoints aprovados:

- apenas `POST /api/links` estará protegido;
- cada IP terá 10 tentativas por janela fixa de 60 segundos;
- a 11ª tentativa retornará `429` com tempo de renovação;
- IP direto e proxy confiável terão comportamentos explícitos e testados;
- não haverá dependência nova;
- a configuração estará disponível em `.env` e Compose;
- testes, typecheck e build local estarão verificados;
- nenhuma próxima etapa será executada sem revisão do usuário.
