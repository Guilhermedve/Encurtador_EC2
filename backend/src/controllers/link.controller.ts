import type { LinkService } from '../services/link.service'

export function createLinkController(linkService: LinkService) {
  return {
    create: (originalUrl: string) => linkService.create(originalUrl),
    findOriginalUrl: (code: string) => linkService.findOriginalUrl(code),
  }
}

export type LinkController = ReturnType<typeof createLinkController>
