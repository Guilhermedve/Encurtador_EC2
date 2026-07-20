import { env } from '../config/env'
import { generateCode } from '../utils/generate-code'
import { normalizeHttpsUrl } from '../utils/normalize-url'
import { InMemoryLinkRepository } from '../repositories/in-memory-link.repository'
import type { LinkRepository } from '../repositories/link.repository'

export class CodeGenerationExhaustedError extends Error {
  constructor(message = 'Não foi possível gerar um código único') {
    super(message)
    this.name = 'CodeGenerationExhaustedError'
  }
}

export interface CreateLinkResult {
  code: string
  originalUrl: string
  shortUrl: string
  reused: boolean
}

const MAX_ATTEMPTS = 10
const CODE_SIZE = 9

export class LinkService {
  constructor(
    private readonly repository: LinkRepository,
    private readonly generate: (size?: number) => string = generateCode,
  ) {}

  async create(rawUrl: string): Promise<CreateLinkResult> {
    const originalUrl = normalizeHttpsUrl(rawUrl)

    const existing = await this.repository.findByOriginalUrl(originalUrl)
    if (existing) {
      return {
        code: existing.code,
        originalUrl: existing.originalUrl,
        shortUrl: this.buildShortUrl(existing.code),
        reused: true,
      }
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const code = this.generate(CODE_SIZE)

      const collision = await this.repository.findByCode(code)
      if (collision) {
        continue
      }

      const saved = await this.repository.save({ code, originalUrl })
      return {
        code: saved.code,
        originalUrl: saved.originalUrl,
        shortUrl: this.buildShortUrl(saved.code),
        reused: false,
      }
    }

    throw new CodeGenerationExhaustedError()
  }

  async findOriginalUrl(code: string): Promise<string | undefined> {
    const link = await this.repository.findByCode(code)
    return link?.originalUrl
  }

  private buildShortUrl(code: string): string {
    return `${env.publicBaseUrl}/${code}`
  }
}

export const linkService = new LinkService(new InMemoryLinkRepository())
