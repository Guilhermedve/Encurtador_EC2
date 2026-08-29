import { useState } from 'react'
import type { FormEvent } from 'react'
import { createShortLink } from '../services/api'
import { ResultDisplay } from './ResultDisplay'

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

type UrlShortenerCardProps = {
  cutting: boolean
  onShortenSuccess: () => void
}

export function canSubmitShorten(loading: boolean, cutting: boolean): boolean {
  return !loading && !cutting
}

export async function submitShortenRequest(
  url: string,
  createLink: typeof createShortLink,
  onSuccess: (result: Awaited<ReturnType<typeof createShortLink>>) => void,
) {
  const result = await createLink(url)
  onSuccess(result)
  return result
}

export function UrlShortenerCard({
  cutting,
  onShortenSuccess,
}: UrlShortenerCardProps) {
  const [url, setUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmitShorten(loading, cutting)) return

    setError('')
    setShortUrl('')

    if (!isHttpsUrl(url)) {
      setError('Informe uma URL HTTPS válida (começando com https://).')
      return
    }

    setLoading(true)
    try {
      await submitShortenRequest(
        url,
        createShortLink,
        (result) => {
          setShortUrl(result.shortUrl)
          onShortenSuccess()
        },
      )
    } catch {
      setError('Não foi possível encurtar o link.')
    } finally {
      setLoading(false)
    }
  }

  const hasError = Boolean(error)

  return (
    <div
      className="w-full rounded-lg border bg-[rgba(13,13,13,0.85)] p-6 sm:p-8 backdrop-blur-[12px]"
      style={{
        borderColor: hasError ? '#FF3333' : 'rgba(255,255,255,0.12)',
      }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <label
          htmlFor="url"
          className="mb-3 block text-xs font-bold uppercase tracking-[0.12em] text-white/60"
        >
          URL para encurtar
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com/sua-pagina"
              pattern="https://.*"
              required
              aria-invalid={hasError}
              aria-describedby={hasError ? 'url-error' : undefined}
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              className={[
                'w-full bg-transparent pb-3 pt-1 text-base font-medium text-white placeholder:text-[#666] outline-none transition-colors sm:text-[15px]',
                'border-0 border-b',
                hasError ? 'border-b-[#FF3333]' : 'border-b-white/20 focus:border-b-white',
                loading ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || cutting}
            aria-busy={loading || cutting}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-white bg-white px-6 text-sm font-bold uppercase tracking-[0.08em] text-black transition-colors duration-200 hover:bg-black hover:text-white hover:border-white disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5" aria-label="Carregando">
                <span className="h-1.5 w-1.5 rounded-full bg-current" style={{ animation: 'dot-bounce 1s infinite 0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-current" style={{ animation: 'dot-bounce 1s infinite 150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-current" style={{ animation: 'dot-bounce 1s infinite 300ms' }} />
              </span>
            ) : cutting ? (
              'Cortando...'
            ) : (
              <>Encurtar <span aria-hidden>→</span></>
            )}
          </button>
        </div>

        {hasError && (
          <p id="url-error" role="alert" className="mt-3 text-sm font-medium text-[#FF3333]">
            {error}
          </p>
        )}
      </form>

      <div
        className={[
          'grid transition-all duration-300 ease-out',
          shortUrl ? 'mt-6 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        ].join(' ')}
        aria-live="polite"
      >
        <div className="overflow-hidden">
          {shortUrl && <ResultDisplay shortUrl={shortUrl} />}
        </div>
      </div>
    </div>
  )
}
