import type {
  LinkRepository,
  StoredLink,
} from './link.repository'

export class InMemoryLinkRepository implements LinkRepository {
  private readonly byOriginalUrl = new Map<string, StoredLink>()
  private readonly byCode = new Map<string, StoredLink>()

  async findByOriginalUrl(originalUrl: string): Promise<StoredLink | null> {
    return this.byOriginalUrl.get(originalUrl) ?? null
  }

  async findByCode(code: string): Promise<StoredLink | null> {
    return this.byCode.get(code) ?? null
  }

  async save(link: StoredLink): Promise<StoredLink> {
    this.byOriginalUrl.set(link.originalUrl, link)
    this.byCode.set(link.code, link)
    return link
  }
}
