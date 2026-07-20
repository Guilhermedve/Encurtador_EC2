import { Elysia } from 'elysia'

export const errorHandler = new Elysia().onError(
  ({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Dados inválidos' }
    }

    console.error(error)
    set.status = 500
    return { error: 'Erro interno do servidor' }
  },
)
