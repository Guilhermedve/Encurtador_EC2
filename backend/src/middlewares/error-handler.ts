import { Elysia } from 'elysia'
import {
  LinkStorageIntegrityError,
  LinkStorageUnavailableError,
} from '../errors/link-storage.error'

export const errorHandler = new Elysia().onError(
  { as: 'global' },
  ({ code, error, set }) => {
    const name = error instanceof Error ? error.name : ''

    if (
      error instanceof LinkStorageUnavailableError ||
      error instanceof LinkStorageIntegrityError
    ) {
      console.error({
        error: error.name,
        operation:
          error instanceof LinkStorageIntegrityError
            ? error.operation
            : error.metadata.operation,
        statusCode:
          error instanceof LinkStorageUnavailableError
            ? error.metadata.statusCode
            : undefined,
        requestId:
          error instanceof LinkStorageUnavailableError
            ? error.metadata.requestId
            : undefined,
      })
      set.status = 503
      return { error: 'Serviço temporariamente indisponível' }
    }

    if (name === 'InvalidHttpsUrlError') {
      set.status = 422
      return { error: 'Dados inválidos' }
    }

    if (name === 'CodeGenerationExhaustedError') {
      set.status = 503
      return { error: 'Não foi possível gerar um código único' }
    }

    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Dados inválidos' }
    }

    console.error(error)
    set.status = 500
    return { error: 'Erro interno do servidor' }
  },
)
