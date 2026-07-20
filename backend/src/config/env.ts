const port = Number(Bun.env.PORT ?? 3000)

if (!Number.isInteger(port) || port <= 0) {
  throw new Error('PORT deve ser um número inteiro positivo')
}

export const env = {
  port,
  frontendUrl: Bun.env.FRONTEND_URL ?? 'http://localhost:5173',
  publicApiUrl: Bun.env.PUBLIC_API_URL ?? `http://localhost:${port}`,
} as const
