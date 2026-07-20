import { Elysia } from 'elysia'

export const errorHandler = new Elysia().onError(
  { as: 'global' },
  ({ code, error, set }) => {
    const name = error instanceof Error ? error.name : ''

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
