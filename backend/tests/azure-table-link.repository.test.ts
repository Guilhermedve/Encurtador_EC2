import { describe, expect, it } from 'bun:test'
import {
  LinkStorageIntegrityError,
  LinkStorageUnavailableError,
} from '../src/errors/link-storage.error'
import {
  LinkTableConflictError,
  type LinkTableClient,
  type LinkTableEntity,
} from '../src/storage/link-table.client'
import {
  AzureTableLinkRepository,
  urlRowKey,
} from '../src/repositories/azure-table-link.repository'

class FakeLinkTableClient implements LinkTableClient {
  public transactions: LinkTableEntity[][] = []
  public getCalls: { partitionKey: string; rowKey: string }[] = []

  constructor(
    private readonly behavior: {
      getEntity?: (partitionKey: string, rowKey: string) => LinkTableEntity | null
      createAtomically?: (entities: readonly LinkTableEntity[]) => void
    } = {},
  ) {}

  async getEntity(
    partitionKey: string,
    rowKey: string,
  ): Promise<LinkTableEntity | null> {
    this.getCalls.push({ partitionKey, rowKey })
    return this.behavior.getEntity?.(partitionKey, rowKey) ?? null
  }

  async createAtomically(
    entities: readonly LinkTableEntity[],
  ): Promise<void> {
    this.transactions.push([...entities])
    this.behavior.createAtomically?.(entities)
  }
}

function urlIndexEntity(originalUrl: string, code: string): LinkTableEntity {
  return {
    partitionKey: 'links',
    rowKey: `url:${originalUrl}`,
    kind: 'url_index',
    code,
    originalUrl,
  }
}

describe('urlRowKey', () => {
  it('produces a 64-character lowercase hex key', async () => {
    const key = await urlRowKey('https://exemplo.com')
    expect(key).toMatch(/^url:[0-9a-f]{64}$/)
  })

  it('is deterministic for the same input', async () => {
    expect(await urlRowKey('https://x.com')).toBe(await urlRowKey('https://x.com'))
  })
})

describe('AzureTableLinkRepository.saveIfAbsent', () => {
  it('creates two entities in a single transaction', async () => {
    const fake = new FakeLinkTableClient()
    const repository = new AzureTableLinkRepository(fake)

    const result = await repository.saveIfAbsent({
      code: 'AAAAAAAAA',
      originalUrl: 'https://exemplo.com',
    })

    expect(result.status).toBe('created')
    expect(fake.transactions).toHaveLength(1)
    const [entities] = fake.transactions
    expect(entities).toHaveLength(2)
    for (const entity of entities) {
      expect(entity.partitionKey).toBe('links')
    }
    const urlEntity = entities.find((e) => e.kind === 'url_index')
    const codeEntity = entities.find((e) => e.kind === 'code')
    expect(urlEntity?.code).toBe('AAAAAAAAA')
    expect(urlEntity?.originalUrl).toBe('https://exemplo.com')
    expect(codeEntity?.rowKey).toBe('code:AAAAAAAAA')
    expect(codeEntity?.code).toBe('AAAAAAAAA')
  })

  it('returns url_exists without a transaction when the URL already exists', async () => {
    const fake = new FakeLinkTableClient({
      getEntity: (partitionKey, rowKey) =>
        rowKey.startsWith('url:')
          ? urlIndexEntity('https://exemplo.com', 'AAAAAAAAA')
          : null,
    })
    const repository = new AzureTableLinkRepository(fake)

    const result = await repository.saveIfAbsent({
      code: 'BBBBBBBBB',
      originalUrl: 'https://exemplo.com',
    })

    expect(result).toEqual({
      status: 'url_exists',
      link: {
        code: 'AAAAAAAAA',
        originalUrl: 'https://exemplo.com',
      },
    })
    expect(fake.transactions).toHaveLength(0)
  })

  it('returns url_exists after a transaction conflict with a matching URL', async () => {
    const fake = new FakeLinkTableClient({
      getEntity: (partitionKey, rowKey) =>
        rowKey.startsWith('url:')
          ? urlIndexEntity('https://exemplo.com', 'AAAAAAAAA')
          : null,
      createAtomically: () => {
        throw new LinkTableConflictError()
      },
    })
    const repository = new AzureTableLinkRepository(fake)

    const result = await repository.saveIfAbsent({
      code: 'AAAAAAAAA',
      originalUrl: 'https://exemplo.com',
    })

    expect(result.status).toBe('url_exists')
  })

  it('returns code_collision when only the code is occupied', async () => {
    const fake = new FakeLinkTableClient({
      getEntity: (partitionKey, rowKey) =>
        rowKey.startsWith('code:')
          ? {
              partitionKey: 'links',
              rowKey,
              kind: 'code',
              code: 'AAAAAAAAA',
              originalUrl: 'https://outro.com',
            }
          : null,
      createAtomically: () => {
        throw new LinkTableConflictError()
      },
    })
    const repository = new AzureTableLinkRepository(fake)

    const result = await repository.saveIfAbsent({
      code: 'AAAAAAAAA',
      originalUrl: 'https://novo.com',
    })

    expect(result.status).toBe('code_collision')
  })

  it('throws LinkStorageIntegrityError when the hash row holds another URL', async () => {
    const fake = new FakeLinkTableClient({
      getEntity: (partitionKey, rowKey) =>
        rowKey.startsWith('url:')
          ? urlIndexEntity('https://diferente.com', 'AAAAAAAAA')
          : null,
      createAtomically: () => {
        throw new LinkTableConflictError()
      },
    })
    const repository = new AzureTableLinkRepository(fake)

    await expect(
      repository.saveIfAbsent({
        code: 'AAAAAAAAA',
        originalUrl: 'https://novo.com',
      }),
    ).rejects.toThrow(LinkStorageIntegrityError)
  })

  it('propagates LinkStorageUnavailableError from the client', async () => {
    const fake = new FakeLinkTableClient({
      createAtomically: () => {
        throw new LinkStorageUnavailableError({ operation: 'create_link' })
      },
    })
    const repository = new AzureTableLinkRepository(fake)

    await expect(
      repository.saveIfAbsent({
        code: 'AAAAAAAAA',
        originalUrl: 'https://novo.com',
      }),
    ).rejects.toThrow(LinkStorageUnavailableError)
  })
})

describe('AzureTableLinkRepository reads', () => {
  it('maps a code row to a stored link', async () => {
    const fake = new FakeLinkTableClient({
      getEntity: (partitionKey, rowKey) =>
        rowKey.startsWith('code:')
          ? {
              partitionKey: 'links',
              rowKey,
              kind: 'code',
              code: 'AAAAAAAAA',
              originalUrl: 'https://exemplo.com',
            }
          : null,
    })
    const repository = new AzureTableLinkRepository(fake)

    const link = await repository.findByCode('AAAAAAAAA')

    expect(link).toEqual({
      code: 'AAAAAAAAA',
      originalUrl: 'https://exemplo.com',
    })
  })

  it('returns null when nothing is found', async () => {
    const repository = new AzureTableLinkRepository(new FakeLinkTableClient())

    expect(await repository.findByCode('ZZZZZZZZZ')).toBeNull()
    expect(await repository.findByOriginalUrl('https://ausente.com')).toBeNull()
  })
})
