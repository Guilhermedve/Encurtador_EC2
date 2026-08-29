import { TableClient } from '@azure/data-tables'
import { ManagedIdentityCredential } from '@azure/identity'
import { AzureLinkTableClient } from '../storage/link-table.client'
import { AzureTableLinkRepository } from '../repositories/azure-table-link.repository'
import { InMemoryLinkRepository } from '../repositories/in-memory-link.repository'
import type { LinkRepository } from '../repositories/link.repository'
import type { BackendEnv } from '../config/env'

export function createLinkRepository(config: BackendEnv): LinkRepository {
  if (config.linkRepository === 'memory') {
    return new InMemoryLinkRepository()
  }

  if (config.azureStorageConnectionString && config.nodeEnv !== 'production') {
    const client = TableClient.fromConnectionString(
      config.azureStorageConnectionString,
      config.azureStorageTableName,
      { allowInsecureConnection: true },
    )
    return new AzureTableLinkRepository(new AzureLinkTableClient(client))
  }

  if (!config.azureStorageAccountUrl) {
    throw new Error(
      'AZURE_STORAGE_ACCOUNT_URL é obrigatório com LINK_REPOSITORY=azure-table',
    )
  }

  const client = new TableClient(
    config.azureStorageAccountUrl,
    config.azureStorageTableName,
    new ManagedIdentityCredential(),
  )
  return new AzureTableLinkRepository(new AzureLinkTableClient(client))
}
