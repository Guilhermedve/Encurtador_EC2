import { linkService } from '../services/link.service'

export const linkController = {
  create(originalUrl: string) {
    return linkService.create(originalUrl)
  },

  findOriginalUrl(code: string) {
    return linkService.findOriginalUrl(code)
  },
}
