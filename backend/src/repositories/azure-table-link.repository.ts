import {
  LinkStorageIntegrityError,
  LinkStorageUnavailableError,
  type LinkStorageOperation,
} from '../errors/link-storage.error'
import {
  LinkTableConflictError,
  type LinkTableClient,
  type LinkTableEntity,
} from '../storage/link-table.client'
import type { LinkRepository, SaveLinkResult, StoredLink } from './link.repository'

const PARTITION_KEY = 'links' as const

export async function urlRowKey(originalUrl: string): Promise<string> {
  const bytes = new TextEncoder().encode(originalUrl)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return `url:${hex}`
}

function codeRowKey(code: string): string {
  return `code:${code}`
}

export class AzureTableLinkRepository implements LinkRepository {
  constructor(private readonly client: LinkTableClient) {}

  async findByOriginalUrl(originalUrl: string): Promise<StoredLink | null> {
    const entity = await this.client.getEntity(
      PARTITION_KEY,
      await urlRowKey(originalUrl),
      'find_by_url',
    )
    if (!entity) return null
    return { code: entity.code, originalUrl: entity.originalUrl }
  }

  async findByCode(code: string): Promise<StoredLink | null> {
    const entity = await this.client.getEntity(
      PARTITION_KEY,
      codeRowKey(code),
      'find_by_code',
    )
    if (!entity) return null
    return { code: entity.code, originalUrl: entity.originalUrl }
  }

  async saveIfAbsent(link: StoredLink): Promise<SaveLinkResult> {
    const urlKey = await urlRowKey(link.originalUrl)
    const codeKey = codeRowKey(link.code)

    const existing = await this.client.getEntity(
      PARTITION_KEY,
      urlKey,
      'find_by_url',
    )
    if (existing) {
      if (existing.originalUrl === link.originalUrl) {
        return {
          status: 'url_exists',
          link: {
            code: existing.code,
            originalUrl: existing.originalUrl,
          },
        }
      }
      throw new LinkStorageIntegrityError('find_by_url')
    }

    const urlIndex: LinkTableEntity = {
      partitionKey: PARTITION_KEY,
      rowKey: urlKey,
      kind: 'url_index',
      code: link.code,
      originalUrl: link.originalUrl,
    }
    const codeIndex: LinkTableEntity = {
      partitionKey: PARTITION_KEY,
      rowKey: codeKey,
      kind: 'code',
      code: link.code,
      originalUrl: link.originalUrl,
    }

    try {
      await this.client.createAtomically(
        [urlIndex, codeIndex],
        'create_link',
      )
      return { status: 'created', link }
    } catch (error) {
      if (error instanceof LinkTableConflictError) {
        return this.resolveConflict(urlKey, codeKey, link)
      }
      throw error
    }
  }

  private async resolveConflict(
    urlKey: string,
    codeKey: string,
    link: StoredLink,
  ): Promise<SaveLinkResult> {
    const urlEntity = await this.client.getEntity(
      PARTITION_KEY,
      urlKey,
      'find_by_url',
    )
    if (urlEntity) {
      if (urlEntity.originalUrl === link.originalUrl) {
        return {
          status: 'url_exists',
          link: { code: urlEntity.code, originalUrl: urlEntity.originalUrl },
        }
      }
      throw new LinkStorageIntegrityError('find_by_url')
    }

    const codeEntity = await this.client.getEntity(
      PARTITION_KEY,
      codeKey,
      'find_by_code',
    )
    if (codeEntity) {
      return { status: 'code_collision' }
    }

    throw new LinkStorageUnavailableError({ operation: 'create_link' })
  }
}
