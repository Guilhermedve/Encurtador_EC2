import { describe, expect, it } from 'bun:test'
import {
  CodeGenerationExhaustedError,
  LinkService,
} from '../src/services/link.service'
import { InvalidHttpsUrlError } from '../src/utils/normalize-url'
import { InMemoryLinkRepository } from '../src/repositories/in-memory-link.repository'
import type { LinkRepository } from '../src/repositories/link.repository'

function queuedGenerator(codes: string[]): () => string {
  let index = 0
  return () => codes[Math.min(index++, codes.length - 1)]!
}

describe('LinkService.create', () => {
  it('solicita códigos de oito caracteres para novos links', async () => {
    const requestedSizes: Array<number | undefined> = []
    const service = new LinkService(
      new InMemoryLinkRepository(),
      (size) => {
        requestedSizes.push(size)
        return 'A'.repeat(size ?? 0)
      },
    )

    const result = await service.create('https://exemplo.com/oito')

    expect(requestedSizes).toEqual([8])
    expect(result.code).toBe('AAAAAAAA')
  })

  it('cria um novo link e monta a URL curta sem barra duplicada', async () => {
    const service = new LinkService(
      new InMemoryLinkRepository(),
      queuedGenerator(['AAAAAAAA']),
    )

    const result = await service.create('https://exemplo.com/pagina')

    expect(result.reused).toBe(false)
    expect(result.code).toBe('AAAAAAAA')
    expect(result.shortUrl).toBe('http://localhost:3000/AAAAAAAA')
    expect(result.shortUrl).not.toContain('//AAAAAAAA')
  })

  it('reutiliza o vínculo quando a URL normalizada já existe', async () => {
    const service = new LinkService(
      new InMemoryLinkRepository(),
      queuedGenerator(['AAAAAAAA', 'BBBBBBBB']),
    )

    const first = await service.create('https://exemplo.com')
    const second = await service.create('  https://exemplo.com  ')

    expect(first.reused).toBe(false)
    expect(second.reused).toBe(true)
    expect(second.code).toBe(first.code)
    expect(second.shortUrl).toBe(first.shortUrl)
  })

  it('tenta novamente quando o código colide', async () => {
    const repository = new InMemoryLinkRepository()
    await repository.saveIfAbsent({
      code: 'AAAAAAAA',
      originalUrl: 'https://ocupado.com',
    })

    const service = new LinkService(
      repository,
      queuedGenerator(['AAAAAAAA', 'BBBBBBBB']),
    )

    const result = await service.create('https://novo.com')

    expect(result.code).toBe('BBBBBBBB')
  })

  it('falha depois de dez colisões', async () => {
    const repository = new InMemoryLinkRepository()
    await repository.saveIfAbsent({
      code: 'AAAAAAAA',
      originalUrl: 'https://ocupado.com',
    })

    const service = new LinkService(repository, queuedGenerator(['AAAAAAAA']))

    await expect(service.create('https://novo.com')).rejects.toThrow(
      CodeGenerationExhaustedError,
    )
  })

  it('rejeita entradas que não sejam HTTPS', async () => {
    const service = new LinkService(new InMemoryLinkRepository())

    await expect(service.create('http://exemplo.com')).rejects.toThrow(
      InvalidHttpsUrlError,
    )
  })

  it('lida com um vencedor concorrente retornando url_exists', async () => {
    const concurrentWinner: LinkRepository = {
      findByOriginalUrl: async () => null,
      findByCode: async () => null,
      saveIfAbsent: async () => ({
        status: 'url_exists',
        link: { code: 'BBBBBBBB', originalUrl: 'https://exemplo.com' },
      }),
    }

    const service = new LinkService(
      concurrentWinner,
      queuedGenerator(['AAAAAAAA']),
    )

    const result = await service.create('https://exemplo.com')

    expect(result.reused).toBe(true)
    expect(result.code).toBe('BBBBBBBB')
  })
})

describe('InMemoryLinkRepository.saveIfAbsent', () => {
  it('returns created for a fresh link', async () => {
    const repository = new InMemoryLinkRepository()

    const result = await repository.saveIfAbsent({
      code: 'AAAAAAAA',
      originalUrl: 'https://novo.com',
    })

    expect(result.status).toBe('created')
  })

  it('returns url_exists when the URL is already stored', async () => {
    const repository = new InMemoryLinkRepository()
    await repository.saveIfAbsent({
      code: 'AAAAAAAA',
      originalUrl: 'https://novo.com',
    })

    const result = await repository.saveIfAbsent({
      code: 'BBBBBBBB',
      originalUrl: 'https://novo.com',
    })

    expect(result.status).toBe('url_exists')
    if (result.status === 'url_exists') {
      expect(result.link.code).toBe('AAAAAAAA')
    }
  })

  it('returns code_collision when the code is occupied', async () => {
    const repository = new InMemoryLinkRepository()
    await repository.saveIfAbsent({
      code: 'AAAAAAAA',
      originalUrl: 'https://um.com',
    })

    const result = await repository.saveIfAbsent({
      code: 'AAAAAAAA',
      originalUrl: 'https://outro.com',
    })

    expect(result.status).toBe('code_collision')
  })
})
