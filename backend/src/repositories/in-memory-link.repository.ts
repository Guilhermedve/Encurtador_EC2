import type {
  LinkRepository,
  SaveLinkResult,
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

  async saveIfAbsent(link: StoredLink): Promise<SaveLinkResult> {
    const existingByUrl = this.byOriginalUrl.get(link.originalUrl)
    if (existingByUrl) {
      return { status: 'url_exists', link: existingByUrl }
    }

    const existingByCode = this.byCode.get(link.code)
    if (existingByCode) {
      return { status: 'code_collision' }
    }

    this.byOriginalUrl.set(link.originalUrl, link)
    this.byCode.set(link.code, link)
    return { status: 'created', link }
  }
}
