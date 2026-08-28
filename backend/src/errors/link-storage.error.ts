export type LinkStorageOperation =
  | 'find_by_code'
  | 'find_by_url'
  | 'create_link'

export interface LinkStorageErrorMetadata {
  operation: LinkStorageOperation
  statusCode?: number
  requestId?: string
}

export class LinkStorageUnavailableError extends Error {
  constructor(readonly metadata: LinkStorageErrorMetadata) {
    super('Link storage is unavailable')
    this.name = 'LinkStorageUnavailableError'
  }
}

export class LinkStorageIntegrityError extends Error {
  constructor(readonly operation: LinkStorageErrorMetadata['operation']) {
    super('Link storage integrity check failed')
    this.name = 'LinkStorageIntegrityError'
  }
}
