export interface StoredLink {
  code: string
  originalUrl: string
}

export interface LinkRepository {
  findByOriginalUrl(originalUrl: string): Promise<StoredLink | null>
  findByCode(code: string): Promise<StoredLink | null>
  save(link: StoredLink): Promise<StoredLink>
}
