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
