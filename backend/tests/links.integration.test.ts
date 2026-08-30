import { describe, expect, it, spyOn } from 'bun:test'
import { createApp } from '../src/app'
import { InMemoryLinkRepository } from '../src/repositories/in-memory-link.repository'
import type { LinkRepository, SaveLinkResult } from '../src/repositories/link.repository'
import {
  LinkStorageIntegrityError,
  LinkStorageUnavailableError,
} from '../src/errors/link-storage.error'

function makeApp(repository: LinkRepository = new InMemoryLinkRepository()) {
  return createApp({ linkRepository: repository })
}

function postLink(app: ReturnType<typeof createApp>, url: string) {
  return app.handle(
    new Request('http://localhost/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),
  )
}

class UnavailableRepository implements LinkRepository {
  async findByOriginalUrl() {
    return null
  }
  async findByCode() {
    return null
  }
  async saveIfAbsent(): Promise<SaveLinkResult> {
    throw new LinkStorageUnavailableError({ operation: 'create_link' })
  }
}

class IntegrityRepository implements LinkRepository {
  async findByOriginalUrl() {
    return null
  }
  async findByCode() {
    return null
  }
  async saveIfAbsent(): Promise<SaveLinkResult> {
    throw new LinkStorageIntegrityError('create_link')
  }
}

class UnavailableReadRepository implements LinkRepository {
  async findByOriginalUrl() {
    return null
  }
  async findByCode() {
    throw new LinkStorageUnavailableError({ operation: 'find_by_code' })
  }
  async saveIfAbsent(): Promise<SaveLinkResult> {
    return {
      status: 'created',
      link: { code: 'AAAAAAAAA', originalUrl: 'https://exemplo.com' },
    }
  }
}

describe('POST /api/links', () => {
  it('cria um link novo e retorna 201', async () => {
    const app = makeApp()
    const response = await postLink(app, 'https://exemplo.com/nova')
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.code).toMatch(/^[0-9a-zA-Z]{8}$/)
    expect(body.originalUrl).toBe('https://exemplo.com/nova')
    expect(body.shortUrl).toBe(`http://localhost:3000/${body.code}`)
  })

  it('preserva um código legado de nove caracteres ao reutilizar a URL', async () => {
    const repository = new InMemoryLinkRepository()
    await repository.saveIfAbsent({
      code: 'LEGACY999',
      originalUrl: 'https://exemplo.com/legado',
    })
    const app = makeApp(repository)

    const response = await postLink(app, 'https://exemplo.com/legado')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.code).toBe('LEGACY999')
    expect(body.shortUrl).toBe('http://localhost:3000/LEGACY999')
  })

  it('reutiliza a URL equivalente retornando 200 e o mesmo código', async () => {
    const app = makeApp()
    const first = await (await postLink(app, 'https://exemplo.com/reuso')).json()
    const response = await postLink(app, '  https://exemplo.com/reuso  ')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.code).toBe(first.code)
  })

  it('retorna 422 para entrada não HTTPS', async () => {
    const app = makeApp()
    const response = await postLink(app, 'http://exemplo.com')
    expect(response.status).toBe(422)
  })

  it('retorna 422 para texto que não é URL', async () => {
    const app = makeApp()
    const response = await postLink(app, 'apenas texto')
    expect(response.status).toBe(422)
  })

  it('retorna 503 quando o armazenamento está indisponível', async () => {
    const consoleError = spyOn(console, 'error').mockImplementation(() => {})
    const app = makeApp(new UnavailableRepository())

    const response = await postLink(app, 'https://exemplo.com/indisponivel')
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'Serviço temporariamente indisponível' })
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      'https://exemplo.com/indisponivel',
    )
    consoleError.mockRestore()
  })

  it('retorna 503 em falha de integridade do armazenamento', async () => {
    const consoleError = spyOn(console, 'error').mockImplementation(() => {})
    const app = makeApp(new IntegrityRepository())

    const response = await postLink(app, 'https://exemplo.com/integridade')
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'Serviço temporariamente indisponível' })
    consoleError.mockRestore()
  })
})

describe('GET /:code', () => {
  it('redireciona com 302 e cabeçalho Location para um código existente', async () => {
    const app = makeApp()
    const created = await (await postLink(app, 'https://exemplo.com/redir')).json()

    const response = await app.handle(
      new Request(`http://localhost/${created.code}`, {
        redirect: 'manual',
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://exemplo.com/redir')
  })

  it('retorna 404 para código desconhecido', async () => {
    const app = makeApp()
    const response = await app.handle(
      new Request('http://localhost/inexistente'),
    )
    expect(response.status).toBe(404)
  })

  it('retorna 503 quando a leitura do armazenamento falha', async () => {
    const consoleError = spyOn(console, 'error').mockImplementation(() => {})
    const app = makeApp(new UnavailableReadRepository())

    const response = await app.handle(
      new Request('http://localhost/qualquer', { redirect: 'manual' }),
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'Serviço temporariamente indisponível' })
    consoleError.mockRestore()
  })
})
