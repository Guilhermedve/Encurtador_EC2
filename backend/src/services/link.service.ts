import { env } from '../config/env'
import { generateCode } from '../utils/generate-code'

export interface ShortLink {
  code: string
  originalUrl: string
  shortUrl: string
}

class LinkService {
  private readonly links = new Map<string, string>()

  create(originalUrl: string): ShortLink {
    const code = generateCode()
    this.links.set(code, originalUrl)

    return {
      code,
      originalUrl,
      shortUrl: `${env.publicApiUrl}/${code}`,
    }
  }

  findOriginalUrl(code: string): string | undefined {
    return this.links.get(code)
  }
}

export const linkService = new LinkService()
