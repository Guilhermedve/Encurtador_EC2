import { TableClient } from '@azure/data-tables'
import {
  LinkStorageUnavailableError,
  type LinkStorageOperation,
} from '../errors/link-storage.error'

export interface LinkTableEntity {
  partitionKey: 'links'
  rowKey: string
  kind: 'code' | 'url_index'
  code: string
  originalUrl: string
}

export interface LinkTableClient {
  getEntity(
    partitionKey: string,
    rowKey: string,
    operation: LinkStorageOperation,
  ): Promise<LinkTableEntity | null>
  createAtomically(
    entities: readonly LinkTableEntity[],
    operation: LinkStorageOperation,
  ): Promise<void>
}

export class LinkTableConflictError extends Error {
  constructor() {
    super('Transaction conflict while writing link entities')
    this.name = 'LinkTableConflictError'
  }
}

function restErrorDetails(error: unknown): {
  statusCode?: number
  requestId?: string
} {
  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>

    const statusCode =
      typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : undefined

    let requestId: string | undefined
    if (typeof candidate.requestId === 'string') {
      requestId = candidate.requestId
    } else if (candidate.details && typeof candidate.details === 'object') {
      const details = candidate.details as Record<string, unknown>
      if (typeof details['x-ms-request-id'] === 'string') {
        requestId = details['x-ms-request-id']
      }
    }

    return { statusCode, requestId }
  }

  return {}
}

export class AzureLinkTableClient implements LinkTableClient {
  constructor(private readonly client: TableClient) {}

  async getEntity(
    partitionKey: string,
    rowKey: string,
    operation: LinkStorageOperation,
  ): Promise<LinkTableEntity | null> {
    try {
      const entity = (await this.client.getEntity(
        partitionKey,
        rowKey,
      )) as LinkTableEntity
      return entity
    } catch (error) {
      if (restErrorDetails(error).statusCode === 404) {
        return null
      }
      throw this.toStorageError(error, operation)
    }
  }

  async createAtomically(
    entities: readonly LinkTableEntity[],
    operation: LinkStorageOperation,
  ): Promise<void> {
    const actions = entities.map(
      (entity) => ['create', entity] as const,
    )

    try {
      await this.client.submitTransaction(actions as never)
    } catch (error) {
      if (restErrorDetails(error).statusCode === 409) {
        throw new LinkTableConflictError()
      }
      throw this.toStorageError(error, operation)
    }
  }

  private toStorageError(
    error: unknown,
    operation: LinkStorageOperation,
  ): never {
    const { statusCode, requestId } = restErrorDetails(error)
    throw new LinkStorageUnavailableError({ operation, statusCode, requestId })
  }
}
