const port = Number(Bun.env.PORT ?? 3000)

if (!Number.isInteger(port) || port <= 0) {
  throw new Error('PORT deve ser um número inteiro positivo')
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '')
}

const publicBaseUrl = stripTrailingSlashes(
  Bun.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`,
)

export const env = {
  port,
  frontendUrl: Bun.env.FRONTEND_URL ?? 'http://localhost:5173',
  publicBaseUrl,
} as const
