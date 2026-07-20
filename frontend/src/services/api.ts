import type { ShortLink } from '../types/link'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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
