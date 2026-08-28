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

export type LinkRepositoryKind = 'memory' | 'azure-table'

const TABLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{2,62}$/

export function parseLinkRepositoryKind(
  value: string | undefined,
  nodeEnv: string,
): LinkRepositoryKind {
  const isProduction = nodeEnv === 'production'

  if (value === undefined) {
    if (isProduction) {
      throw new Error('LINK_REPOSITORY é obrigatório em produção')
    }
    return 'memory'
  }

  if (value === 'memory') {
    if (isProduction) {
      throw new Error('LINK_REPOSITORY=memory não é permitido em produção')
    }
    return 'memory'
  }

  if (value === 'azure-table') {
    return 'azure-table'
  }

  throw new Error(`LINK_REPOSITORY inválido: ${value}`)
}

export function requireHttpsUrl(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(`${name} é obrigatório`)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} deve ser uma URL válida`)
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${name} deve usar HTTPS`)
  }

  return value
}

export interface BackendEnv {
  nodeEnv: string
  linkRepository: LinkRepositoryKind
  azureStorageAccountUrl?: string
  azureStorageTableName: string
  azureStorageConnectionString?: string
  port: number
  frontendUrl: string
  publicBaseUrl: string
  rateLimitMax: number
  rateLimitWindowSeconds: number
  trustProxy: boolean
}

const nodeEnv = Bun.env.NODE_ENV ?? 'development'
const linkRepository = parseLinkRepositoryKind(
  Bun.env.LINK_REPOSITORY,
  nodeEnv,
)

const azureStorageConnectionString = Bun.env.AZURE_STORAGE_CONNECTION_STRING
if (azureStorageConnectionString && nodeEnv === 'production') {
  throw new Error(
    'AZURE_STORAGE_CONNECTION_STRING não é permitido em produção',
  )
}

let azureStorageAccountUrl: string | undefined
if (linkRepository === 'azure-table' && !azureStorageConnectionString) {
  azureStorageAccountUrl = requireHttpsUrl(
    'AZURE_STORAGE_ACCOUNT_URL',
    Bun.env.AZURE_STORAGE_ACCOUNT_URL,
  )
}

const azureStorageTableName = Bun.env.AZURE_STORAGE_TABLE_NAME ?? 'links'
if (!TABLE_NAME_PATTERN.test(azureStorageTableName)) {
  throw new Error(`AZURE_STORAGE_TABLE_NAME inválido: ${azureStorageTableName}`)
}

const port = parsePositiveInteger('PORT', Bun.env.PORT, 3000)
const publicBaseUrl = stripTrailingSlashes(
  Bun.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`,
)

export const env: BackendEnv = {
  nodeEnv,
  linkRepository,
  azureStorageAccountUrl,
  azureStorageTableName,
  azureStorageConnectionString,
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
