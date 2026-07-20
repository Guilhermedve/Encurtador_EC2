import { useState } from 'react'
import type { FormEvent } from 'react'
import { createShortLink } from '../services/api'

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

export function ShortLinkForm() {
  const [url, setUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setShortUrl('')

    if (!isHttpsUrl(url)) {
      setError('Informe uma URL HTTPS válida (começando com https://).')
      return
    }

    setLoading(true)

    try {
      const result = await createShortLink(url)
      setShortUrl(result.shortUrl)
    } catch {
      setError('Não foi possível encurtar o link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="url">URL para encurtar</label>
      <input
        id="url"
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://exemplo.com/pagina"
        pattern="https://.*"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Encurtando...' : 'Encurtar'}
      </button>

      {error && <p role="alert">{error}</p>}
      {shortUrl && (
        <p>
          Link criado: <a href={shortUrl}>{shortUrl}</a>
        </p>
      )}
    </form>
  )
}
