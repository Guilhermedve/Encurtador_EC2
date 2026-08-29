import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { TableClient } from '@azure/data-tables'
import { AzureLinkTableClient } from '../src/storage/link-table.client'
import { AzureTableLinkRepository } from '../src/repositories/azure-table-link.repository'
import { LinkStorageUnavailableError } from '../src/errors/link-storage.error'

const connectionString = Bun.env.AZURE_STORAGE_CONNECTION_STRING

function isSafeConnectionString(value: string): boolean {
  if (value.includes('UseDevelopmentStorage=true')) return true
  const match = value.match(/TableEndpoint=([^;]+)/i)
  if (!match) return false
  const host = new URL(match[1]!).hostname
  return (
    host === '127.0.0.1' ||
    host === 'localhost' ||
    host === 'azurite' ||
    host === '0.0.0.0' ||
    host === '::1'
  )
}

const safe = connectionString ? isSafeConnectionString(connectionString) : false

function buildClient(tableName: string): TableClient {
  return TableClient.fromConnectionString(connectionString!, tableName)
}

const describeWhenConfigured = safe ? describe : describe.skip

describeWhenConfigured('AzureTableLinkRepository against Azurite', () => {
  const tableName = `t${process.pid}${Date.now()}`.replace(/[^a-z0-9]/gi, '')

  beforeAll(async () => {
    const client = buildClient(tableName)
    await client.createTable()
  })

  afterAll(async () => {
    const client = buildClient(tableName)
    await client.deleteTable()
  })

  function makeRepository(): AzureTableLinkRepository {
    return new AzureTableLinkRepository(new AzureLinkTableClient(buildClient(tableName)))
  }

  it('creates the url and code index entities', async () => {
    const repository = makeRepository()

    const result = await repository.saveIfAbsent({
      code: 'AAAAAAAAA',
      originalUrl: 'https://azurite.com/primeiro',
    })

    expect(result.status).toBe('created')

    const byCode = await repository.findByCode('AAAAAAAAA')
    const byUrl = await repository.findByOriginalUrl('https://azurite.com/primeiro')

    expect(byCode?.code).toBe('AAAAAAAAA')
    expect(byUrl?.code).toBe('AAAAAAAAA')
  })

  it('returns url_exists for the same normalized URL', async () => {
    const repository = makeRepository()
    await repository.saveIfAbsent({
      code: 'BBBBBBBBB',
      originalUrl: 'https://azurite.com/reuso',
    })

    const result = await repository.saveIfAbsent({
      code: 'CCCCCCCCC',
      originalUrl: 'https://azurite.com/reuso',
    })

    expect(result.status).toBe('url_exists')
  })

  it('returns one created and one url_exists for concurrent inserts', async () => {
    const repositoryA = makeRepository()
    const repositoryB = makeRepository()

    const [a, b] = await Promise.all([
      repositoryA.saveIfAbsent({
        code: 'DDDDDDDDD',
        originalUrl: 'https://azurite.com/concorrente',
      }),
      repositoryB.saveIfAbsent({
        code: 'EEEEEEEEE',
        originalUrl: 'https://azurite.com/concorrente',
      }),
    ])

    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual(['created', 'url_exists'])
  })

  it('returns code_collision when only the code is occupied', async () => {
    const repository = makeRepository()
    await repository.saveIfAbsent({
      code: 'FFFFFFFFF',
      originalUrl: 'https://azurite.com/ocupado',
    })

    const result = await repository.saveIfAbsent({
      code: 'FFFFFFFFF',
      originalUrl: 'https://azurite.com/outro',
    })

    expect(result.status).toBe('code_collision')
  })

  it('resolves an existing code after reconstructing the repository', async () => {
    const first = makeRepository()
    await first.saveIfAbsent({
      code: 'GGGGGGGGG',
      originalUrl: 'https://azurite.com/persistencia',
    })

    const second = makeRepository()
    const link = await second.findByCode('GGGGGGGGG')

    expect(link).not.toBeNull()
    expect(link?.originalUrl).toBe('https://azurite.com/persistencia')
  })

  it('throws LinkStorageUnavailableError when Azurite is unreachable', async () => {
    const deadClient = TableClient.fromConnectionString(
      'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;TableEndpoint=http://127.0.0.1:9/devstoreaccount1;',
      tableName,
    )
    const repository = new AzureTableLinkRepository(
      new AzureLinkTableClient(deadClient),
    )

    await expect(
      repository.saveIfAbsent({
        code: 'HHHHHHHHH',
        originalUrl: 'https://azurite.com/morto',
      }),
    ).rejects.toThrow(LinkStorageUnavailableError)
  })
})
