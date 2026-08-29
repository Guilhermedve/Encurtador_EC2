import type { ShortLink } from '../types/link'

const developmentFallback = import.meta.env.DEV ? 'http://localhost:3000' : undefined

const rawApiUrl = import.meta.env.VITE_API_URL ?? developmentFallback

if (!rawApiUrl) {
  throw new Error('VITE_API_URL is required for production builds')
}

const API_URL = rawApiUrl.replace(/\/+$/, '')

export async function createShortLink(url: string): Promise<ShortLink> {
  const response = await fetch(`${API_URL}/api/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    throw new Error('Não foi possível encurtar o link')
  }

  return response.json() as Promise<ShortLink>
}
