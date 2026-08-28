export interface StoredLink {
  code: string
  originalUrl: string
}

export type SaveLinkResult =
  | { status: 'created'; link: StoredLink }
  | { status: 'url_exists'; link: StoredLink }
  | { status: 'code_collision' }

export interface LinkRepository {
  findByOriginalUrl(originalUrl: string): Promise<StoredLink | null>
  findByCode(code: string): Promise<StoredLink | null>
  saveIfAbsent(link: StoredLink): Promise<SaveLinkResult>
}
